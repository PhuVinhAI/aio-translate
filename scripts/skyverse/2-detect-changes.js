const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PATHS = require('../../config/paths.config');
const { parseXMLToMap } = require('../utils/xml-parser');

function generateHashKey(originalKey) {
  return crypto.createHash('md5').update(originalKey).digest('hex').substring(0, 12).toUpperCase();
}

function detectChanges() {
  console.log('\n=== [Skyverse 2] Phát hiện thay đổi ===');
  
  const enXmlFile = PATHS.SKYVERSE.TEMP_EN_XML;
  const oldViTxtFile = PATHS.SKYVERSE.OUTPUT_TXT;
  const outputFile = PATHS.SKYVERSE.TEMP_NEW;
  
  if (!fs.existsSync(enXmlFile)) {
    console.error(`❌ File XML nguồn chưa được tạo. Chạy bước 1 trước.`);
    process.exit(1);
  }
  
  const enXml = fs.readFileSync(enXmlFile, 'utf8');
  const enEntries = parseXMLToMap(enXml);
  
  const oldEntries = new Map();
  if (fs.existsSync(oldViTxtFile)) {
    const lines = fs.readFileSync(oldViTxtFile, 'utf8').split('\n');
    for (const line of lines) {
      const eqIdx = line.indexOf('=');
      if (eqIdx > 0 && !line.startsWith('[')) {
        const originalKey = line.substring(0, eqIdx).trim();
        const hashKey = generateHashKey(originalKey);
        oldEntries.set(hashKey, true);
      }
    }
    console.log(`✅ Tìm thấy bản dịch cũ: ${oldEntries.size} keys.`);
  } else {
    console.log(`ℹ️  Không tìm thấy bản dịch cũ, sẽ dịch toàn bộ.`);
  }
  
  const newContent = [];
  enEntries.forEach((value, key) => {
    if (!oldEntries.has(key)) {
      newContent.push({ key, value });
    }
  });
  
  console.log(`📊 Cần dịch: ${newContent.length} entries`);
  
  if (newContent.length === 0) {
    fs.writeFileSync(outputFile, '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<STBLKeyStringList>\n</STBLKeyStringList>', 'utf8');
    return;
  }
  
  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<STBLKeyStringList>\n';
  newContent.forEach(e => {
    xml += `  <Text Key="${e.key}">${e.value}</Text>\n`;
  });
  xml += '</STBLKeyStringList>';
  
  fs.writeFileSync(outputFile, xml, 'utf8');
  console.log(`✅ Đã xuất các file cần dịch ra: ${outputFile}`);
}

if (require.main === module) {
  detectChanges();
}
