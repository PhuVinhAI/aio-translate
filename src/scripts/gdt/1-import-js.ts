import * as fs from 'fs';
import { PATHS } from '../../config/paths.config';
import { escapeXml } from '../../utils/xml-parser';
import { ensureDir, GdtMapping, GdtMappingEntry, makeEntryKeys, readLanguagePack } from './language-pack';

function importGdt(): void {
  console.log('\n=== [GDT 1] Import vi.js to XML ===');

  if (!fs.existsSync(PATHS.GDT.INPUT_VI_JS)) {
    throw new Error(`Missing input file: ${PATHS.GDT.INPUT_VI_JS}. Run gdt:sync-from-core first.`);
  }

  const oldMapping: GdtMapping = fs.existsSync(PATHS.GDT.MAPPING)
    ? JSON.parse(fs.readFileSync(PATHS.GDT.MAPPING, 'utf8'))
    : {};

  const pack = readLanguagePack(PATHS.GDT.INPUT_VI_JS, 'vi');
  const keys = makeEntryKeys(pack.values);
  const mapping: GdtMapping = {};
  let reused = 0;
  let existingTranslations = 0;

  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<STBLKeyStringList>\n';

  pack.values.forEach((entry, index) => {
    const key = keys[index];
    const prev = oldMapping[key];
    const mappingEntry: GdtMappingEntry = {
      key,
      originalValue: entry.value,
      index
    };

    if (Object.prototype.hasOwnProperty.call(entry, 'comment')) {
      mappingEntry.comment = entry.comment;
    }

    if (entry.translation && entry.translation.trim()) {
      mappingEntry.translatedValue = entry.translation;
      existingTranslations++;
    } else if (
      prev &&
      prev.originalValue === entry.value &&
      (prev.comment || '') === (entry.comment || '') &&
      prev.translatedValue
    ) {
      mappingEntry.translatedValue = prev.translatedValue;
      reused++;
    }

    mapping[key] = mappingEntry;
    xml += `  <Text Key="${key}">${escapeXml(entry.value)}</Text>\n`;
  });

  xml += '</STBLKeyStringList>';

  ensureDir(PATHS.GDT.TEMP_EN_XML);
  ensureDir(PATHS.GDT.MAPPING);
  fs.writeFileSync(PATHS.GDT.TEMP_EN_XML, xml, 'utf8');
  fs.writeFileSync(PATHS.GDT.MAPPING, JSON.stringify(mapping, null, 2), 'utf8');

  console.log(`Imported ${pack.values.length} entries.`);
  console.log(`Existing translations in vi.js: ${existingTranslations}`);
  console.log(`Reused translations from mapping: ${reused}`);
}

if (require.main === module) {
  importGdt();
}

export { importGdt };
