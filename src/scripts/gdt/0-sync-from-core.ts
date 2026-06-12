import * as fs from 'fs';
import * as path from 'path';
import { PATHS } from '../../config/paths.config';
import { createEmptyVietnamesePack, ensureDir, formatLanguagePack } from './language-pack';

function findReferenceLanguageFile(): { file: string; lang: string } {
  const preferred = ['de', 'fr', 'es', 'ptbr'];
  for (const lang of preferred) {
    const file = path.join(PATHS.GDT.CORE_LANGUAGE_DIR, `${lang}.js`);
    if (fs.existsSync(file)) {
      return { file, lang };
    }
  }

  const fallback = fs.readdirSync(PATHS.GDT.CORE_LANGUAGE_DIR)
    .find(file => file.endsWith('.js') && file !== 'vi.js');
  if (!fallback) {
    throw new Error(`No reference language pack found in ${PATHS.GDT.CORE_LANGUAGE_DIR}`);
  }

  return {
    file: path.join(PATHS.GDT.CORE_LANGUAGE_DIR, fallback),
    lang: path.basename(fallback, '.js')
  };
}

function syncFromCore(): void {
  console.log('\n=== [GDT 0] Sync vi.js from gdt-core ===');

  if (!fs.existsSync(PATHS.GDT.CORE_LANGUAGE_DIR)) {
    throw new Error(`Missing GDT language directory: ${PATHS.GDT.CORE_LANGUAGE_DIR}`);
  }

  ensureDir(PATHS.GDT.INPUT_VI_JS);

  if (fs.existsSync(PATHS.GDT.CORE_VI_JS)) {
    fs.copyFileSync(PATHS.GDT.CORE_VI_JS, PATHS.GDT.INPUT_VI_JS);
    console.log(`Copied existing vi.js: ${PATHS.GDT.CORE_VI_JS}`);
    return;
  }

  const reference = findReferenceLanguageFile();
  const pack = createEmptyVietnamesePack(reference.file, reference.lang);
  fs.writeFileSync(PATHS.GDT.INPUT_VI_JS, formatLanguagePack('vi', pack), 'utf8');
  console.log(`Created new vi.js from ${reference.lang}.js with ${pack.values.length} entries.`);
  console.log(`Input file: ${PATHS.GDT.INPUT_VI_JS}`);
}

if (require.main === module) {
  syncFromCore();
}

export { syncFromCore };
