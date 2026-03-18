const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PATHS = require('../../config/paths.config');
const { escapeXml } = require('../utils/xml-parser');
const { backupFile } = require('../utils/backup');

function generateHashKey(originalKey) {
  return crypto.createHash('md5').update(originalKey).digest('hex').substring(0, 12).toUpperCase();
}

function importSkyverseTxt() {
  const inputTxt = PATHS.SKYVERSE.INPUT_TXT;
  const outputXml = PATHS.SKYVERSE.TEMP_EN_XML;
  const mappingFile = PATHS.SKYVERSE.MAPPING;
  const reverseMappingFile = PATHS.SKYVERSE.REVERSE_MAPPING;
  
  console.log('\n=== [Skyverse 1] Import TXT → XML ===');
  
  if (!fs.existsSync(inputTxt)) {
    console.error(`❌ File không tồn tại: ${inputTxt}`);
    process.exit(1);
  }
  
  backupFile(outputXml, path.dirname(outputXml));
  backupFile(mappingFile, path.dirname(mappingFile));
  
  const content = fs.readFileSync(inputTxt, 'utf8');
  const lines = content.split('\n');
  
  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  xml += '<STBLKeyStringList>\n';
  
  const mapping = {};
  const reverseMapping = {};
  let count = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('[~') || line.startsWith('//')) continue;
    
    const eqIdx = line.indexOf('=');
    if (eqIdx > 0) {
      const originalKey = line.substring(0, eqIdx).trim();
      const textVal = line.substring(eqIdx + 1).trim();
      
      if (!originalKey) continue;
      
      const hashKey = generateHashKey(originalKey);
      
      xml += `  <Text Key="${hashKey}">${escapeXml(textVal)}</Text>\n`;
      
      mapping[hashKey] = {
        originalKey,
        text: textVal
      };
      reverseMapping[hashKey] = originalKey;
      count++;
    }
  }
  
  xml += '</STBLKeyStringList>';
  
  if (!fs.existsSync(path.dirname(outputXml))) fs.mkdirSync(path.dirname(outputXml), { recursive: true });
  
  fs.writeFileSync(outputXml, xml, 'utf8');
  fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2), 'utf8');
  fs.writeFileSync(reverseMappingFile, JSON.stringify(reverseMapping, null, 2), 'utf8');
  
  console.log(`✅ Đã tạo XML: ${count} entries`);
  console.log(`✅ Đã lưu Mapping files.`);
}

if (require.main === module) {
  importSkyverseTxt();
}
