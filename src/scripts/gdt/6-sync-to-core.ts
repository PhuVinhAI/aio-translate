import * as fs from 'fs';
import { execSync } from 'child_process';
import { PATHS } from '../../config/paths.config';
import { ensureDir } from './language-pack';

function updateManifest(): void {
  if (!fs.existsSync(PATHS.GDT.CORE_MANIFEST)) {
    throw new Error(`Missing GDT manifest: ${PATHS.GDT.CORE_MANIFEST}`);
  }

  const manifest = JSON.parse(fs.readFileSync(PATHS.GDT.CORE_MANIFEST, 'utf8')) as string[];
  if (!Array.isArray(manifest) || manifest.some(entry => typeof entry !== 'string')) {
    throw new Error('GDT language manifest must be an array of language codes.');
  }

  if (!manifest.includes('vi')) {
    manifest.push('vi');
    manifest.sort();
    fs.writeFileSync(PATHS.GDT.CORE_MANIFEST, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    console.log('Added vi to GDT i18n manifest.');
  } else {
    console.log('GDT i18n manifest already contains vi.');
  }
}

function syncToCore(): void {
  console.log('\n=== [GDT 6] Sync vi.js to gdt-core ===');

  if (!fs.existsSync(PATHS.GDT.OUTPUT_VI_JS)) {
    throw new Error(`Missing output file: ${PATHS.GDT.OUTPUT_VI_JS}. Run gdt:export first.`);
  }

  ensureDir(PATHS.GDT.CORE_VI_JS);
  fs.copyFileSync(PATHS.GDT.OUTPUT_VI_JS, PATHS.GDT.CORE_VI_JS);
  console.log(`Copied vi.js to: ${PATHS.GDT.CORE_VI_JS}`);

  updateManifest();

  execSync('npm run build:i18n', {
    cwd: PATHS.GDT.CORE_ROOT,
    stdio: 'inherit'
  });
}

if (require.main === module) {
  syncToCore();
}

export { syncToCore };
