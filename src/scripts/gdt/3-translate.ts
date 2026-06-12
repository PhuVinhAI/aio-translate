import * as path from 'path';
import { PATHS } from '../../config/paths.config';
import { gdtTranslationConfig } from '../../config/gdt-translation.config';
import { runTranslation, TranslationContext } from '../translate-core';

async function translate(): Promise<void> {
  const ctx: TranslationContext = {
    config: gdtTranslationConfig,
    progressFile: path.join(PATHS.TEMP.DIR, 'gdt', 'progress.json'),
    inputFile: PATHS.GDT.TEMP_NEW,
    outputFile: PATHS.GDT.TEMP_TRANSLATED,
    tempDir: path.join(PATHS.TEMP.DIR, 'gdt', 'batches'),
    modeName: 'Game Dev Tycoon'
  };

  await runTranslation(ctx);
}

if (require.main === module) {
  translate().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

export { translate };
