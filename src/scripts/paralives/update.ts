#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { PATHS } from '../../config/paths.config';

console.log('🚀 Paralives (TSV) Translation Workflow\n' + '='.repeat(60));

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
  // Đảm bảo thư mục input tồn tại
  if (!fs.existsSync(PATHS.PARALIVES.INPUT_DIR)) {
    console.error(`❌ Thư mục input không tồn tại: ${PATHS.PARALIVES.INPUT_DIR}`);
    console.log(`👉 Vui lòng tạo thư mục này và đặt file .tsv cần dịch vào.`);
    fs.mkdirSync(PATHS.PARALIVES.INPUT_DIR, { recursive: true });
  }

  const dir = path.join(PATHS.ROOT, 'src', 'scripts', 'paralives');

  runScript(path.join(dir, '1-import-tsv.ts'), '1. Import TSV → XML');
  runScript(path.join(dir, '2-detect-changes.ts'), '2. Phát hiện thay đổi');

  if (fs.existsSync(PATHS.PARALIVES.TEMP_NEW)) {
    const newContent = fs.readFileSync(PATHS.PARALIVES.TEMP_NEW, 'utf-8');
    if ((newContent.match(/<Text Key=/g) || []).length > 0) {
      runScript(path.join(dir, '3-translate.ts'), '3. Dịch tự động bằng AI');
    } else {
      console.log('\n✅ Không có nội dung mới cần dịch!');
    }
  }

  runScript(path.join(dir, '4-merge.ts'), '4. Merge bản dịch');
  runScript(path.join(dir, '5-export-tsv.ts'), '5. Xuất file TSV Việt Hóa');

  console.log('\n🎉 HOÀN THÀNH TẤT CẢ QUY TRÌNH PARALIVES!');
  console.log(`📁 Kết quả bản dịch: ${PATHS.PARALIVES.OUTPUT_DIR}`);
  console.log(`👉 BƯỚC CUỐI CÙNG: Import file .vi.tsv vào công cụ localization của Paralives.`);
}

main();
