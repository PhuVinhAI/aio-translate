import * as path from 'path';
import { PATHS } from '../../config/paths.config';
import { terrariaTranslationConfig } from '../../config/terraria-translation.config';
import { runTranslation, TranslationContext } from '../translate-core';

async function translate(): Promise<void> {
  const ctx: TranslationContext = {
    config: terrariaTranslationConfig,
    progressFile: path.join(PATHS.TEMP.DIR, 'terraria', 'progress.json'),
    inputFile: PATHS.TERRARIA.TEMP_NEW,
    outputFile: PATHS.TERRARIA.TEMP_TRANSLATED,
    tempDir: path.join(PATHS.TEMP.DIR, 'terraria', 'batches'),
    modeName: 'Terraria Mods'
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
