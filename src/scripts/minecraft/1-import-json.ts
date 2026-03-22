import fs from 'fs';
import path from 'path';
import { PATHS } from '../../config/paths.config';
import { escapeXml } from '../../utils/xml-parser';
import { backupFile } from '../../utils/backup';
import { generateHashKey } from '../../utils/hash';
import { ModLanguageData, TranslationMapping } from '../../types';

interface MappingEntry {
  modId: string;
  originalKey: string;
  text: string;
}

function importMinecraftJson(): void {
  const inputJson = PATHS.MINECRAFT.INPUT_JSON;
  const outputXml = PATHS.MINECRAFT.TEMP_EN_XML;
  const mappingFile = PATHS.MINECRAFT.MAPPING;
  const reverseMappingFile = PATHS.MINECRAFT.REVERSE_MAPPING;

  console.log('\n=== [Minecraft 1] Import JSON → XML ===');

  if (!fs.existsSync(inputJson)) {
    console.error(`❌ File không tồn tại: ${inputJson}`);
    process.exit(1);
  }

  backupFile(outputXml);
  backupFile(mappingFile);

  const content = fs.readFileSync(inputJson, 'utf8');
  const modData = JSON.parse(content) as ModLanguageData;

  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  xml += '<STBLKeyStringList>\n';

  const mapping: Record<string, MappingEntry> = {};
  const reverseMapping: Record<string, string> = {};
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

  if (!fs.existsSync(path.dirname(outputXml))) {
    fs.mkdirSync(path.dirname(outputXml), { recursive: true });
  }

  fs.writeFileSync(outputXml, xml, 'utf8');
  fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2), 'utf8');
  fs.writeFileSync(reverseMappingFile, JSON.stringify(reverseMapping, null, 2), 'utf8');

  console.log(`✅ Đã tạo XML: ${count} entries`);
  console.log(`✅ Đã lưu Mapping files.`);
}

if (require.main === module) {
  importMinecraftJson();
}

export { importMinecraftJson };
