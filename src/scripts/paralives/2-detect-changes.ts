import * as fs from 'fs';
import * as path from 'path';
import { PATHS } from '../../config/paths.config';
import { parseXMLToMap, escapeXml } from '../../utils/xml-parser';

interface MappingEntry {
  key: string;
  originalValue: string;
  translatedValue?: string;
  info?: string;
}

function detectChanges(): void {
  console.log('\n=== [Paralives 2] Phát hiện thay đổi ===');

  const enXml = PATHS.PARALIVES.TEMP_EN_XML;
  const mappingFile = PATHS.PARALIVES.MAPPING;
  const outputXml = PATHS.PARALIVES.TEMP_NEW;

  if (!fs.existsSync(enXml) || !fs.existsSync(mappingFile)) {
    console.error(`❌ Thiếu file en.xml hoặc mapping.json!`);
    process.exit(1);
  }

  const enEntries = parseXMLToMap(fs.readFileSync(enXml, 'utf8'));
  const mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8')) as Record<string, MappingEntry>;

  // Build XML thủ công để thêm comment info
  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<STBLKeyStringList>\n';
  let count = 0;

  enEntries.forEach((text, guid) => {
    // Nếu chưa có trong mapping hoặc chưa có bản dịch
    if (!mapping[guid] || !mapping[guid].translatedValue) {
      const entry = mapping[guid];

      // Thêm comment info nếu có (giúp AI hiểu context)
      if (entry?.info) {
        xml += `  <!-- Info: ${escapeXml(entry.info)} -->\n`;
      }

      xml += `  <Text Key="${guid}">${escapeXml(text)}</Text>\n`;
      count++;
    }
  });

  xml += '</STBLKeyStringList>';

  if (!fs.existsSync(path.dirname(outputXml))) {
    fs.mkdirSync(path.dirname(outputXml), { recursive: true });
  }
  fs.writeFileSync(outputXml, xml, 'utf8');

  console.log(`✅ Phát hiện ${count} câu mới cần dịch.`);
  console.log(`✅ Đã tạo file: ${outputXml}`);
}

if (require.main === module) {
  detectChanges();
}

export { detectChanges };
