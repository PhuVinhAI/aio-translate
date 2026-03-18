const fs = require('fs');
const path = require('path');
const PATHS = require('../../config/paths.config');
const { parseXMLToMap } = require('../utils/xml-parser');
const crypto = require('crypto');

function generateHashKey(originalKey) {
  return crypto.createHash('md5').update(originalKey).digest('hex').substring(0, 12).toUpperCase();
}

function mergeTranslations() {
  console.log('\n=== [Skyverse 4] Merge bản dịch ===');
  
  const enXml = PATHS.SKYVERSE.TEMP_EN_XML;
  const viOldTxt = PATHS.SKYVERSE.OUTPUT_TXT;
  const viNewXml = PATHS.SKYVERSE.TEMP_TRANSLATED;
  const outputXml = PATHS.SKYVERSE.TEMP_MERGED;
  
  if (!fs.existsSync(enXml)) process.exit(1);
  
  const enEntries = parseXMLToMap(fs.readFileSync(enXml, 'utf8'));
  const translationMap = new Map();
  
  if (fs.existsSync(viOldTxt)) {
    const lines = fs.readFileSync(viOldTxt, 'utf8').split('\n');
    for (const line of lines) {
      const eqIdx = line.indexOf('=');
      if (eqIdx > 0 && !line.startsWith('[')) {
        const originalKey = line.substring(0, eqIdx).trim();
        const textVal = line.substring(eqIdx + 1).trim();
        translationMap.set(generateHashKey(originalKey), textVal);
      }
    }
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
