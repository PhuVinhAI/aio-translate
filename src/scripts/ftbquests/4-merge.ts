import fs from 'fs';
import { PATHS } from '../../config/paths.config';
import { parseXMLToMap } from '../../utils/xml-parser';

function mergeTranslations(): void {
  console.log('\n=== [FTB Quests 4] Merge bản dịch ===');

  const enXml = PATHS.FTBQUESTS.TEMP_EN_XML;
  const viOldXml = PATHS.FTBQUESTS.TEMP_MERGED;
  const viNewXml = PATHS.FTBQUESTS.TEMP_TRANSLATED;
  const outputXml = PATHS.FTBQUESTS.TEMP_MERGED;

  if (!fs.existsSync(enXml)) {
    console.error('❌ File XML nguồn không tồn tại');
    process.exit(1);
  }

  const enEntries = parseXMLToMap(fs.readFileSync(enXml, 'utf8'));
  const translationMap = new Map<string, string>();

  if (fs.existsSync(viOldXml)) {
    const viOldEntries = parseXMLToMap(fs.readFileSync(viOldXml, 'utf8'));
    viOldEntries.forEach((value: string, key: string) => translationMap.set(key, value));
  }

  if (fs.existsSync(viNewXml)) {
    const viNewEntries = parseXMLToMap(fs.readFileSync(viNewXml, 'utf8'));
    viNewEntries.forEach((value: string, key: string) => translationMap.set(key, value));
  }

  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<STBLKeyStringList>\n';
  let translated = 0;

  enEntries.forEach((enValue: string, key: string) => {
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

export { mergeTranslations };
