const fs = require('fs');
const path = require('path');
const PATHS = require('../../config/paths.config');
const { unescapeXml, parseXMLToMap } = require('../utils/xml-parser');

function exportSNBT() {
  console.log('\n=== [FTB Quests 5] Xuất SNBT ===');

  const inputDir = PATHS.FTBQUESTS.INPUT_DIR;
  const outputDir = PATHS.FTBQUESTS.OUTPUT_DIR;
  const mergedXml = PATHS.FTBQUESTS.TEMP_MERGED;
  const mappingFile = PATHS.FTBQUESTS.MAPPING;

  if (!fs.existsSync(mergedXml) || !fs.existsSync(mappingFile)) {
    console.error(`❌ Thiếu file XML hoặc Mapping!`);
    process.exit(1);
  }

  const translatedEntries = parseXMLToMap(fs.readFileSync(mergedXml, 'utf8'));
  const mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));

  // Tạo map: filePath -> { key: "translated_string_or_array_format" }
  const fileData = {};

  for (const [hashKey, mapInfo] of Object.entries(mapping)) {
    const viTextRaw = translatedEntries.get(hashKey);
    if (!viTextRaw) continue;

    const viText = unescapeXml(viTextRaw);
    let finalOutput = "";

    // Xử lý Escape an toàn cho SNBT
    const escapeSafe = (str) => {
      // Bước 1: Loại bỏ tất cả escape hiện tại
      let safeStr = str.replace(/\\\\/g, '\\').replace(/\\"/g, '"');
      
      // Bước 2: Escape lại dấu ngoặc kép
      safeStr = safeStr.replace(/"/g, '\\"');
      
      // Bước 3: FIX LỖI GAME - Escape ký tự '&' có khoảng trắng đằng sau
      safeStr = safeStr.replace(/& /g, '\\& ');
      
      return safeStr;
    };

    if (mapInfo.isArray) {
      // QUAN TRỌNG: Kiểm tra xem mảng gốc có bao nhiêu phần tử
      const originalArrayMatch = mapInfo.originalValue.match(/\[([^\]]+)\]/);
      if (originalArrayMatch) {
        const originalContent = originalArrayMatch[1];
        // Đếm số dấu ngoặc kép mở (mỗi phần tử bắt đầu bằng ")
        const originalElementCount = (originalContent.match(/(?:^|,)\s*"/g) || []).length;
        
        if (originalElementCount === 1) {
          // Mảng gốc chỉ có 1 phần tử -> Giữ nguyên format 1 phần tử, thay \\n bằng \\n\\n
          const singleLine = viText.replace(/\\n/g, '\\n\\n');
          finalOutput = `["${escapeSafe(singleLine)}"]`;
        } else {
          // Mảng gốc có nhiều phần tử -> Tách thành nhiều dòng
          const lines = viText.split('\\n').filter(line => line.trim() !== '');
          finalOutput = "[\n";
          lines.forEach((line, index) => {
            finalOutput += `\t\t"${escapeSafe(line)}"\n`;
          });
          finalOutput += "\t]";
        }
      } else {
        // Fallback: Không parse được -> dùng logic cũ
        const lines = viText.split('\\n').filter(line => line.trim() !== '');
        finalOutput = "[\n";
        lines.forEach((line, index) => {
          finalOutput += `\t\t"${escapeSafe(line)}"\n`;
        });
        finalOutput += "\t]";
      }
    } else {
      finalOutput = `"${escapeSafe(viText)}"`;
    }

    if (!fileData[mapInfo.file]) fileData[mapInfo.file] = {};
    fileData[mapInfo.file][mapInfo.originalKey] = finalOutput;
  }

  // Tái cấu trúc files
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }

  // FIX LỖI KHÔNG DỊCH MÔ TẢ: Regex cũ không bắt được Mảng có chứa nhiều dòng và ký tự lạ.
  // Đã nới lỏng Regex phần Value để quét chính xác hơn.
  const snbtRegex = /([\w\.\-]+)\s*:\s*(\[[\s\S]*?\]|"(?:[^"\\]|\\.)*")/g;
  let replacedCount = 0;

  for (const [relPath, keysToReplace] of Object.entries(fileData)) {
    // Đổi tên đường dẫn xuất ra từ en_us thành vi_vn tự động
    let destRelPath = relPath;
    destRelPath = destRelPath.replace(/^en_us(\/|\\)/, 'vi_vn$1');
    destRelPath = destRelPath.replace(/^en_us\.snbt$/, 'vi_vn.snbt');

    const srcFile = path.join(inputDir, relPath);
    const destFile = path.join(outputDir, destRelPath);

    fs.mkdirSync(path.dirname(destFile), { recursive: true });

    let content = fs.readFileSync(srcFile, 'utf8');

    // Chạy regex đè (replace) trên nội dung gốc
    content = content.replace(snbtRegex, (match, key, oldVal) => {
      if (keysToReplace[key]) {
        replacedCount++;
        // FIX LỖI MẢNG: Đảm bảo định dạng mảng luôn cách Key một khoảng trắng cho SNBT dễ thở
        let newVal = keysToReplace[key];
        return `${key}: ${newVal}`;
      }
      return match;
    });

    fs.writeFileSync(destFile, content, 'utf8');
  }

  console.log(`✅ Đã xuất thành công và ghi đè ${replacedCount} keys vào thư mục vi_vn!`);
  console.log(`📁 Files đã sẵn sàng tại: ${outputDir}`);
}

if (require.main === module) {
  exportSNBT();
}

module.exports = { exportSNBT };
