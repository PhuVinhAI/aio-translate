#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { PATHS } from '../../config/paths.config';
import { generateAgentBundle } from '../agent-mode/generate-agent-bundle';
import { continueFromAgent } from '../agent-mode/continue-from-agent';
import { paralivesTranslationConfig } from '../../config/paralives-translation.config';

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
  console.log('🏡 Paralives (TSV) (Agent Mode) — pause trước khi gọi AI\n' + '='.repeat(60));

  if (!fs.existsSync(PATHS.PARALIVES.INPUT_DIR)) {
    console.log(`📁 Tạo thư mục input: ${PATHS.PARALIVES.INPUT_DIR}`);
    fs.mkdirSync(PATHS.PARALIVES.INPUT_DIR, { recursive: true });
  }

  const dir = path.join(PATHS.ROOT, 'src', 'scripts', 'paralives');
  runScript(path.join(dir, '1-import-tsv.ts'), '1. Import TSV → XML');
  runScript(path.join(dir, '2-detect-changes.ts'), '2. Phát hiện thay đổi');

  generateAgentBundle({
    workflowName: 'Paralives (TSV)',
    workflowSlug: 'paralives',
    config: paralivesTranslationConfig,
    newXmlPath: PATHS.PARALIVES.TEMP_NEW,
    agentDir: PATHS.PARALIVES.AGENT.DIR,
    sourceFormat: 'TSV 7-column (GUID, Key, Value, …)',
    finishCommand: 'npm run paralives:agent-finish',
  });
}

async function finishAgent(): Promise<void> {
  console.log('🏡 Paralives (TSV) (Agent Mode) — đóng gói lại\n' + '='.repeat(60));

  continueFromAgent({
    workflowName: 'Paralives (TSV)',
    agentDir: PATHS.PARALIVES.AGENT.DIR,
    expectedXmlPath: PATHS.PARALIVES.TEMP_NEW,
    translatedXmlPath: PATHS.PARALIVES.TEMP_TRANSLATED,
  });

  const dir = path.join(PATHS.ROOT, 'src', 'scripts', 'paralives');
  runScript(path.join(dir, '4-merge.ts'), '4. Merge bản dịch');
  runScript(path.join(dir, '5-export-tsv.ts'), '5. Xuất file TSV Việt Hóa');

  console.log('\n🎉 HOÀN THÀNH PARALIVES (AGENT MODE)!');
  console.log(`📁 Kết quả: ${PATHS.PARALIVES.OUTPUT_DIR}`);
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
