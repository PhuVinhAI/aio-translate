import * as fs from 'fs';
import { PATHS } from '../../config/paths.config';
import { parseXMLToMap } from '../../utils/xml-parser';
import { backupFile } from '../../utils/backup';
import { GdtMapping } from './language-pack';

function mergeTranslations(): void {
  console.log('\n=== [GDT 4] Merge translations ===');

  if (!fs.existsSync(PATHS.GDT.MAPPING)) {
    throw new Error('Missing mapping.json. Run gdt:import first.');
  }

  backupFile(PATHS.GDT.MAPPING);

  const translatedEntries = fs.existsSync(PATHS.GDT.TEMP_TRANSLATED)
    ? parseXMLToMap(fs.readFileSync(PATHS.GDT.TEMP_TRANSLATED, 'utf8'))
    : new Map<string, string>();

  const mapping = JSON.parse(fs.readFileSync(PATHS.GDT.MAPPING, 'utf8')) as GdtMapping;
  let updated = 0;

  translatedEntries.forEach((translatedText, key) => {
    if (mapping[key]) {
      mapping[key].translatedValue = translatedText;
      updated++;
    }
  });

  fs.writeFileSync(PATHS.GDT.MAPPING, JSON.stringify(mapping, null, 2), 'utf8');

  const totalTranslated = Object.values(mapping).filter(entry => entry.translatedValue).length;
  console.log(`Merged new translations: ${updated}`);
  console.log(`Total translated: ${totalTranslated}/${Object.keys(mapping).length}`);
}

if (require.main === module) {
  mergeTranslations();
}

export { mergeTranslations };
