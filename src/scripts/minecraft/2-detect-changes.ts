import fs from 'fs';
import { PATHS } from '../../config/paths.config';
import { parseXMLToMap } from '../../utils/xml-parser';

interface NewEntry {
  key: string;
  value: string;
}

function detectChanges(): void {
  console.log('\n=== [Minecraft 2] Phát hiện thay đổi ===');

  const enXmlFile = PATHS.MINECRAFT.TEMP_EN_XML;
  const mergedXmlFile = PATHS.MINECRAFT.TEMP_MERGED;
  const outputFile = PATHS.MINECRAFT.TEMP_NEW;

  if (!fs.existsSync(enXmlFile)) {
    console.error(`❌ File XML nguồn chưa được tạo. Chạy bước 1 trước.`);
    process.exit(1);
  }

  const enXml = fs.readFileSync(enXmlFile, 'utf8');
  const enEntries = parseXMLToMap(enXml);

  const oldEntries = new Map<string, string>();
  if (fs.existsSync(mergedXmlFile)) {
    const oldXml = fs.readFileSync(mergedXmlFile, 'utf8');
    const parsedOld = parseXMLToMap(oldXml);
    parsedOld.forEach((val: string, key: string) => oldEntries.set(key, val));
    console.log(`✅ Tìm thấy bản dịch cũ: ${oldEntries.size} keys.`);
  } else {
    console.log(`ℹ️  Không tìm thấy bản dịch cũ, sẽ dịch toàn bộ.`);
  }

  const newContent: NewEntry[] = [];
  enEntries.forEach((value: string, key: string) => {
    if (!oldEntries.has(key)) {
      newContent.push({ key, value });
    }
  });

  console.log(`📊 Cần dịch: ${newContent.length} entries`);

  if (newContent.length === 0) {
    fs.writeFileSync(
      outputFile,
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<STBLKeyStringList>\n</STBLKeyStringList>',
      'utf8'
    );
    return;
  }

  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<STBLKeyStringList>\n';
  newContent.forEach((e: NewEntry) => {
    xml += `  <Text Key="${e.key}">${e.value}</Text>\n`;
  });
  xml += '</STBLKeyStringList>';

  fs.writeFileSync(outputFile, xml, 'utf8');
  console.log(`✅ Đã xuất các file cần dịch ra: ${outputFile}`);
}

if (require.main === module) {
  detectChanges();
}

export { detectChanges };
