import * as fs from 'fs';
import * as path from 'path';
import { PATHS } from '../../config/paths.config';
import { parseXMLToMap, mapToXML } from '../../utils/xml-parser';

function detectChanges(): void {
  console.log('\n=== [Terraria 2] Phát hiện thay đổi ===');

  const enXml = PATHS.TERRARIA.TEMP_EN_XML;
  const mappingFile = PATHS.TERRARIA.MAPPING;
  const outputXml = PATHS.TERRARIA.TEMP_NEW;

  if (!fs.existsSync(enXml) || !fs.existsSync(mappingFile)) {
    console.error(`❌ Thiếu file en.xml hoặc mapping.json!`);
    process.exit(1);
  }

  const enEntries = parseXMLToMap(fs.readFileSync(enXml, 'utf8'));
  const mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));

  const newEntries = new Map<string, string>();

  enEntries.forEach((text, hash) => {
    // Nếu chưa có trong mapping hoặc chưa có bản dịch
    if (!mapping[hash] || !mapping[hash].translatedValue) {
      newEntries.set(hash, text);
    }
  });

  const xmlContent = mapToXML(newEntries);

  if (!fs.existsSync(path.dirname(outputXml))) {
    fs.mkdirSync(path.dirname(outputXml), { recursive: true });
  }
  fs.writeFileSync(outputXml, xmlContent, 'utf8');

  console.log(`✅ Phát hiện ${newEntries.size} câu mới cần dịch.`);
  console.log(`✅ Đã tạo file: ${outputXml}`);
}

if (require.main === module) {
  detectChanges();
}

export { detectChanges };
