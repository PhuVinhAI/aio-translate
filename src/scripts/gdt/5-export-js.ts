import * as fs from 'fs';
import { PATHS } from '../../config/paths.config';
import {
  ensureDir,
  formatLanguagePack,
  GdtLanguagePack,
  GdtMapping,
  makeEntryKeys,
  readLanguagePack
} from './language-pack';

function exportGdt(): void {
  console.log('\n=== [GDT 5] Export vi.js ===');

  if (!fs.existsSync(PATHS.GDT.INPUT_VI_JS)) {
    throw new Error(`Missing input file: ${PATHS.GDT.INPUT_VI_JS}`);
  }
  if (!fs.existsSync(PATHS.GDT.MAPPING)) {
    throw new Error('Missing mapping.json. Run gdt:import first.');
  }

  const inputPack = readLanguagePack(PATHS.GDT.INPUT_VI_JS, 'vi');
  const mapping = JSON.parse(fs.readFileSync(PATHS.GDT.MAPPING, 'utf8')) as GdtMapping;
  const keys = makeEntryKeys(inputPack.values);

  let translated = 0;
  const outputPack: GdtLanguagePack = {
    values: inputPack.values.map((entry, index) => {
      const key = keys[index];
      const mapped = mapping[key];
      const translation = mapped?.translatedValue || entry.translation || '';
      if (translation) {
        translated++;
      }

      const outputEntry = {
        value: entry.value,
        translation
      };

      if (Object.prototype.hasOwnProperty.call(entry, 'comment')) {
        return { ...outputEntry, comment: entry.comment };
      }

      return outputEntry;
    })
  };

  ensureDir(PATHS.GDT.OUTPUT_VI_JS);
  fs.writeFileSync(PATHS.GDT.OUTPUT_VI_JS, formatLanguagePack('vi', outputPack), 'utf8');

  console.log(`Exported ${translated}/${outputPack.values.length} translated entries.`);
  console.log(`Output file: ${PATHS.GDT.OUTPUT_VI_JS}`);
}

if (require.main === module) {
  exportGdt();
}

export { exportGdt };
