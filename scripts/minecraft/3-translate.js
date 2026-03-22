const { execSync } = require('child_process');
const PATHS = require('../../config/paths.config');

function translate() {
  console.log('\n=== [Minecraft 3] Dịch tự động AI ===');
  try {
    execSync('node scripts/3-translate.js minecraft', {
      stdio: 'inherit',
      cwd: PATHS.ROOT
    });
    console.log(`\n✅ Hoàn thành dịch!`);
  } catch (error) {
    console.error('\n❌ Lỗi khi dịch:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  translate();
}