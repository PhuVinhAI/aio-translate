const fs = require('fs');
const path = require('path');
const PATHS = require('../../config/paths.config');

function resetSkyverseWorkflow() {
  console.log('\n=== [Skyverse 0] Reset Workflow ===\n');
  
  const filesToDelete = [
    PATHS.SKYVERSE.TEMP_EN_XML,
    PATHS.SKYVERSE.TEMP_NEW,
    PATHS.SKYVERSE.TEMP_TRANSLATED,
    PATHS.SKYVERSE.TEMP_MERGED,
    path.join(PATHS.TEMP.DIR, 'skyverse-progress.json'),
    path.join(PATHS.TEMP.DIR, 'temp-batches-skyverse'),
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
  
  console.log(`\n✅ Hoàn tất xóa ${deletedCount} file/thư mục tạm của Skyverse!`);
}

if (require.main === module) {
  resetSkyverseWorkflow();
}
module.exports = { resetSkyverseWorkflow };
