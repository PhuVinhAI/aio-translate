const { AIO } = require('aio-llm');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Cấu hình
const CONFIG = {
  api: {
    provider: 'nvidia',
    model: 'stepfun-ai/step-3.5-flash',
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 16384,
  },
  translation: {
    batchSize: 30,
    parallelBatches: 10,
    maxRetries: 3,
    retryDelay: 2000,
  },
  systemPrompt: `Bạn là chuyên gia dịch game Stardew Valley sang tiếng Việt.

QUY TẮC:
1. Dịch tự nhiên, phong cách game nông trại ấm áp
2. Giữ nguyên biến {0}, {1}, @, ^, %, $, #, v.v.
3. Giữ nguyên ký tự đặc biệt như $, #, @, ^
4. Dịch sát nghĩa, không thêm bớt
5. Xưng hô tự nhiên, phù hợp nhân vật
6. Giữ tone cảm xúc của câu gốc`
};

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

// Đọc file JSON (hỗ trợ comment và BOM)
function loadJSON(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Xóa BOM nếu có
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  
  // Xóa comment dạng // và /* */
  content = content
    .replace(/\/\/.*$/gm, '') // Xóa comment //
    .replace(/\/\*[\s\S]*?\*\//g, ''); // Xóa comment /* */
  
  try {
    return JSON.parse(content);
  } catch (error) {
    console.error(`\n❌ Lỗi parse JSON: ${filePath}`);
    console.error(`Chi tiết: ${error.message}`);
    console.error(`Nội dung (100 ký tự đầu): ${content.substring(0, 100)}`);
    throw error;
  }
}

// Lưu file JSON
function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Dịch một batch
async function translateBatch(entries, retryCount = 0) {
  const jsonInput = JSON.stringify(entries, null, 2);
  
  const userPrompt = `Dịch ${entries.length} cặp key-value JSON từ tiếng Anh sang tiếng Việt.

INPUT:
${jsonInput}

QUY TẮC:
- GIỮ NGUYÊN key
- CHỈ dịch value
- GIỮ NGUYÊN biến: {0}, {1}, @, ^, %, $, #, v.v.
- Trả về JSON với cấu trúc giống input

OUTPUT (JSON):`;

  try {
    const response = await aio.chatCompletion({
      provider: CONFIG.api.provider,
      model: CONFIG.api.model,
      systemPrompt: CONFIG.systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      temperature: CONFIG.api.temperature,
      top_p: CONFIG.api.top_p,
      max_tokens: CONFIG.api.max_tokens,
    });

    const content = response.choices[0].message.content.trim();
    
    // Parse JSON từ response
    let translated;
    try {
      // Tìm JSON block trong response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        translated = JSON.parse(jsonMatch[0]);
      } else {
        translated = JSON.parse(content);
      }
    } catch (e) {
      throw new Error('Không parse được JSON: ' + e.message);
    }

    // Kiểm tra keys
    const inputKeys = Object.keys(entries);
    const outputKeys = Object.keys(translated);
    
    if (inputKeys.length !== outputKeys.length) {
      throw new Error(`Số key không khớp: ${inputKeys.length} → ${outputKeys.length}`);
    }

    return translated;
    
  } catch (error) {
    if (retryCount < CONFIG.translation.maxRetries) {
      console.log(`⚠️  Lỗi: ${error.message}, retry ${retryCount + 1}/${CONFIG.translation.maxRetries}...`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.translation.retryDelay));
      return translateBatch(entries, retryCount + 1);
    }
    throw error;
  }
}

// Tìm tất cả file default.json
function findDefaultFiles(dir) {
  const results = [];
  
  function scan(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scan(fullPath);
      } else if (item === 'default.json') {
        results.push(fullPath);
      }
    }
  }
  
  scan(dir);
  return results;
}

// Dịch một file
async function translateFile(inputFile) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`� ${inputFile}`);
  console.log('='.repeat(80));

  // Đọc file
  const data = loadJSON(inputFile);
  const entries = Object.entries(data);
  
  console.log(`📊 Tổng: ${entries.length} entries`);

  // Chia batch
  const batches = [];
  for (let i = 0; i < entries.length; i += CONFIG.translation.batchSize) {
    const batch = entries.slice(i, i + CONFIG.translation.batchSize);
    const batchObj = Object.fromEntries(batch);
    batches.push(batchObj);
  }

  console.log(`📋 Chia thành ${batches.length} batch\n`);

  // Dịch song song
  const results = [];
  const runningPromises = new Set();
  let currentIndex = 0;

  async function processNextBatch() {
    if (currentIndex >= batches.length) return;
    
    const batchIndex = currentIndex;
    const batch = batches[batchIndex];
    currentIndex++;

    console.log(`⚡ Batch ${batchIndex + 1}/${batches.length}`);
    
    try {
      const translated = await translateBatch(batch);
      results[batchIndex] = translated;
      console.log(`✅ Batch ${batchIndex + 1} hoàn thành`);
    } catch (error) {
      console.error(`❌ Batch ${batchIndex + 1} thất bại: ${error.message}`);
      results[batchIndex] = batch; // Giữ nguyên nếu lỗi
    }

    if (currentIndex < batches.length) {
      return processNextBatch();
    }
  }

  // Khởi động workers
  for (let i = 0; i < Math.min(CONFIG.translation.parallelBatches, batches.length); i++) {
    const promise = processNextBatch();
    runningPromises.add(promise);
    promise.finally(() => runningPromises.delete(promise));
  }

  // Chờ xong
  while (runningPromises.size > 0) {
    await Promise.race(Array.from(runningPromises));
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Ghép kết quả
  console.log('\n📝 Ghép kết quả...');
  const finalResult = {};
  results.forEach(batch => {
    Object.assign(finalResult, batch);
  });

  // Backup file gốc
  const backupFile = inputFile + '.backup';
  fs.copyFileSync(inputFile, backupFile);
  console.log(`💾 Backup → ${path.basename(backupFile)}`);

  // Ghi đè lên file gốc
  saveJSON(inputFile, finalResult);

  console.log(`✅ Đã ghi đè → ${path.basename(inputFile)}`);
  console.log(`📊 Đã dịch ${Object.keys(finalResult).length} entries`);
}

async function main() {
  console.log(`🚀 Dịch Stardew Valley - Tất cả file default.json\n`);

  // Tìm tất cả file default.json trong PolyamorySweet
  const defaultFiles = findDefaultFiles('PolyamorySweet');
  
  if (defaultFiles.length === 0) {
    console.error('❌ Không tìm thấy file default.json nào');
    return;
  }

  console.log(`📁 Tìm thấy ${defaultFiles.length} file:\n`);
  defaultFiles.forEach((file, i) => {
    console.log(`${i + 1}. ${file}`);
  });

  // Dịch từng file
  for (const file of defaultFiles) {
    try {
      await translateFile(file);
    } catch (error) {
      console.error(`\n❌ Lỗi khi dịch ${file}: ${error.message}`);
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('🎉 HOÀN THÀNH TẤT CẢ!');
  console.log(`✅ Đã dịch ${defaultFiles.length} file`);
  console.log('💾 File gốc đã được backup với đuôi .backup');
  console.log('='.repeat(80));
}

main().catch(console.error);
