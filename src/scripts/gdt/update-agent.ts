#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { PATHS } from '../../config/paths.config';
import { generateAgentBundle } from '../agent-mode/generate-agent-bundle';
import { continueFromAgent } from '../agent-mode/continue-from-agent';
import { gdtTranslationConfig } from '../../config/gdt-translation.config';

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
  console.log('🎮 Game Dev Tycoon (Agent Mode) — pause trước khi gọi AI\n' + '='.repeat(60));

  const dir = path.join(PATHS.ROOT, 'src', 'scripts', 'gdt');
  runScript(path.join(dir, '0-sync-from-core.ts'), '0. Sync vi.js from gdt-core');
  runScript(path.join(dir, '1-import-js.ts'), '1. Import JS → XML');
  runScript(path.join(dir, '2-detect-changes.ts'), '2. Phát hiện thay đổi');

  generateAgentBundle({
    workflowName: 'Game Dev Tycoon',
    workflowSlug: 'gdt',
    config: gdtTranslationConfig,
    newXmlPath: PATHS.GDT.TEMP_NEW,
    agentDir: PATHS.GDT.AGENT.DIR,
    sourceFormat: 'JS i18n (Game Dev Tycoon)',
    finishCommand: 'npm run gdt:agent-finish',
  });
}

async function finishAgent(): Promise<void> {
  console.log('🎮 Game Dev Tycoon (Agent Mode) — đóng gói lại\n' + '='.repeat(60));

  continueFromAgent({
    workflowName: 'Game Dev Tycoon',
    agentDir: PATHS.GDT.AGENT.DIR,
    expectedXmlPath: PATHS.GDT.TEMP_NEW,
    translatedXmlPath: PATHS.GDT.TEMP_TRANSLATED,
  });

  const dir = path.join(PATHS.ROOT, 'src', 'scripts', 'gdt');
  runScript(path.join(dir, '4-merge.ts'), '4. Merge bản dịch');
  runScript(path.join(dir, '5-export-js.ts'), '5. Export vi.js');
  runScript(path.join(dir, '6-sync-to-core.ts'), '6. Sync vi.js to gdt-core');

  console.log('\n🎉 HOÀN THÀNH GDT (AGENT MODE)!');
  console.log(`📁 Kết quả: ${PATHS.GDT.OUTPUT_VI_JS}`);
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
