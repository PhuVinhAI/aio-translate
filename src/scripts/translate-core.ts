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

export function loadProgress(progressFile: string): Progress {
  if (fs.existsSync(progressFile)) {
    const data = JSON.parse(fs.readFileSync(progressFile, 'utf-8')) as Progress;
    if (data.completedBatches && Array.isArray(data.completedBatches)) {
      console.log(`📂 Tiến độ: ${data.completedBatches.length}/${data.total} batch\n`);
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
  const { config, tempDir } = ctx;
  const BATCH_SIZE = config.translation.batchSize;
  const MAX_RETRIES = config.translation.maxRetries;
  const RETRY_DELAY = config.translation.retryDelay;

  // Kiểm tra xem batch đã hoàn thành chưa
  if (completedBatches && completedBatches.has(batchIndex)) {
    return { batchIndex, success: true, alreadyCompleted: true };
  }

  const startIndex = batchIndex * BATCH_SIZE;
  const batch = entries.slice(startIndex, startIndex + BATCH_SIZE);
  const expectedKeys = batch.map(e => e.key);

  // Tạo hash key map
  const hashKeyMap = new Map<string, string>();
  const reverseHashMap = new Map<string, string>();
  batch.forEach(e => {
    const hashKey = createHashKey(e.key);
    hashKeyMap.set(e.key, hashKey);
    reverseHashMap.set(hashKey, e.key);
  });

  const xmlInput = batch.map(e => {
    const hashKey = hashKeyMap.get(e.key);
    return `  <Text Key="${hashKey}">${escapeXml(e.text)}</Text>`;
  }).join('\n');

  // Luôn tạo prompt mới cho mỗi lần gọi (không dùng lịch sử)
  const userPrompt = `Dịch ${batch.length} thẻ XML tiếng Anh sang tiếng Việt.

${xmlInput}

⚠️ QUY TẮC QUAN TRỌNG NHẤT CHO MODPACK MINECRAFT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. GIỮ NGUYÊN 100% CÁC BIẾN VÀ KÝ TỰ ĐẶC BIỆT CỦA MINECRAFT:
   - Màu sắc và định dạng: §a, §b, §c, §l, §o, §r... (Ví dụ: §cFire -> §cLửa)
   - Biến số: %s, %d, %1$s, %2$d, {0}, {1}...
   - Ký tự xuống dòng: \\n

2. CHỈ DỊCH TEXT BÊN TRONG THẺ <Text>. TUYỆT ĐỐI GIỮ NGUYÊN Key (Key là mã hash).
   - Gốc: <Text Key="A1B2C3D4">Iron Ingot</Text>
   - Dịch: <Text Key="A1B2C3D4">Phôi sắt</Text>

3. DỊCH CHUẨN THUẬT NGỮ MINECRAFT:
   - Các từ thông dụng như Chest, Iron Ingot, Crafting Table cần dịch chuẩn thành Rương, Phôi sắt, Bàn chế tạo.
   - Giữ nguyên các tên riêng hoặc tên máy móc đặc thù của mod nếu không dịch được.

Trả về ĐÚNG ${batch.length} thẻ <Text> với cấu trúc XML nguyên vẹn.`;

  const freshMessages = [{ role: "user" as const, content: userPrompt }];

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
      if (retryCount >= MAX_RETRIES) {
        console.log(`❌ Batch ${batchIndex + 1}: Đã retry ${MAX_RETRIES} lần nhưng vẫn lỗi. Bỏ qua batch này.`);
        throw new Error(`Batch ${batchIndex + 1} failed after ${MAX_RETRIES} retries`);
      }

      console.log(`⚠️  Batch ${batchIndex + 1}: Sai Key (Retry ${retryCount + 1}/${MAX_RETRIES})`);

      let errorMsg = `Thiếu: ${missingKeys.length}, Thừa: ${extraKeys.length}`;
      if (wrongKeys && missingKeys.length === 0 && extraKeys.length === 0) {
        errorMsg = 'Sai thứ tự';
      }
      console.log(`   ${errorMsg}`);

      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));

      // Gọi lại với API mới hoàn toàn (không truyền messages)
      return translateBatch(ctx, aio, entries, batchIndex, retryCount + 1, null, totalAttempts + 1, completedBatches);
    }

    console.log(`✅ Batch ${batchIndex + 1}: Hoàn thành với ${translatedEntries.length} thẻ`);
    const tempFile = path.join(tempDir, `batch-${String(batchIndex).padStart(6, '0')}.xml`);

    let xmlOutput = '';
    for (const entry of translatedEntries) {
      xmlOutput += `  <Text Key="${entry.key}">${entry.text}</Text>\n`;
    }

    fs.writeFileSync(tempFile, xmlOutput, 'utf-8');
    return { batchIndex, success: true, entries: translatedEntries };

  } catch (error) {
    const err = error as Error;
    const isRateLimit = err.message.includes('rate limit') || err.message.includes('429');
    const waitTime = isRateLimit ? 5000 : RETRY_DELAY;

    console.error(`❌ Batch ${batchIndex + 1} lỗi: ${err.message}`);
    console.log(`🔄 Retry sau ${waitTime / 1000}s...`);

    await new Promise(resolve => setTimeout(resolve, waitTime));
    return translateBatch(ctx, aio, entries, batchIndex, retryCount + 1, messages, totalAttempts + 1, completedBatches);
  }
}

export async function runTranslation(ctx: TranslationContext): Promise<void> {
  const { config, progressFile, inputFile, outputFile, tempDir, modeName } = ctx;

  console.log(`🚀 Dịch ${modeName}\n`);

  // Tạo thư mục temp
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  if (!fs.existsSync(path.dirname(outputFile))) {
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
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

  console.log(`📊 ${entries.length} thẻ XML, ${totalBatches} batch\n`);

  let progress = loadProgress(progressFile);
  if (progress.completedBatches.length === 0) {
    progress = { completedBatches: [], total: totalBatches };
  }

  const pendingBatches: number[] = [];
  for (let i = 0; i < totalBatches; i++) {
    if (!progress.completedBatches.includes(i)) {
      pendingBatches.push(i);
    }
  }

  console.log(`📋 Còn lại: ${pendingBatches.length} batch\n`);

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

    console.log(`⚡ Batch ${batchIndex + 1}/${totalBatches}`);

    const result = await translateBatch(ctx, aio, entries, batchIndex, 0, null, 0, completedBatches);

    if (!result.alreadyCompleted && !completedBatches.has(result.batchIndex)) {
      completedBatches.add(result.batchIndex);
      progress.completedBatches.push(result.batchIndex);
      saveProgress(progressFile, progress);

      console.log(`✅ Batch ${result.batchIndex + 1} → ${path.basename(tempDir)}/batch-${String(result.batchIndex).padStart(6, '0')}.xml`);
    }

    if (currentIndex < pendingBatches.length) {
      return processNextBatch();
    }
  }

  // Khởi động workers
  for (let i = 0; i < Math.min(config.translation.parallelBatches, pendingBatches.length); i++) {
    const promise = processNextBatch();
    runningPromises.add(promise);
    promise.finally(() => runningPromises.delete(promise));
  }

  while (runningPromises.size > 0) {
    await Promise.race(Array.from(runningPromises));
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Ghép file XML
  console.log('\n📝 Tạo file XML...');

  let xmlOutput = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<STBLKeyStringList>\n';

  for (let i = 0; i < totalBatches; i++) {
    const tempFile = path.join(tempDir, `batch-${String(i).padStart(6, '0')}.xml`);
    if (fs.existsSync(tempFile)) {
      xmlOutput += fs.readFileSync(tempFile, 'utf-8');
    }
  }

  xmlOutput += '</STBLKeyStringList>';

  fs.writeFileSync(outputFile, xmlOutput, 'utf-8');

  console.log('\n🎉 HOÀN THÀNH!');
  console.log(`✅ ${outputFile}`);
  console.log(`📊 Đã dịch ${entries.length} thẻ`);

  if (fs.existsSync(progressFile)) {
    fs.unlinkSync(progressFile);
  }
}
