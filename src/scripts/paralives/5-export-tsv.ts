import * as fs from 'fs';
import * as path from 'path';
import { PATHS } from '../../config/paths.config';
import { unescapeXml } from '../../utils/xml-parser';

interface MappingEntry {
  key: string;
  originalValue: string;
  translatedValue?: string;
}

const VALUE_COLUMN = 2; // "Value"

function findTsvFile(inputDir: string): string | null {
  if (!fs.existsSync(inputDir)) return null;
  const tsv = fs.readdirSync(inputDir).find(f => f.toLowerCase().endsWith('.tsv'));
  return tsv ? path.join(inputDir, tsv) : null;
}

/**
 * Làm sạch text dịch để an toàn khi ghi vào ô TSV:
 * - Bỏ wrapper XML escape
 * - Tab thật → space (tab là dấu phân cột TSV, không được lọt vào ô)
 * - Xuống dòng thật (nếu AI lỡ trả về) → \n literal (Paralives dùng \n hai ký tự)
 */
function sanitizeForTsv(raw: string): string {
  return unescapeXml(raw)
    .replace(/\r\n/g, '\\n')
    .replace(/[\r\n]/g, '\\n')
    .replace(/\t/g, ' ');
}

function exportParalives(): void {
  console.log('\n=== [Paralives 5] Xuất file TSV Việt Hóa ===');

  const inputDir = PATHS.PARALIVES.INPUT_DIR;
  const mappingFile = PATHS.PARALIVES.MAPPING;
  const outputDir = PATHS.PARALIVES.OUTPUT_DIR;

  const tsvFile = findTsvFile(inputDir);
  if (!tsvFile) {
    console.error(`❌ Không tìm thấy file .tsv gốc trong: ${inputDir}`);
    process.exit(1);
  }
  if (!fs.existsSync(mappingFile)) {
    console.error(`❌ Thiếu file mapping.json! Hãy chạy các bước import → merge trước.`);
    process.exit(1);
  }

  const mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8')) as Record<string, MappingEntry>;

  // Đọc lại file gốc, giữ nguyên line-ending để khôi phục y hệt
  const content = fs.readFileSync(tsvFile, 'utf8');
  const usesCrlf = content.includes('\r\n');
  const eol = usesCrlf ? '\r\n' : '\n';
  const hadBom = content.charCodeAt(0) === 0xfeff;
  const lines = content.replace(/^﻿/, '').split(/\r?\n/);

  const outLines: string[] = [];
  let translatedCount = 0;

  lines.forEach((line, idx) => {
    // Giữ nguyên header (dòng 0) và mọi dòng trống
    if (idx === 0 || line.trim() === '') {
      outLines.push(line);
      return;
    }

    const cols = line.split('\t');
    const guid = cols[0]?.trim();
    const entry = guid ? mapping[guid] : undefined;

    if (entry && entry.translatedValue) {
      cols[VALUE_COLUMN] = sanitizeForTsv(entry.translatedValue);
      translatedCount++;
    }

    outLines.push(cols.join('\t'));
  });

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const baseName = path.basename(tsvFile, '.tsv');
  const outputFile = path.join(outputDir, `${baseName}.vi.tsv`);

  const bom = hadBom ? '﻿' : '';
  fs.writeFileSync(outputFile, bom + outLines.join(eol), 'utf8');

  console.log(`✅ Đã thay ${translatedCount} ô Value bằng bản dịch tiếng Việt.`);
  console.log(`✅ File kết quả: ${outputFile}`);
  console.log(`👉 Import file này lại vào công cụ localization của Paralives.`);
}

if (require.main === module) exportParalives();
export { exportParalives };
