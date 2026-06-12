#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { PATHS } from '../../config/paths.config';

function runScript(scriptPath: string, description: string): void {
  console.log(`\n${'='.repeat(60)}\n${description}\n${'='.repeat(60)}\n`);
  execSync(`npx ts-node "${scriptPath}"`, { stdio: 'inherit', cwd: PATHS.ROOT });
}

function countTextNodes(xmlFile: string): number {
  if (!fs.existsSync(xmlFile)) {
    return 0;
  }
  const content = fs.readFileSync(xmlFile, 'utf8');
  return (content.match(/<Text Key=/g) || []).length;
}

async function main(): Promise<void> {
  console.log('Game Dev Tycoon Translation Workflow');

  const dir = path.join(PATHS.ROOT, 'src', 'scripts', 'gdt');

  runScript(path.join(dir, '0-sync-from-core.ts'), '0. Sync vi.js from gdt-core');
  runScript(path.join(dir, '1-import-js.ts'), '1. Import vi.js to XML');
  runScript(path.join(dir, '2-detect-changes.ts'), '2. Detect untranslated entries');

  const pending = countTextNodes(PATHS.GDT.TEMP_NEW);
  if (pending > 0) {
    runScript(path.join(dir, '3-translate.ts'), `3. Translate ${pending} entries`);
  } else {
    console.log('\nNo new entries need translation.');
  }

  runScript(path.join(dir, '4-merge.ts'), '4. Merge translations');
  runScript(path.join(dir, '5-export-js.ts'), '5. Export vi.js');
  runScript(path.join(dir, '6-sync-to-core.ts'), '6. Sync vi.js to gdt-core');

  console.log('\nGDT translation workflow completed.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
