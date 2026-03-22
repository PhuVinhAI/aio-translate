#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { PATHS } from '../../config/paths.config';

console.log('🚀 FTB Quests Translation Workflow\n' + '='.repeat(60));

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
  if (!fs.existsSync(PATHS.FTBQUESTS.INPUT_DIR)) {
    console.error(`❌ Thư mục input không tồn tại: ${PATHS.FTBQUESTS.INPUT_DIR}`);
    console.error(`\n👉 HƯỚNG DẪN CÀI ĐẶT INPUT:`);
    console.error(`1. Tạo thư mục: aio-translate/ftbquests/input/`);
    console.error(`2. Copy file 'en_us.snbt' VÀ thư mục 'en_us' (từ config/ftbquests/quests/lang/ của modpack) ném vào thư mục 'input' vừa tạo.`);
    console.error(`=> Tức là bạn sẽ có: ftbquests/input/en_us.snbt VÀ ftbquests/input/en_us/...`);
    process.exit(1);
  }

  runScript(path.join(PATHS.ROOT, 'src', 'scripts', 'ftbquests', '1-import-snbt.ts'), '1. Import SNBT → XML');
  runScript(path.join(PATHS.ROOT, 'src', 'scripts', 'ftbquests', '2-detect-changes.ts'), '2. Phát hiện thay đổi');

  const newContent = fs.readFileSync(PATHS.FTBQUESTS.TEMP_NEW, 'utf-8');
  if ((newContent.match(/<Text Key=/g) || []).length > 0) {
    runScript(path.join(PATHS.ROOT, 'src', 'scripts', 'ftbquests', '3-translate.ts'), '3. Dịch tự động');
  } else {
    console.log('\n✅ Không có nội dung mới cần dịch!');
  }

  runScript(path.join(PATHS.ROOT, 'src', 'scripts', 'ftbquests', '4-merge.ts'), '4. Merge bản dịch');
  runScript(path.join(PATHS.ROOT, 'src', 'scripts', 'ftbquests', '5-export-snbt.ts'), '5. Xuất SNBT vi_vn');

  console.log('\n🎉 HOÀN THÀNH TẤT CẢ!');
  console.log(`📁 Kết quả: ${PATHS.FTBQUESTS.OUTPUT_DIR}`);
  console.log(`👉 BƯỚC CUỐI CÙNG: Copy TOÀN BỘ nội dung bên trong thư mục 'output' (gồm file vi_vn.snbt và thư mục vi_vn) ném vào thư mục 'config/ftbquests/quests/lang/' của modpack.`);
}

main();
