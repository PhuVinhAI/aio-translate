const { AIO } = require('aio-llm');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const PATHS = require('../config/paths.config');

/**
 * Tạo hash key ngắn từ key gốc
 */
function createHashKey(originalKey) {
    return crypto.createHash('md5').update(originalKey).digest('hex').substring(0, 8).toUpperCase();
}

// Kiểm tra mode từ argument
const mode = process.argv[2] || 'minecraft';
const isMinecraftMode = mode === 'minecraft';
const isFTBMode = mode === 'ftbquests';

// Load config phù hợp
let CONFIG;
if (isMinecraftMode) CONFIG = require('../config/minecraft-translation.config');
else if (isFTBMode) CONFIG = require('../config/ftbquests-translation.config');
else CONFIG = require('../config/minecraft-translation.config'); // Default to Minecraft

const { parseXMLEntries, escapeXml } = require('./utils/xml-parser');

const BATCH_SIZE = CONFIG.translation.batchSize;
const PARALLEL_BATCHES = CONFIG.translation.parallelBatches;
const MAX_RETRIES = CONFIG.translation.maxRetries;
const RETRY_DELAY = CONFIG.translation.retryDelay;

// Paths phụ thuộc vào mode
const PROGRESS_FILE = isMinecraftMode ? path.join(PATHS.TEMP.DIR, 'minecraft-progress.json')
                    : path.join(PATHS.TEMP.DIR, 'ftbquests-progress.json');

const INPUT_FILE = isMinecraftMode ? PATHS.MINECRAFT.TEMP_NEW : PATHS.FTBQUESTS.TEMP_NEW;
const OUTPUT_FILE = isMinecraftMode ? PATHS.MINECRAFT.TEMP_TRANSLATED : PATHS.FTBQUESTS.TEMP_TRANSLATED;
const TEMP_DIR = isMinecraftMode ? path.join(PATHS.TEMP.DIR, 'temp-batches-minecraft')
               : path.join(PATHS.TEMP.DIR, 'temp-batches-ftbquests');

// Tạo thư mục temp
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}
if (!fs.existsSync(path.dirname(OUTPUT_FILE))) {
    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
}

const aio = new AIO({
    providers: [{
        provider: CONFIG.api.provider,
        apiKeys: [
            { key: process.env.NVIDIA_API_KEY },
            { key: process.env.NVIDIA_API_KEY_2 }
        ],
        models: [{ modelId: CONFIG.api.model }],
    }],
    disableAutoKeyDisable: true,
    maxRetries: CONFIG.translation.maxRetries,
    retryDelay: CONFIG.translation.retryDelay,
});

function loadProgress() {
    if (fs.existsSync(PROGRESS_FILE)) {
        const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
        if (data.completedBatches && Array.isArray(data.completedBatches)) {
            console.log(`📂 Tiến độ: ${data.completedBatches.length}/${data.total} batch\n`);
            return data;
        }
    }
    return { completedBatches: [], total: 0 };
}

function saveProgress(progress) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf-8');
}

async function translateBatch(entries, batchIndex, retryCount = 0, messages = null, totalAttempts = 0, completedBatches = null) {
    // Kiểm tra xem batch đã hoàn thành chưa
    if (completedBatches && completedBatches.has(batchIndex)) {
        return { batchIndex, success: true, alreadyCompleted: true };
    }

    const startIndex = batchIndex * BATCH_SIZE;
    const batch = entries.slice(startIndex, startIndex + BATCH_SIZE);
    const expectedKeys = batch.map(e => e.key);

    // Tạo hash key map để AI không bị nhầm với key dài
    const hashKeyMap = new Map();
    const reverseHashMap = new Map();
    batch.forEach(e => {
        const hashKey = createHashKey(e.key);
        hashKeyMap.set(e.key, hashKey);
        reverseHashMap.set(hashKey, e.key);
    });

    // Tạo XML input với hash key ngắn
    const xmlInput = batch.map(e => {
        const hashKey = hashKeyMap.get(e.key);
        return `  <Text Key="${hashKey}">${escapeXml(e.text)}</Text>`;
    }).join('\n');

    // Nếu retry quá MAX_RETRIES lần, tạo conversation mới
    if (retryCount > MAX_RETRIES) {
        console.log(`🔄 Batch ${batchIndex + 1}: Đã retry ${MAX_RETRIES} lần, gọi API mới (lần thử ${totalAttempts + 1})...`);
        retryCount = 0;
        messages = null;
    }

    // Tạo prompt
    if (!messages) {
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

        messages = [{ role: "user", content: userPrompt }];
    }

    try {
        const response = await aio.chatCompletion({
            provider: CONFIG.api.provider,
            model: CONFIG.api.model,
            systemPrompt: CONFIG.systemPrompt,
            messages: messages,
            temperature: CONFIG.api.temperature,
            top_p: CONFIG.api.top_p,
            max_tokens: CONFIG.api.max_tokens,
        });

        const translatedContent = response.choices[0].message.content.trim();

        // Parse XML trả về
        const translatedEntries = parseXMLEntries(translatedContent);

        // Map hash key về key gốc
        translatedEntries.forEach(entry => {
            const originalKey = reverseHashMap.get(entry.key);
            if (originalKey) {
                entry.key = originalKey;
            }
        });

        const translatedKeys = translatedEntries.map(e => e.key);

        // Kiểm tra Key
        const wrongCount = expectedKeys.length !== translatedKeys.length;
        const missingKeys = expectedKeys.filter(key => !translatedKeys.includes(key));
        const extraKeys = translatedKeys.filter(key => !expectedKeys.includes(key));
        const wrongKeys = expectedKeys.length === translatedKeys.length &&
                        expectedKeys.some((key, i) => key !== translatedKeys[i]);

        const hasError = wrongCount || missingKeys.length > 0 || extraKeys.length > 0 || wrongKeys;

        if (hasError) {
            console.log(`⚠️  Batch ${batchIndex + 1}: Sai Key (Retry ${retryCount}/${MAX_RETRIES}, Tổng lần ${totalAttempts + 1})`);

            messages.push({ role: "assistant", content: translatedContent });

            let errorMsg = `LỖI: Key không đúng!\nCần: ${expectedKeys.length} thẻ, Nhận: ${translatedKeys.length} thẻ\n\n`;

            if (missingKeys.length > 0) {
                errorMsg += `❌ THIẾU các Key:\n${missingKeys.join('\n')}\n\n`;
            }
            if (extraKeys.length > 0) {
                errorMsg += `❌ THỪA các Key:\n${extraKeys.join('\n')}\n\n`;
            }
            if (wrongKeys && missingKeys.length === 0 && extraKeys.length === 0) {
                errorMsg += `❌ SAI THỨ TỰ!\n\n`;
            }

            errorMsg += `✅ Trả về ĐÚNG ${expectedKeys.length} thẻ theo THỨ TỰ này:\n`;
            expectedKeys.forEach((key, i) => {
                errorMsg += `${i + 1}. Key="${key}"\n`;
            });

            messages.push({ role: "user", content: errorMsg });

            console.log(`🔄 Retry ${retryCount + 1}/${MAX_RETRIES}...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));

            return translateBatch(entries, batchIndex, retryCount + 1, messages, totalAttempts + 1, completedBatches);
        }

        // Key đúng, lưu file
        console.log(`✅ Batch ${batchIndex + 1}: Hoàn thành với ${translatedEntries.length} thẻ`);
        const tempFile = path.join(TEMP_DIR, `batch-${String(batchIndex).padStart(6, '0')}.xml`);

        let xmlOutput = '';
        for (const entry of translatedEntries) {
            xmlOutput += `  <Text Key="${entry.key}">${entry.text}</Text>\n`;
        }

        fs.writeFileSync(tempFile, xmlOutput, 'utf-8');
        return { batchIndex, success: true, entries: translatedEntries };

    } catch (error) {
        const isRateLimit = error.message.includes('rate limit') || error.message.includes('429');
        const waitTime = isRateLimit ? 5000 : RETRY_DELAY;

        console.error(`❌ Batch ${batchIndex + 1} lỗi: ${error.message}`);
        console.log(`🔄 Retry sau ${waitTime/1000}s...`);

        await new Promise(resolve => setTimeout(resolve, waitTime));
        return translateBatch(entries, batchIndex, retryCount + 1, messages, totalAttempts + 1, completedBatches);
    }
}

async function main() {
    const modeNames = {
        'minecraft': 'Minecraft Mods (Anh → Việt)',
        'ftbquests': 'FTB Quests (Anh → Việt)'
    };
    console.log(`🚀 Dịch ${modeNames[mode]}\n`);

    const xmlContent = fs.readFileSync(INPUT_FILE, 'utf-8');
    const entries = parseXMLEntries(xmlContent).map(e => ({
        key: e.key,
        text: e.text
    }));
    const totalBatches = Math.ceil(entries.length / BATCH_SIZE);

    console.log(`📊 ${entries.length} thẻ XML, ${totalBatches} batch\n`);

    let progress = loadProgress();
    if (progress.completedBatches.length === 0) {
        progress = { completedBatches: [], total: totalBatches };
    }

    const pendingBatches = [];
    for (let i = 0; i < totalBatches; i++) {
        if (!progress.completedBatches.includes(i)) {
            pendingBatches.push(i);
        }
    }

    console.log(`📋 Còn lại: ${pendingBatches.length} batch\n`);

    const runningPromises = new Set();
    const completedBatches = new Set(progress.completedBatches);

    let currentIndex = 0;

    async function processNextBatch() {
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

        const result = await translateBatch(entries, batchIndex, 0, null, 0, completedBatches);

        if (!result.alreadyCompleted && !completedBatches.has(result.batchIndex)) {
            completedBatches.add(result.batchIndex);
            progress.completedBatches.push(result.batchIndex);
            saveProgress(progress);

            console.log(`✅ Batch ${result.batchIndex + 1} → ${path.basename(TEMP_DIR)}/batch-${String(result.batchIndex).padStart(6, '0')}.xml`);
        }

        if (currentIndex < pendingBatches.length) {
            return processNextBatch();
        }
    }

    // Khởi động PARALLEL_BATCHES workers
    for (let i = 0; i < Math.min(PARALLEL_BATCHES, pendingBatches.length); i++) {
        const promise = processNextBatch();
        runningPromises.add(promise);
        promise.finally(() => runningPromises.delete(promise));
    }

    // Chờ xong
    while (runningPromises.size > 0) {
        await Promise.race(Array.from(runningPromises));
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Ghép file XML
    console.log('\n📝 Tạo file XML...');

    let xmlOutput = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<STBLKeyStringList>\n';

    for (let i = 0; i < totalBatches; i++) {
        const tempFile = path.join(TEMP_DIR, `batch-${String(i).padStart(6, '0')}.xml`);
        if (fs.existsSync(tempFile)) {
            xmlOutput += fs.readFileSync(tempFile, 'utf-8');
        }
    }

    xmlOutput += '</STBLKeyStringList>';

    fs.writeFileSync(OUTPUT_FILE, xmlOutput, 'utf-8');

    console.log('\n🎉 HOÀN THÀNH!');
    console.log(`✅ ${OUTPUT_FILE}`);
    console.log(`📊 Đã dịch ${entries.length} thẻ`);

    if (fs.existsSync(PROGRESS_FILE)) {
        fs.unlinkSync(PROGRESS_FILE);
    }
}

main().catch(console.error);
