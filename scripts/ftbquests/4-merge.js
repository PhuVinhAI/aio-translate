const fs = require('fs');
const path = require('path');
const PATHS = require('../../config/paths.config');
const { parseXMLToMap } = require('../utils/xml-parser');

function mergeTranslations() {
  console.log('\n=== [FTB Quests 4] Merge bản dịch ===');

  const enXml = PATHS.FTBQUESTS.TEMP_EN_XML;
  const viOldXml = PATHS.FTBQUESTS.TEMP_MERGED;
  const viNewXml = PATHS.FTBQUESTS.TEMP_TRANSLATED;
  const outputXml = PATHS.FTBQUESTS.TEMP_MERGED;

  if (!fs.existsSync(enXml)) process.exit(1);

  const enEntries = parseXMLToMap(fs.readFileSync(enXml, 'utf8'));
  const translationMap = new Map();

  if (fs.existsSync(viOldXml)) {
    const viOldEntries = parseXMLToMap(fs.readFileSync(viOldXml, 'utf8'));
    viOldEntries.forEach((value, key) => translationMap.set(key, value));
  }

  if (fs.existsSync(viNewXml)) {
    const viNewEntries = parseXMLToMap(fs.readFileSync(viNewXml, 'utf8'));
    viNewEntries.forEach((value, key) => translationMap.set(key, value));
  }

  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<STBLKeyStringList>\n';
  let translated = 0;

  enEntries.forEach((enValue, key) => {
    if (translationMap.has(key)) {
      xml += `  <Text Key="${key}">${translationMap.get(key)}</Text>\n`;
      translated++;
    } else {
      xml += `  <Text Key="${key}">${enValue}</Text>\n`;
    }
  });

  xml += '</STBLKeyStringList>';
  fs.writeFileSync(outputXml, xml, 'utf8');

  console.log(`✅ Đã merge: ${translated}/${enEntries.size} entries.`);
}

if (require.main === module) {
  mergeTranslations();
}

module.exports = { mergeTranslations };
