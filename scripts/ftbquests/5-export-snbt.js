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

    // Xử lý Escape Quote: AI có thể trả về dấu ngoặc kép không escape.
    // Dùng Lookbehind (?<!\\)" để tìm dấu " chưa bị escape và tự escape nó thành \".
    const escapeSafe = (str) => {
      // Javascript không phải trình duyệt nào cũng hỗ trợ lookbehind mạnh,
      // dùng cách replace an toàn hơn:
      return str.replace(/\\"/g, '"').replace(/"/g, '\\"');
    };

    if (mapInfo.isArray) {
      // Chẻ đoạn văn lại thành mảng theo ký tự \n
      const lines = viText.split('\\n');
      finalOutput = "[\n";
      lines.forEach(line => {
        finalOutput += `\t\t"${escapeSafe(line)}"\n`;
      });
      finalOutput += "\t]";
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
        return `${key}: ${keysToReplace[key]}`;
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
