const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PATHS = require('../../config/paths.config');
const { unescapeXml, parseXMLToMap } = require('../utils/xml-parser');

function generateHashKey(originalKey) {
  return crypto.createHash('md5').update(originalKey).digest('hex').substring(0, 12).toUpperCase();
}

function exportTxt() {
  console.log('\n=== [Skyverse 5] Xuất TXT ===');
  
  const inputTxt = PATHS.SKYVERSE.INPUT_TXT;
  const mergedXml = PATHS.SKYVERSE.TEMP_MERGED;
  const outputTxt = PATHS.SKYVERSE.OUTPUT_TXT;
  
  if (!fs.existsSync(inputTxt) || !fs.existsSync(mergedXml)) process.exit(1);
  
  const translatedEntries = parseXMLToMap(fs.readFileSync(mergedXml, 'utf8'));
  const inLines = fs.readFileSync(inputTxt, 'utf8').split('\n');
  
  const outLines = [];
  let replaced = 0;
  
  for (const line of inLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('[~') || trimmed.startsWith('//')) {
      outLines.push(line);
      continue;
    }
    
    const eqIdx = line.indexOf('=');
    if (eqIdx > 0) {
      const key = line.substring(0, eqIdx).trim();
      const hashKey = generateHashKey(key);
      
      if (translatedEntries.has(hashKey)) {
        const viText = unescapeXml(translatedEntries.get(hashKey));
        outLines.push(`${key}=${viText}`);
        replaced++;
      } else {
        outLines.push(line);
      }
    } else {
      outLines.push(line);
    }
  }
  
  if (!fs.existsSync(path.dirname(outputTxt))) fs.mkdirSync(path.dirname(outputTxt), { recursive: true });
  
  fs.writeFileSync(outputTxt, outLines.join('\n'), 'utf8');
  console.log(`✅ Đã xuất file thành công: ${outputTxt}`);
  console.log(`✅ Đã áp dụng ${replaced} bản dịch.`);
}

if (require.main === module) {
  exportTxt();
}
