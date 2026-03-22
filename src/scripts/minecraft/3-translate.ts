import path from 'path';
import dotenv from 'dotenv';
import { PATHS } from '../../config/paths.config';
import { minecraftTranslationConfig } from '../../config/minecraft-translation.config';
import { runTranslation, TranslationContext } from '../translate-core';

dotenv.config();

async function translate(): Promise<void> {
  console.log('\n=== [Minecraft 3] Dịch tự động AI ===\n');

  const ctx: TranslationContext = {
    config: minecraftTranslationConfig,
    progressFile: path.join(PATHS.TEMP.DIR, 'minecraft', 'progress.json'),
    inputFile: PATHS.MINECRAFT.TEMP_NEW,
    outputFile: PATHS.MINECRAFT.TEMP_TRANSLATED,
    tempDir: path.join(PATHS.TEMP.DIR, 'minecraft', 'batches'),
    modeName: 'Minecraft Mods (Anh → Việt)'
  };

  await runTranslation(ctx);
}

if (require.main === module) {
  translate().catch(console.error);
}

export { translate };
