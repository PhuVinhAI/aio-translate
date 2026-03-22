#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const PATHS = require('../../config/paths.config');

console.log('🚀 Minecraft Translation Workflow\n' + '='.repeat(60));

function runScript(scriptPath, description) {
  console.log(`\n${'='.repeat(60)}\n▶️  ${description}\n${'='.repeat(60)}\n`);
  try {
    execSync(`node "${scriptPath}"`, { stdio: 'inherit', cwd: PATHS.ROOT });
    return true;
  } catch (error) {
    console.error(`\n❌ ${description} - Lỗi`);
    return false;
  }
}

async function main() {
  if (!fs.existsSync(PATHS.MINECRAFT.INPUT_JSON)) {
    console.error(`❌ File không tồn tại: ${PATHS.MINECRAFT.INPUT_JSON}`);
    console.error(`Vui lòng chạy script extract_lang.js trước để tạo output_to_translate.json`);
    process.exit(1);
  }

  runScript(path.join(PATHS.ROOT, 'scripts', 'minecraft', '1-import-json.js'), '1. Import JSON → XML');
  runScript(path.join(PATHS.ROOT, 'scripts', 'minecraft', '2-detect-changes.js'), '2. Phát hiện thay đổi');

  const newContent = fs.readFileSync(PATHS.MINECRAFT.TEMP_NEW, 'utf-8');
  if ((newContent.match(/<Text Key=/g) || []).length > 0) {
    runScript(path.join(PATHS.ROOT, 'scripts', 'minecraft', '3-translate.js'), '3. Dịch tự động');
  } else {
    console.log('\n✅ Không có nội dung mới cần dịch!');
  }

  runScript(path.join(PATHS.ROOT, 'scripts', 'minecraft', '4-merge.js'), '4. Merge bản dịch');
  runScript(path.join(PATHS.ROOT, 'scripts', 'minecraft', '5-export-resourcepack.js'), '5. Xuất Resource Pack');

  console.log('\n🎉 HOÀN THÀNH TẤT CẢ!');
  console.log(`📁 Kết quả (Resource Pack): ${PATHS.MINECRAFT.OUTPUT_DIR}`);
}

main();