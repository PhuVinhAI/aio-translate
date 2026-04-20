import * as fs from 'fs';
import { PATHS } from '../../config/paths.config';
import { parseXMLToMap } from '../../utils/xml-parser';
import { backupFile } from '../../utils/backup';

function mergeTranslations(): void {
  console.log('\n=== [Terraria 4] Merge bản dịch ===');

  const translatedXml = PATHS.TERRARIA.TEMP_TRANSLATED;
  const enXml = PATHS.TERRARIA.TEMP_EN_XML;
  const mappingFile = PATHS.TERRARIA.MAPPING;
  const outputMergedXml = PATHS.TERRARIA.TEMP_MERGED;

  if (!fs.existsSync(enXml) || !fs.existsSync(mappingFile)) {
    console.error(`❌ Thiếu file en.xml hoặc mapping.json!`);
    process.exit(1);
  }

  backupFile(mappingFile);

  const enEntries = parseXMLToMap(fs.readFileSync(enXml, 'utf8'));
  const translatedEntries = fs.existsSync(translatedXml)
    ? parseXMLToMap(fs.readFileSync(translatedXml, 'utf8'))
    : new Map<string, string>();

  const mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));

  // Cập nhật mapping với bản dịch mới
  translatedEntries.forEach((translatedText, hash) => {
    if (mapping[hash]) {
      mapping[hash].translatedValue = translatedText;
    }
  });

  // Ghi lại mapping.json
  fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2), 'utf8');

  // Tạo file merged.xml chứa toàn bộ bản dịch (cũ + mới) để xuất bản
  let mergedXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<STBLKeyStringList>\n';

  let count = 0;
  enEntries.forEach((_text, hash) => {
    const translation = mapping[hash]?.translatedValue;
    if (translation) {
      mergedXml += `  <Text Key="${hash}">${translation}</Text>\n`;
      count++;
    }
  });

  mergedXml += '</STBLKeyStringList>';
  fs.writeFileSync(outputMergedXml, mergedXml, 'utf8');

  console.log(`✅ Đã merge và cập nhật mapping.json`);
  console.log(`✅ Đã tạo file merged.xml với ${count} câu đã dịch.`);
}

if (require.main === module) {
  mergeTranslations();
}

export { mergeTranslations };
