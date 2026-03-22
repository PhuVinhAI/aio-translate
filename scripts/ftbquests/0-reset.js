const fs = require('fs');
const path = require('path');
const PATHS = require('../../config/paths.config');

function resetFTBWorkflow() {
  console.log('\n=== [FTB Quests 0] Reset Workflow ===\n');

  const filesToDelete = [
    PATHS.FTBQUESTS.TEMP_EN_XML,
    PATHS.FTBQUESTS.TEMP_NEW,
    PATHS.FTBQUESTS.TEMP_TRANSLATED,
    PATHS.FTBQUESTS.TEMP_MERGED,
    path.join(PATHS.TEMP.DIR, 'ftbquests-progress.json'),
    path.join(PATHS.TEMP.DIR, 'temp-batches-ftbquests'),
    PATHS.FTBQUESTS.OUTPUT_DIR
  ];

  let deletedCount = 0;
  filesToDelete.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
      deletedCount++;
      console.log(`✅ Đã xóa: ${path.basename(filePath)}`);
    }
  });

  console.log(`\n✅ Hoàn tất xóa ${deletedCount} file/thư mục tạm của FTB Quests!`);
}

if (require.main === module) {
  resetFTBWorkflow();
}

module.exports = { resetFTBWorkflow };
