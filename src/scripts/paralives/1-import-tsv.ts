import * as fs from 'fs';
import * as path from 'path';
import { PATHS } from '../../config/paths.config';
import { escapeXml } from '../../utils/xml-parser';

interface MappingEntry {
  key: string;
  originalValue: string;
  translatedValue?: string;
  info?: string; // "Info for translators" column
}

const INFO_COLUMN = 4; // "Info for translators"
const DNT_COLUMN = 5; // "Do Not Translate"

function findTsvFile(inputDir: string): string | null {
  if (!fs.existsSync(inputDir)) return null;
  const tsv = fs.readdirSync(inputDir).find(f => f.toLowerCase().endsWith('.tsv'));
  return tsv ? path.join(inputDir, tsv) : null;
}

function importParalives(): void {
  const inputDir = PATHS.PARALIVES.INPUT_DIR;
  const outputXml = PATHS.PARALIVES.TEMP_EN_XML;
  const mappingFile = PATHS.PARALIVES.MAPPING;

  console.log('\n=== [Paralives 1] Import TSV → XML (Incremental) ===');

  const tsvFile = findTsvFile(inputDir);
  if (!tsvFile) {
    console.error(`❌ Không tìm thấy file .tsv trong: ${inputDir}`);
    console.error(`👉 Hãy đặt file localization (ví dụ AllParalivesTranslationItems.tsv) vào thư mục này trước khi chạy.`);
    process.exit(1);
  }

  console.log(`📄 Đọc file: ${path.basename(tsvFile)}`);

  // Mapping cũ (để giữ lại bản dịch khi câu gốc không đổi)
  const oldMapping: Record<string, MappingEntry> = fs.existsSync(mappingFile)
    ? JSON.parse(fs.readFileSync(mappingFile, 'utf8'))
    : {};

  const content = fs.readFileSync(tsvFile, 'utf8').replace(/^﻿/, '');
  const lines = content.split(/\r?\n/);

  const mapping: Record<string, MappingEntry> = {};
  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<STBLKeyStringList>\n';
  let total = 0;
  let skipped = 0;
  let reused = 0;

  // Bỏ qua dòng header (dòng đầu tiên)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue;

    const cols = line.split('\t');
    const guid = cols[0]?.trim();
    const key = cols[1] ?? '';
    const value = cols[2] ?? '';
    const info = (cols[INFO_COLUMN] ?? '').trim();
    const doNotTranslate = (cols[DNT_COLUMN] ?? '').trim() === 'True';

    if (!guid) continue;
    total++;

    // Bỏ qua: cấm dịch hoặc giá trị rỗng
    if (doNotTranslate || value.trim() === '') {
      skipped++;
      continue;
    }

    // Incremental: giữ bản dịch cũ nếu câu gốc tiếng Anh không đổi
    const prev = oldMapping[guid];
    const entry: MappingEntry = { key, originalValue: value };
    if (info) entry.info = info; // Lưu info nếu có
    if (prev && prev.originalValue === value && prev.translatedValue) {
      entry.translatedValue = prev.translatedValue;
      reused++;
    }
    mapping[guid] = entry;

    xml += `  <Text Key="${guid}">${escapeXml(value)}</Text>\n`;
  }

  xml += '</STBLKeyStringList>';

  if (!fs.existsSync(path.dirname(outputXml))) fs.mkdirSync(path.dirname(outputXml), { recursive: true });
  if (!fs.existsSync(path.dirname(mappingFile))) fs.mkdirSync(path.dirname(mappingFile), { recursive: true });

  fs.writeFileSync(outputXml, xml, 'utf8');
  fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2), 'utf8');

  const translatable = total - skipped;
  console.log(`✅ Tổng ${total} dòng | Cần dịch: ${translatable} | Bỏ qua (cấm dịch/rỗng): ${skipped}`);
  console.log(`♻️  Tái sử dụng bản dịch cũ: ${reused}`);
}

if (require.main === module) importParalives();
export { importParalives };
