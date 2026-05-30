import * as path from 'path';
import { PATHS } from '../../config/paths.config';
import { paralivesTranslationConfig } from '../../config/paralives-translation.config';
import { runTranslation, TranslationContext } from '../translate-core';

async function translate(): Promise<void> {
  const ctx: TranslationContext = {
    config: paralivesTranslationConfig,
    progressFile: path.join(PATHS.TEMP.DIR, 'paralives', 'progress.json'),
    inputFile: PATHS.PARALIVES.TEMP_NEW,
    outputFile: PATHS.PARALIVES.TEMP_TRANSLATED,
    tempDir: path.join(PATHS.TEMP.DIR, 'paralives', 'batches'),
    modeName: 'Paralives (TSV)'
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
