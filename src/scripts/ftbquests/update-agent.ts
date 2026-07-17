#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { PATHS } from '../../config/paths.config';
import { generateAgentBundle } from '../agent-mode/generate-agent-bundle';
import { continueFromAgent } from '../agent-mode/continue-from-agent';
import { ftbquestsTranslationConfig } from '../../config/ftbquests-translation.config';

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
  console.log('📋 FTB Quests (Agent Mode) — pause trước khi gọi AI\n' + '='.repeat(60));

  if (!fs.existsSync(PATHS.FTBQUESTS.INPUT_DIR)) {
    console.error(`❌ Thư mục input không tồn tại: ${PATHS.FTBQUESTS.INPUT_DIR}`);
    process.exit(1);
  }

  runScript(path.join(PATHS.ROOT, 'src', 'scripts', 'ftbquests', '1-import-snbt.ts'), '1. Import SNBT → XML');
  runScript(path.join(PATHS.ROOT, 'src', 'scripts', 'ftbquests', '2-detect-changes.ts'), '2. Phát hiện thay đổi');

  generateAgentBundle({
    workflowName: 'FTB Quests',
    workflowSlug: 'ftbquests',
    config: ftbquestsTranslationConfig,
    newXmlPath: PATHS.FTBQUESTS.TEMP_NEW,
    agentDir: PATHS.FTBQUESTS.AGENT.DIR,
    sourceFormat: 'SNBT (FTB Quests)',
    finishCommand: 'npm run ftbquests:agent-finish',
  });
}

async function finishAgent(): Promise<void> {
  console.log('📋 FTB Quests (Agent Mode) — đóng gói lại\n' + '='.repeat(60));

  continueFromAgent({
    workflowName: 'FTB Quests',
    agentDir: PATHS.FTBQUESTS.AGENT.DIR,
    expectedXmlPath: PATHS.FTBQUESTS.TEMP_NEW,
    translatedXmlPath: PATHS.FTBQUESTS.TEMP_TRANSLATED,
  });

  runScript(path.join(PATHS.ROOT, 'src', 'scripts', 'ftbquests', '4-merge.ts'), '4. Merge bản dịch');
  runScript(path.join(PATHS.ROOT, 'src', 'scripts', 'ftbquests', '5-export-snbt.ts'), '5. Xuất SNBT vi_vn');

  console.log('\n🎉 HOÀN THÀNH FTB QUESTS (AGENT MODE)!');
  console.log(`📁 Kết quả: ${PATHS.FTBQUESTS.OUTPUT_DIR}`);
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
