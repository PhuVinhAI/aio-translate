#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { PATHS } from '../../config/paths.config';
import { generateAgentBundle } from '../agent-mode/generate-agent-bundle';
import { continueFromAgent } from '../agent-mode/continue-from-agent';
import { minecraftTranslationConfig } from '../../config/minecraft-translation.config';

function runScript(scriptPath: string, description: string): boolean {
  console.log(`\n${'='.repeat(60)}\n▶️  ${description}\n${'='.repeat(60)}\n`);
  try {
    execSync(`ts-node "${scriptPath}"`, { stdio: 'inherit', cwd: PATHS.ROOT });
    return true;
  } catch (error) {
    console.error(`\n❌ ${description} - Lỗi`);
    return false;
  }
}

async function updateAgent(): Promise<void> {
  console.log('🛠️  Minecraft (Agent Mode) — pause trước khi gọi AI\n' + '='.repeat(60));

  runScript(path.join(PATHS.ROOT, 'src', 'scripts', 'minecraft', '0-extract-mods.ts'), '0. Extract Mods từ .jar');

  if (!fs.existsSync(PATHS.MINECRAFT.INPUT_JSON)) {
    console.error(`❌ File không tồn tại: ${PATHS.MINECRAFT.INPUT_JSON}`);
    console.error(`Lỗi khi extract mods. Vui lòng kiểm tra thư mục mods/`);
    process.exit(1);
  }

  runScript(path.join(PATHS.ROOT, 'src', 'scripts', 'minecraft', '1-import-json.ts'), '1. Import JSON → XML');
  runScript(path.join(PATHS.ROOT, 'src', 'scripts', 'minecraft', '2-detect-changes.ts'), '2. Phát hiện thay đổi');

  generateAgentBundle({
    workflowName: 'Minecraft Mods',
    workflowSlug: 'minecraft',
    config: minecraftTranslationConfig,
    newXmlPath: PATHS.MINECRAFT.TEMP_NEW,
    agentDir: PATHS.MINECRAFT.AGENT.DIR,
    sourceFormat: 'JSON namespace:key (resource pack)',
    finishCommand: 'npm run minecraft:agent-finish',
  });
}

async function finishAgent(): Promise<void> {
  console.log('🛠️  Minecraft (Agent Mode) — đóng gói lại\n' + '='.repeat(60));

  continueFromAgent({
    workflowName: 'Minecraft Mods',
    agentDir: PATHS.MINECRAFT.AGENT.DIR,
    expectedXmlPath: PATHS.MINECRAFT.TEMP_NEW,
    translatedXmlPath: PATHS.MINECRAFT.TEMP_TRANSLATED,
  });

  runScript(path.join(PATHS.ROOT, 'src', 'scripts', 'minecraft', '4-merge.ts'), '4. Merge bản dịch');
  runScript(path.join(PATHS.ROOT, 'src', 'scripts', 'minecraft', '5-export-resourcepack.ts'), '5. Xuất Resource Pack');

  console.log('\n🎉 HOÀN THÀNH MINECRAFT (AGENT MODE)!');
  console.log(`📁 Resource Pack: ${PATHS.MINECRAFT.OUTPUT_DIR}`);
}

const mode = process.argv[2] ?? 'update';
if (mode === 'finish') {
  finishAgent().catch(err => {
    console.error(err);
    process.exit(1);
  });
} else {
  updateAgent().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
