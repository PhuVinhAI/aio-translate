/**
 * LLMClient — wrapper around the official `openai` (openai-node) SDK that
 * faithfully ports the key rotation + retry behaviors of `aio-llm` v1.0.6.
 *
 * Behavior ported from aio-llm:
 *  - KeyManager:
 *      * Filter active keys (isActive && key) then sort by priority DESC, then
 *        by requestsToday ASC (mirror aio's key selection algorithm).
 *      * shouldRotateKey matches any of: 'rate', 'limit', '429', '403',
 *        'quota', 'exceeded', 'leaked', 'PERMISSION_DENIED', 'invalid_api_key',
 *        'unauthorized'.
 *      * markError increments errorCount; if `autoDisable` is true
 *        (= !disableAutoKeyDisable) AND errorCount >= 3, the key becomes
 *        inactive. The project sets `disableAutoKeyDisable: true`, so keys
 *        are never auto-disabled — matching the original wiring.
 *  - withRetry (aio's retry util):
 *      * Exponential backoff: `delay = delayMs * backoffMultiplier^(attempt - 1)`.
 *      * Defaults: delayMs=1000, backoffMultiplier=2, maxAttempts=3.
 *      * Retryable patterns: 'rate', 'limit', '429', '503', 'timeout',
 *        'ECONNRESET', 'ETIMEDOUT'.
 *  - NvidiaProvider request body/response:
 *      * Calls `client.chat.completions.create({model, messages, temperature,
 *        max_tokens, top_p})` against the configured baseURL.
 *      * System prompt is prepended as `{role: 'system', content: systemPrompt}`.
 *      * Response content is read as `choice.message.content ||
 *        choice.message.reasoning || ''` because some models (e.g.
 *        moonshotai/kimi-k2.5) return `reasoning` instead of `content`.
 *
 * No new features are introduced — this is a 1:1 port. Validation retries
 * declared in translate-core.ts remain untouched.
 */
import OpenAI from 'openai';

interface ApiKeyState {
  key: string;
  isActive: boolean;
  errorCount: number;
  requestsToday: number;
  priority: number;
}

export interface ApiKeyEntry {
  key: string;
}

export interface LLMClientOptions {
  apiKeys: ApiKeyEntry[];
  baseUrl: string;
  maxRetries: number;
  retryDelay: number;
  disableAutoKeyDisable: boolean;
  backoffMultiplier?: number;
}

export interface ChatCompletionRequest {
  model: string;
  systemPrompt: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature: number;
  top_p: number;
  max_tokens: number;
}

export interface ChatCompletionResponse {
  choices: Array<{
    message: { content: string };
  }>;
}

// aio KeyManager.shouldRotateKey patterns
const ROTATE_PATTERNS = [
  'rate',
  'limit',
  '429',
  '403',
  'quota',
  'exceeded',
  'leaked',
  'PERMISSION_DENIED',
  'invalid_api_key',
  'unauthorized',
];

// aio withRetry retryable patterns
const RETRYABLE_PATTERNS = [
  'rate',
  'limit',
  '429',
  '503',
  'timeout',
  'ECONNRESET',
  'ETIMEDOUT',
];

// aio NvidiaProvider.content fallback chain (some models return 'reasoning')
const CONTENT_FALLBACK_KEYS = ['content', 'reasoning'] as const;

function matchesAny(text: string, patterns: string[]): boolean {
  return patterns.some(p => text.includes(p));
}

export class LLMClient {
  private keys: ApiKeyState[];
  private maxRetries: number;
  private retryDelay: number;
  private disableAutoKeyDisable: boolean;
  private backoffMultiplier: number;
  private baseUrl: string;

  constructor(opts: LLMClientOptions) {
    this.keys = (opts.apiKeys ?? []).map((k, i) => ({
      key: k.key,
      isActive: Boolean(k.key),
      errorCount: 0,
      requestsToday: 0,
      // Preserve insertion order as priority: key 0 must win over key 1.
      // With comparator `b.priority - a.priority` (DESC), the highest
      // priority wins. Assigning `-i` makes the FIRST-inserted key own the
      // largest priority (0 > -1 > -2 ...).
      priority: -i,
    }));
    this.maxRetries = opts.maxRetries;
    this.retryDelay = opts.retryDelay;
    this.disableAutoKeyDisable = opts.disableAutoKeyDisable;
    this.backoffMultiplier = opts.backoffMultiplier ?? 2;
    this.baseUrl = opts.baseUrl;
  }

  /** Mirror aio KeyManager.getActiveKey */
  private pickActiveKey(): ApiKeyState | null {
    const active = this.keys.filter(k => k.isActive && k.key);
    if (active.length === 0) return null;
    active.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.requestsToday - b.requestsToday;
    });
    return active[0];
  }

  /** Mirror aio KeyManager.markError */
  private markError(key: ApiKeyState): void {
    key.errorCount += 1;
    // autoDisable is the INVERSE of disableAutoKeyDisable (aio internal name)
    if (!this.disableAutoKeyDisable && key.errorCount >= 3) {
      key.isActive = false;
    }
  }

  async chatCompletion(
    req: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      const keyEntry = this.pickActiveKey();
      if (!keyEntry) {
        throw new Error('LLMClient: No active API keys available');
      }
      keyEntry.requestsToday += 1;

      try {
        const client = new OpenAI({
          apiKey: keyEntry.key,
          baseURL: this.baseUrl,
        });

        const messages = req.systemPrompt
          ? [
              { role: 'system' as const, content: req.systemPrompt },
              ...req.messages,
            ]
          : req.messages;

        const completion = await client.chat.completions.create({
          model: req.model,
          messages,
          temperature: req.temperature,
          max_tokens: req.max_tokens,
          top_p: req.top_p,
        });

        const choice = completion.choices?.[0];
        let content = '';
        if (choice && choice.message) {
          for (const k of CONTENT_FALLBACK_KEYS) {
            const v = (choice.message as unknown as Record<string, unknown>)[k];
            if (typeof v === 'string' && v.length > 0) {
              content = v;
              break;
            }
          }
        }

        return { choices: [{ message: { content } }] };
      } catch (err) {
        const error = err as Error;
        lastError = error;
        const msg = String(error.message ?? error);

        // Mirror aio: bump error counter when error indicates quota/auth.
        if (matchesAny(msg, ROTATE_PATTERNS)) {
          this.markError(keyEntry);
        }

        if (!matchesAny(msg, RETRYABLE_PATTERNS)) {
          throw error;
        }
        if (attempt >= this.maxRetries) {
          throw error;
        }

        // Exponential backoff matches aio's withRetry:
        //   delay = delayMs * Math.pow(backoffMultiplier, attempt - 1)
        const waitTime =
          this.retryDelay * Math.pow(this.backoffMultiplier, attempt - 1);

        console.error(
          `LLMClient attempt ${attempt}/${this.maxRetries} failed: ${error.message}`
        );
        console.log(`Retry in ${(waitTime / 1000).toFixed(1)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    throw lastError ?? new Error('LLMClient: retries exhausted');
  }
}

export default LLMClient;
