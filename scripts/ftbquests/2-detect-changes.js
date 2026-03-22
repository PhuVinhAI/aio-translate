const fs = require('fs');
const path = require('path');
const PATHS = require('../../config/paths.config');
const { parseXMLToMap } = require('../utils/xml-parser');

function detectChanges() {
  console.log('\n=== [FTB Quests 2] Phát hiện thay đổi ===');

  const enXmlFile = PATHS.FTBQUESTS.TEMP_EN_XML;
  const mergedXmlFile = PATHS.FTBQUESTS.TEMP_MERGED;
  const outputFile = PATHS.FTBQUESTS.TEMP_NEW;

  if (!fs.existsSync(enXmlFile)) {
    console.error(`❌ File XML nguồn chưa được tạo. Chạy bước 1 trước.`);
    process.exit(1);
  }

  const enXml = fs.readFileSync(enXmlFile, 'utf8');
  const enEntries = parseXMLToMap(enXml);

  const oldEntries = new Map();
  if (fs.existsSync(mergedXmlFile)) {
    const oldXml = fs.readFileSync(mergedXmlFile, 'utf8');
    const parsedOld = parseXMLToMap(oldXml);
    parsedOld.forEach((val, key) => oldEntries.set(key, val));
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

module.exports = { detectChanges };
