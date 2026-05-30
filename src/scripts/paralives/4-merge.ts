import * as fs from 'fs';
import { PATHS } from '../../config/paths.config';
import { parseXMLToMap } from '../../utils/xml-parser';
import { backupFile } from '../../utils/backup';

function mergeTranslations(): void {
  console.log('\n=== [Paralives 4] Merge bản dịch ===');

  const translatedXml = PATHS.PARALIVES.TEMP_TRANSLATED;
  const mappingFile = PATHS.PARALIVES.MAPPING;

  if (!fs.existsSync(mappingFile)) {
    console.error(`❌ Thiếu file mapping.json!`);
    process.exit(1);
  }

  backupFile(mappingFile);

  const translatedEntries = fs.existsSync(translatedXml)
    ? parseXMLToMap(fs.readFileSync(translatedXml, 'utf8'))
    : new Map<string, string>();

  const mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));

  // Cập nhật mapping với bản dịch mới (key = GUID)
  let updated = 0;
  translatedEntries.forEach((translatedText, guid) => {
    if (mapping[guid]) {
      mapping[guid].translatedValue = translatedText;
      updated++;
    }
  });

  fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2), 'utf8');

  const totalTranslated = Object.values(mapping).filter((m: any) => m.translatedValue).length;
  console.log(`✅ Đã cập nhật ${updated} bản dịch mới vào mapping.json`);
  console.log(`✅ Tổng số câu đã có bản dịch: ${totalTranslated}`);
}

if (require.main === module) {
  mergeTranslations();
}

export { mergeTranslations };
