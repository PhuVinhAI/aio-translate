const fs = require('fs');
const path = require('path');
const PATHS = require('../../config/paths.config');

function resetMinecraftWorkflow() {
  console.log('\n=== [Minecraft 0] Reset Workflow ===\n');

  const filesToDelete = [
    PATHS.MINECRAFT.TEMP_EN_XML,
    PATHS.MINECRAFT.TEMP_NEW,
    PATHS.MINECRAFT.TEMP_TRANSLATED,
    PATHS.MINECRAFT.TEMP_MERGED,
    path.join(PATHS.TEMP.DIR, 'minecraft-progress.json'),
    path.join(PATHS.TEMP.DIR, 'temp-batches-minecraft'),
    PATHS.MINECRAFT.OUTPUT_DIR
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

  console.log(`\n✅ Hoàn tất xóa ${deletedCount} file/thư mục tạm của Minecraft!`);
}

if (require.main === module) {
  resetMinecraftWorkflow();
}
module.exports = { resetMinecraftWorkflow };