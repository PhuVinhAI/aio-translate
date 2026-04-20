#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { PATHS } from '../../config/paths.config';

console.log('🚀 Terraria Mod Translation Workflow\n' + '='.repeat(60));

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
  if (!fs.existsSync(PATHS.TERRARIA.INPUT_DIR)) {
    console.error(`❌ Thư mục input không tồn tại: ${PATHS.TERRARIA.INPUT_DIR}`);
    console.log(`👉 Vui lòng tạo thư mục này và đặt các file mod cần dịch vào.`);
    // Fallback nếu người dùng chạy lần đầu mà chưa có folder
    fs.mkdirSync(PATHS.TERRARIA.INPUT_DIR, { recursive: true });
  }

  runScript(path.join(PATHS.ROOT, 'src', 'scripts', 'terraria', '1-import-hjson.ts'), '1. Import HJSON/JSON → XML');
  runScript(path.join(PATHS.ROOT, 'src', 'scripts', 'terraria', '2-detect-changes.ts'), '2. Phát hiện thay đổi');

  if (fs.existsSync(PATHS.TERRARIA.TEMP_NEW)) {
    const newContent = fs.readFileSync(PATHS.TERRARIA.TEMP_NEW, 'utf-8');
    if ((newContent.match(/<Text Key=/g) || []).length > 0) {
      runScript(path.join(PATHS.ROOT, 'src', 'scripts', 'terraria', '3-translate.ts'), '3. Dịch tự động bằng AI');
    } else {
      console.log('\n✅ Không có nội dung mới cần dịch!');
    }
  }

  runScript(path.join(PATHS.ROOT, 'src', 'scripts', 'terraria', '4-merge.ts'), '4. Merge bản dịch');
  runScript(path.join(PATHS.ROOT, 'src', 'scripts', 'terraria', '5-export-hjson.ts'), '5. Xuất file vi-VN');

  console.log('\n🎉 HOÀN THÀNH TẤT CẢ QUY TRÌNH TERRARIA!');
  console.log(`📁 Kết quả bản dịch: ${PATHS.TERRARIA.OUTPUT_DIR}`);
  console.log(`👉 BƯỚC CUỐI CÙNG: Sử dụng các file vi-VN.hjson này để đóng gói lại mod hoặc dùng resource pack cho Terraria.`);
}

main();
