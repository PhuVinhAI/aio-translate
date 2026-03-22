import path from 'path';
import dotenv from 'dotenv';
import { PATHS } from '../../config/paths.config';
import { ftbquestsTranslationConfig } from '../../config/ftbquests-translation.config';
import { runTranslation, TranslationContext } from '../translate-core';

dotenv.config();

async function translate(): Promise<void> {
  console.log('\n=== [FTB Quests 3] Dịch tự động AI ===\n');

  const ctx: TranslationContext = {
    config: ftbquestsTranslationConfig,
    progressFile: path.join(PATHS.TEMP.DIR, 'ftbquests-progress.json'),
    inputFile: PATHS.FTBQUESTS.TEMP_NEW,
    outputFile: PATHS.FTBQUESTS.TEMP_TRANSLATED,
    tempDir: path.join(PATHS.TEMP.DIR, 'temp-batches-ftbquests'),
    modeName: 'FTB Quests (Anh → Việt)'
  };

  await runTranslation(ctx);
}

if (require.main === module) {
  translate().catch(console.error);
}

export { translate };
