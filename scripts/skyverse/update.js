#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const PATHS = require('../../config/paths.config');

console.log('🚀 Skyverse Translation Workflow\n' + '='.repeat(60));

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
  if (!fs.existsSync(PATHS.SKYVERSE.INPUT_TXT)) {
    console.error(`❌ File không tồn tại: ${PATHS.SKYVERSE.INPUT_TXT}`);
    process.exit(1);
  }
  
  runScript(path.join(PATHS.ROOT, 'scripts', 'skyverse', '1-import-txt.js'), '1. Import TXT → XML');
  runScript(path.join(PATHS.ROOT, 'scripts', 'skyverse', '2-detect-changes.js'), '2. Phát hiện thay đổi');
  
  const newContent = fs.readFileSync(PATHS.SKYVERSE.TEMP_NEW, 'utf-8');
  if ((newContent.match(/<Text Key=/g) || []).length > 0) {
    runScript(path.join(PATHS.ROOT, 'scripts', 'skyverse', '3-translate.js'), '3. Dịch tự động');
  } else {
    console.log('\n✅ Không có nội dung mới cần dịch!');
  }
  
  runScript(path.join(PATHS.ROOT, 'scripts', 'skyverse', '4-merge.js'), '4. Merge bản dịch');
  runScript(path.join(PATHS.ROOT, 'scripts', 'skyverse', '5-export-txt.js'), '5. Xuất TXT');
  
  console.log('\n🎉 HOÀN THÀNH TẤT CẢ!');
  console.log(`📁 Kết quả: ${PATHS.SKYVERSE.OUTPUT_TXT}`);
}

main();
