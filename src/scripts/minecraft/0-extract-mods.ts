import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { PATHS } from '../../config/paths.config';
import { ModLanguageData } from '../../types';

// Cấu hình đường dẫn
const MODS_DIR = path.join(PATHS.ROOT, 'mods');
const OUTPUT_FILE = PATHS.MINECRAFT.INPUT_JSON;

interface ModLangFiles {
  en: AdmZip.IZipEntry | null;
  vi: AdmZip.IZipEntry | null;
}

interface LangJson {
  [key: string]: string;
}

function safeJsonParse(content: string, modName: string, fileName: string): LangJson {
  try {
    // Xóa BOM (Byte Order Mark) nếu có và parse JSON
    return JSON.parse(content.replace(/^\uFEFF/, '')) as LangJson;
  } catch (e) {
    const error = e as Error;
    console.warn(`[CẢNH BÁO] Bỏ qua file ${fileName} của mod '${modName}' do lỗi cú pháp JSON: ${error.message}`);
    return {};
  }
}

function extractMods(): void {
  console.log('\n=== [Minecraft 0] Extract Mods → JSON ===');
  console.log(`Đang quét thư mục: ${MODS_DIR}\n`);

  if (!fs.existsSync(MODS_DIR)) {
    console.error('[LỖI] Không tìm thấy thư mục mods!');
    console.error('Vui lòng tạo thư mục "mods" và copy các file .jar vào đó.');
    process.exit(1);
  }

  const files = fs.readdirSync(MODS_DIR);
  const jarFiles = files.filter((file: string) => file.endsWith('.jar'));

  console.log(`Tìm thấy ${jarFiles.length} mod. Bắt đầu trích xuất...\n`);

  const masterTranslationDict: ModLanguageData = {};
  let processedCount = 0;

  jarFiles.forEach((jarName: string) => {
    const jarPath = path.join(MODS_DIR, jarName);
    try {
      const zip = new AdmZip(jarPath);
      const zipEntries = zip.getEntries();

      // Regex tìm file ngôn ngữ: assets/tên_mod/lang/en_us.json
      const langRegex = /^assets\/([^\/]+)\/lang\/(en_us|vi_vn)\.json$/i;

      // Phân loại entry theo mod_id
      const modLangFiles: Record<string, ModLangFiles> = {};

      zipEntries.forEach((entry: AdmZip.IZipEntry) => {
        const match = entry.entryName.match(langRegex);
        if (match) {
          const modId = match[1];
          const langCode = match[2].toLowerCase(); // en_us hoặc vi_vn

          if (!modLangFiles[modId]) {
            modLangFiles[modId] = { en: null, vi: null };
          }

          if (langCode === 'en_us') modLangFiles[modId].en = entry;
          if (langCode === 'vi_vn') modLangFiles[modId].vi = entry;
        }
      });

      // Xử lý so sánh cho từng mod tìm thấy trong file .jar
      for (const [modId, entries] of Object.entries(modLangFiles)) {
        if (!entries.en) continue; // Bỏ qua nếu không có file tiếng Anh

        const enContent = entries.en.getData().toString('utf8');
        const enJson = safeJsonParse(enContent, modId, 'en_us.json');

        let viJson: LangJson = {};
        let hasViFile = false;

        if (entries.vi) {
          const viContent = entries.vi.getData().toString('utf8');
          viJson = safeJsonParse(viContent, modId, 'vi_vn.json');
          hasViFile = true;
        }

        const missingTranslations: LangJson = {};
        let missingCount = 0;
        const totalEnKeys = Object.keys(enJson).length;

        // Kiểm tra từng key trong file EN
        for (const [key, value] of Object.entries(enJson)) {
          // Bỏ qua nếu key tiếng Anh rỗng
          if (!value || typeof value !== 'string' || value.trim() === "") continue;

          // 1. Nếu file VI hoàn toàn KHÔNG CÓ key này -> Cần dịch
          // 2. Nếu file VI có key này nhưng value bị để trống -> Cần dịch
          if (!viJson.hasOwnProperty(key) || viJson[key].trim() === "") {
            missingTranslations[key] = value;
            missingCount++;
          }
        }

        if (missingCount > 0) {
          masterTranslationDict[modId] = missingTranslations;
          if (hasViFile) {
            console.log(` -> [UPDATE] '${modId}' có sẵn Tiếng Việt nhưng bị thiếu ${missingCount}/${totalEnKeys} keys. Đã trích xuất phần thiếu!`);
          } else {
            console.log(` -> [NEW] '${modId}' chưa có Tiếng Việt. Cần dịch ${missingCount} keys.`);
          }
        } else if (hasViFile && missingCount === 0) {
          console.log(` -> [SKIP] '${modId}' đã được dịch đủ 100% (${totalEnKeys} keys). Bỏ qua!`);
        }
      }

      processedCount++;
      if (processedCount % 10 === 0) {
        console.log(`... Đang xử lý: ${processedCount}/${jarFiles.length} mods`);
      }

    } catch (error) {
      const err = error as Error;
      console.error(`\n[LỖI] Không thể đọc file ${jarName}: ${err.message}`);
    }
  });

  console.log('\nĐang ghi dữ liệu ra file...');

  if (!fs.existsSync(path.dirname(OUTPUT_FILE))) {
    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(masterTranslationDict, null, 4), 'utf8');

  const totalModsNeedingTranslation = Object.keys(masterTranslationDict).length;
  console.log(`\n✅ [HOÀN THÀNH] Phát hiện ${totalModsNeedingTranslation} mod có key cần dịch.`);
  console.log(`✅ File xuất ra tại: ${OUTPUT_FILE}`);
}

if (require.main === module) {
  extractMods();
}

export { extractMods };
