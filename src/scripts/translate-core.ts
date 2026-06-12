import { AIO } from 'aio-llm';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { parseXMLEntries, escapeXml, XMLEntry } from '../utils/xml-parser';
import { createHashKey } from '../utils/hash';
import { TranslationConfig } from '../types';

export interface Progress {
  completedBatches: number[];
  total: number;
}

export interface TranslateResult {
  batchIndex: number;
  success: boolean;
  alreadyCompleted?: boolean;
  entries?: XMLEntry[];
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface TranslationContext {
  config: TranslationConfig;
  progressFile: string;
  inputFile: string;
  outputFile: string;
  tempDir: string;
  modeName: string;
}

function buildTranslationPrompt(entryCount: number, xmlInput: string): string {
  return `Dịch ${entryCount} thẻ XML tiếng Anh sang tiếng Việt.

${xmlInput}

Quy tắc bắt buộc:
- Chỉ dịch text bên trong thẻ <Text>.
- Giữ nguyên Key, số lượng thẻ và thứ tự thẻ.
- Giữ nguyên placeholder, mã định dạng, escape sequence và tag trong text.
- Comment XML ngay trước thẻ <Text> chỉ là ngữ cảnh, không trả comment trong kết quả.
- Trả về đúng ${entryCount} thẻ <Text> với cấu trúc XML nguyên vẹn.`;
}

export function loadProgress(progressFile: string): Progress {
  if (fs.existsSync(progressFile)) {
    const data = JSON.parse(fs.readFileSync(progressFile, 'utf-8')) as Progress;
    if (data.completedBatches && Array.isArray(data.completedBatches)) {
      console.log(`Progress: ${data.completedBatches.length}/${data.total} batch\n`);
      return data;
    }
  }
  return { completedBatches: [], total: 0 };
}

export function saveProgress(progressFile: string, progress: Progress): void {
  fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2), 'utf-8');
}

export async function translateBatch(
  ctx: TranslationContext,
  aio: AIO,
  entries: XMLEntry[],
  batchIndex: number,
  retryCount: number = 0,
  messages: Message[] | null = null,
  totalAttempts: number = 0,
  completedBatches: Set<number> | null = null
): Promise<TranslateResult> {
  void messages;
  void totalAttempts;

  const { config, tempDir } = ctx;
  const batchSize = config.translation.batchSize;
  const maxRetries = config.translation.maxRetries;
  const retryDelay = config.translation.retryDelay;

  if (completedBatches && completedBatches.has(batchIndex)) {
    return { batchIndex, success: true, alreadyCompleted: true };
  }

  const startIndex = batchIndex * batchSize;
  const batch = entries.slice(startIndex, startIndex + batchSize);
  const expectedKeys = batch.map(e => e.key);

  const hashKeyMap = new Map<string, string>();
  const reverseHashMap = new Map<string, string>();
  batch.forEach(e => {
    const hashKey = createHashKey(e.key);
    hashKeyMap.set(e.key, hashKey);
    reverseHashMap.set(hashKey, e.key);
  });

  const xmlInput = batch.map(e => {
    const hashKey = hashKeyMap.get(e.key);
    const comment = e.comment ? `  <!-- ${escapeXml(e.comment)} -->\n` : '';
    return `${comment}  <Text Key="${hashKey}">${escapeXml(e.text)}</Text>`;
  }).join('\n');

  const freshMessages = [{ role: 'user' as const, content: buildTranslationPrompt(batch.length, xmlInput) }];

  try {
    const response = await aio.chatCompletion({
      provider: config.api.provider as any,
      model: config.api.model,
      systemPrompt: config.systemPrompt,
      messages: freshMessages as any,
      temperature: config.api.temperature,
      top_p: config.api.top_p,
      max_tokens: config.api.max_tokens,
    });

    const content = response.choices[0].message.content;
    const translatedContent = typeof content === 'string' ? content.trim() : '';
    const translatedEntries = parseXMLEntries(translatedContent);

    translatedEntries.forEach(entry => {
      const originalKey = reverseHashMap.get(entry.key);
      if (originalKey) {
        entry.key = originalKey;
      }
    });

    const translatedKeys = translatedEntries.map(e => e.key);
    const wrongCount = expectedKeys.length !== translatedKeys.length;
    const missingKeys = expectedKeys.filter(key => !translatedKeys.includes(key));
    const extraKeys = translatedKeys.filter(key => !expectedKeys.includes(key));
    const wrongKeys = expectedKeys.length === translatedKeys.length &&
      expectedKeys.some((key, i) => key !== translatedKeys[i]);
    const hasError = wrongCount || missingKeys.length > 0 || extraKeys.length > 0 || wrongKeys;

    if (hasError) {
      if (retryCount >= maxRetries) {
        console.log(`Batch ${batchIndex + 1}: failed after ${maxRetries} retries.`);
        throw new Error(`Batch ${batchIndex + 1} failed after ${maxRetries} retries`);
      }

      let errorMsg = `missing: ${missingKeys.length}, extra: ${extraKeys.length}`;
      if (wrongKeys && missingKeys.length === 0 && extraKeys.length === 0) {
        errorMsg = 'wrong order';
      }
      console.log(`Batch ${batchIndex + 1}: invalid keys (${errorMsg}), retry ${retryCount + 1}/${maxRetries}`);

      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return translateBatch(ctx, aio, entries, batchIndex, retryCount + 1, null, totalAttempts + 1, completedBatches);
    }

    const tempFile = path.join(tempDir, `batch-${String(batchIndex).padStart(6, '0')}.xml`);
    let xmlOutput = '';
    for (const entry of translatedEntries) {
      xmlOutput += `  <Text Key="${entry.key}">${escapeXml(entry.text)}</Text>\n`;
    }

    fs.writeFileSync(tempFile, xmlOutput, 'utf-8');
    console.log(`Batch ${batchIndex + 1}: completed with ${translatedEntries.length} tags`);
    return { batchIndex, success: true, entries: translatedEntries };
  } catch (error) {
    const err = error as Error;
    const isRateLimit = err.message.includes('rate limit') || err.message.includes('429');
    const waitTime = isRateLimit ? 5000 : retryDelay;

    if (retryCount >= maxRetries) {
      throw err;
    }

    console.error(`Batch ${batchIndex + 1} error: ${err.message}`);
    console.log(`Retry in ${waitTime / 1000}s...`);

    await new Promise(resolve => setTimeout(resolve, waitTime));
    return translateBatch(ctx, aio, entries, batchIndex, retryCount + 1, null, totalAttempts + 1, completedBatches);
  }
}

export async function runTranslation(ctx: TranslationContext): Promise<void> {
  const { config, progressFile, inputFile, outputFile, tempDir, modeName } = ctx;

  console.log(`Translate ${modeName}\n`);

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  if (!fs.existsSync(path.dirname(outputFile))) {
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  }
  if (!fs.existsSync(path.dirname(progressFile))) {
    fs.mkdirSync(path.dirname(progressFile), { recursive: true });
  }

  const aio = new AIO({
    providers: [{
      provider: config.api.provider as any,
      apiKeys: [
        { key: process.env.NVIDIA_API_KEY || '' },
        { key: process.env.NVIDIA_API_KEY_2 || '' }
      ],
      models: [{ modelId: config.api.model }],
    }],
    disableAutoKeyDisable: true,
    maxRetries: config.translation.maxRetries,
    retryDelay: config.translation.retryDelay,
  });

  const xmlContent = fs.readFileSync(inputFile, 'utf-8');
  const entries = parseXMLEntries(xmlContent);
  const totalBatches = Math.ceil(entries.length / config.translation.batchSize);

  console.log(`${entries.length} XML tags, ${totalBatches} batch(es)\n`);

  let progress = loadProgress(progressFile);
  if (progress.completedBatches.length === 0 || progress.total !== totalBatches) {
    progress = { completedBatches: [], total: totalBatches };
  }

  const pendingBatches: number[] = [];
  for (let i = 0; i < totalBatches; i++) {
    if (!progress.completedBatches.includes(i)) {
      pendingBatches.push(i);
    }
  }

  console.log(`Pending: ${pendingBatches.length} batch(es)\n`);

  const runningPromises = new Set<Promise<void>>();
  const completedBatches = new Set<number>(progress.completedBatches);
  let currentIndex = 0;

  async function processNextBatch(): Promise<void> {
    if (currentIndex >= pendingBatches.length) return;

    const batchIndex = pendingBatches[currentIndex];
    currentIndex++;

    if (completedBatches.has(batchIndex)) {
      if (currentIndex < pendingBatches.length) {
        return processNextBatch();
      }
      return;
    }

    console.log(`Batch ${batchIndex + 1}/${totalBatches}`);
    const result = await translateBatch(ctx, aio, entries, batchIndex, 0, null, 0, completedBatches);

    if (!result.alreadyCompleted && !completedBatches.has(result.batchIndex)) {
      completedBatches.add(result.batchIndex);
      progress.completedBatches.push(result.batchIndex);
      saveProgress(progressFile, progress);
      console.log(`Batch ${result.batchIndex + 1} saved`);
    }

    if (currentIndex < pendingBatches.length) {
      return processNextBatch();
    }
  }

  for (let i = 0; i < Math.min(config.translation.parallelBatches, pendingBatches.length); i++) {
    const promise = processNextBatch();
    runningPromises.add(promise);
    promise.finally(() => runningPromises.delete(promise));
  }

  while (runningPromises.size > 0) {
    await Promise.race(Array.from(runningPromises));
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  let xmlOutput = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<STBLKeyStringList>\n';
  for (let i = 0; i < totalBatches; i++) {
    const tempFile = path.join(tempDir, `batch-${String(i).padStart(6, '0')}.xml`);
    if (fs.existsSync(tempFile)) {
      xmlOutput += fs.readFileSync(tempFile, 'utf-8');
    }
  }
  xmlOutput += '</STBLKeyStringList>';

  fs.writeFileSync(outputFile, xmlOutput, 'utf-8');
  console.log(`Done: ${outputFile}`);

  if (fs.existsSync(progressFile)) {
    fs.unlinkSync(progressFile);
  }
}
