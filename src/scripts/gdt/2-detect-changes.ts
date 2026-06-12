import * as fs from 'fs';
import { PATHS } from '../../config/paths.config';
import { parseXMLToMap, escapeXml } from '../../utils/xml-parser';
import { ensureDir, GdtMapping } from './language-pack';

function detectChanges(): void {
  console.log('\n=== [GDT 2] Detect untranslated entries ===');

  if (!fs.existsSync(PATHS.GDT.TEMP_EN_XML) || !fs.existsSync(PATHS.GDT.MAPPING)) {
    throw new Error('Missing en.xml or mapping.json. Run gdt:import first.');
  }

  const enEntries = parseXMLToMap(fs.readFileSync(PATHS.GDT.TEMP_EN_XML, 'utf8'));
  const mapping = JSON.parse(fs.readFileSync(PATHS.GDT.MAPPING, 'utf8')) as GdtMapping;

  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<STBLKeyStringList>\n';
  let count = 0;

  enEntries.forEach((text, key) => {
    const entry = mapping[key];
    if (!entry || !entry.translatedValue) {
      if (entry?.comment) {
        xml += `  <!-- Comment: ${escapeXml(entry.comment)} -->\n`;
      }
      xml += `  <Text Key="${key}">${escapeXml(text)}</Text>\n`;
      count++;
    }
  });

  xml += '</STBLKeyStringList>';

  ensureDir(PATHS.GDT.TEMP_NEW);
  fs.writeFileSync(PATHS.GDT.TEMP_NEW, xml, 'utf8');

  console.log(`Need translation: ${count}/${enEntries.size} entries.`);
  console.log(`New XML: ${PATHS.GDT.TEMP_NEW}`);
}

if (require.main === module) {
  detectChanges();
}

export { detectChanges };
