const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PATHS = require('../../config/paths.config');
const { escapeXml } = require('../utils/xml-parser');
const { backupFile } = require('../utils/backup');

function generateHashKey(originalKey) {
  return crypto.createHash('md5').update(originalKey).digest('hex').substring(0, 12).toUpperCase();
}

function importMinecraftJson() {
  const inputJson = PATHS.MINECRAFT.INPUT_JSON;
  const outputXml = PATHS.MINECRAFT.TEMP_EN_XML;
  const mappingFile = PATHS.MINECRAFT.MAPPING;
  const reverseMappingFile = PATHS.MINECRAFT.REVERSE_MAPPING;

  console.log('\n=== [Minecraft 1] Import JSON → XML ===');

  if (!fs.existsSync(inputJson)) {
    console.error(`❌ File không tồn tại: ${inputJson}`);
    process.exit(1);
  }

  backupFile(outputXml, path.dirname(outputXml));
  backupFile(mappingFile, path.dirname(mappingFile));

  const content = fs.readFileSync(inputJson, 'utf8');
  const modData = JSON.parse(content);

  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  xml += '<STBLKeyStringList>\n';

  const mapping = {};
  const reverseMapping = {};
  let count = 0;

  // input là dạng { "modId": { "key": "value" } }
  for (const [modId, keysDict] of Object.entries(modData)) {
    for (const [originalKey, textVal] of Object.entries(keysDict)) {
      if (textVal === null || textVal === "") continue;

      // Gộp modId và key để tạo hash duy nhất, tránh trùng lặp key giữa các mod
      const combinedKey = `${modId}|||${originalKey}`;
      const hashKey = generateHashKey(combinedKey);

      xml += `  <Text Key="${hashKey}">${escapeXml(String(textVal))}</Text>\n`;

      mapping[hashKey] = {
        modId,
        originalKey,
        text: textVal
      };
      reverseMapping[hashKey] = combinedKey;
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
  importMinecraftJson();
}