import fs from 'fs';
import path from 'path';

/**
 * Backup file with timestamp
 */
export function backupFile(filePath: string): string | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const timestamp = new Date().toISOString()
    .replace(/:/g, '-')
    .replace(/\..+/, '')
    .replace('T', '_');

  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const basename = path.basename(filePath, ext);

  const backupPath = path.join(dir, `${basename}.backup_${timestamp}${ext}`);

  fs.copyFileSync(filePath, backupPath);

  return backupPath;
}

/**
 * Clean old backup files, keep only the latest N versions
 */
export function cleanOldBackups(filePath: string, keepVersions: number = 10): void {
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const basename = path.basename(filePath, ext);

  if (!fs.existsSync(dir)) {
    return;
  }

  const backupPattern = new RegExp(`^${basename}\\.backup_.*${ext}$`);
  const backups = fs.readdirSync(dir)
    .filter(file => backupPattern.test(file))
    .map(file => ({
      name: file,
      path: path.join(dir, file),
      time: fs.statSync(path.join(dir, file)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  // Delete old backups
  if (backups.length > keepVersions) {
    for (let i = keepVersions; i < backups.length; i++) {
      fs.unlinkSync(backups[i].path);
    }
  }
}
