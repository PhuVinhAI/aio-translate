#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { PATHS } from '../../config/paths.config';
import { generateAgentBundle } from '../agent-mode/generate-agent-bundle';
import { continueFromAgent } from '../agent-mode/continue-from-agent';
import { terrariaTranslationConfig } from '../../config/terraria-translation.config';

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
  console.log('🌳 Terraria Mods (Agent Mode) — pause trước khi gọi AI\n' + '='.repeat(60));

  if (!fs.existsSync(PATHS.TERRARIA.INPUT_DIR)) {
    console.log(`📁 Tạo thư mục input: ${PATHS.TERRARIA.INPUT_DIR}`);
    fs.mkdirSync(PATHS.TERRARIA.INPUT_DIR, { recursive: true });
  }

  runScript(path.join(PATHS.ROOT, 'src', 'scripts', 'terraria', '1-import-hjson.ts'), '1. Import HJSON → XML');
  runScript(path.join(PATHS.ROOT, 'src', 'scripts', 'terraria', '2-detect-changes.ts'), '2. Phát hiện thay đổi');

  generateAgentBundle({
    workflowName: 'Terraria Mods',
    workflowSlug: 'terraria',
    config: terrariaTranslationConfig,
    newXmlPath: PATHS.TERRARIA.TEMP_NEW,
    agentDir: PATHS.TERRARIA.AGENT.DIR,
    sourceFormat: 'HJSON / JSON (tModLoader mods)',
    finishCommand: 'npm run terraria:agent-finish',
  });
}

async function finishAgent(): Promise<void> {
  console.log('🌳 Terraria Mods (Agent Mode) — đóng gói lại\n' + '='.repeat(60));

  continueFromAgent({
    workflowName: 'Terraria Mods',
    agentDir: PATHS.TERRARIA.AGENT.DIR,
    expectedXmlPath: PATHS.TERRARIA.TEMP_NEW,
    translatedXmlPath: PATHS.TERRARIA.TEMP_TRANSLATED,
  });

  runScript(path.join(PATHS.ROOT, 'src', 'scripts', 'terraria', '4-merge.ts'), '4. Merge bản dịch');
  runScript(path.join(PATHS.ROOT, 'src', 'scripts', 'terraria', '5-export-hjson.ts'), '5. Xuất mod việt hóa');

  console.log('\n🎉 HOÀN THÀNH TERRARIA (AGENT MODE)!');
  console.log(`📁 Kết quả: ${PATHS.TERRARIA.OUTPUT_DIR}`);
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
