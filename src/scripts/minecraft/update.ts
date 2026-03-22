#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { PATHS } from '../../config/paths.config';

console.log('🚀 Minecraft Translation Workflow\n' + '='.repeat(60));

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

async function main(): Promise<void> {
  // Bước 0: Extract mods từ .jar
  runScript(path.join(PATHS.ROOT, 'src', 'scripts', 'minecraft', '0-extract-mods.ts'), '0. Extract Mods từ .jar');

  if (!fs.existsSync(PATHS.MINECRAFT.INPUT_JSON)) {
    console.error(`❌ File không tồn tại: ${PATHS.MINECRAFT.INPUT_JSON}`);
    console.error(`Lỗi khi extract mods. Vui lòng kiểm tra thư mục mods/`);
    process.exit(1);
  }

  runScript(path.join(PATHS.ROOT, 'src', 'scripts', 'minecraft', '1-import-json.ts'), '1. Import JSON → XML');
  runScript(path.join(PATHS.ROOT, 'src', 'scripts', 'minecraft', '2-detect-changes.ts'), '2. Phát hiện thay đổi');

  const newContent = fs.readFileSync(PATHS.MINECRAFT.TEMP_NEW, 'utf-8');
  if ((newContent.match(/<Text Key=/g) || []).length > 0) {
    runScript(path.join(PATHS.ROOT, 'src', 'scripts', '3-translate.ts'), '3. Dịch tự động');
  } else {
    console.log('\n✅ Không có nội dung mới cần dịch!');
  }

  runScript(path.join(PATHS.ROOT, 'src', 'scripts', 'minecraft', '4-merge.ts'), '4. Merge bản dịch');
  runScript(path.join(PATHS.ROOT, 'src', 'scripts', 'minecraft', '5-export-resourcepack.ts'), '5. Xuất Resource Pack');

  console.log('\n🎉 HOÀN THÀNH TẤT CẢ!');
  console.log(`📁 Kết quả (Resource Pack): ${PATHS.MINECRAFT.OUTPUT_DIR}`);
}

main();
