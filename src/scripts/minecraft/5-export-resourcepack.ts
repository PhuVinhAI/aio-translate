import fs from 'fs';
import path from 'path';
import { PATHS } from '../../config/paths.config';
import { unescapeXml, parseXMLToMap } from '../../utils/xml-parser';
import { ModLanguageData } from '../../types';

interface MappingEntry {
  modId: string;
  originalKey: string;
  text: string;
}

interface PackMcmeta {
  pack: {
    pack_format: number;
    description: string;
  };
}

function exportResourcePack(): void {
  console.log('\n=== [Minecraft 5] Xuất Resource Pack ===');

  const mergedXml = PATHS.MINECRAFT.TEMP_MERGED;
  const mappingFile = PATHS.MINECRAFT.MAPPING;
  const outputDir = PATHS.MINECRAFT.OUTPUT_DIR;

  if (!fs.existsSync(mergedXml) || !fs.existsSync(mappingFile)) {
    console.error(`❌ Thiếu file merged.xml hoặc mapping.json!`);
    process.exit(1);
  }

  const translatedEntries = parseXMLToMap(fs.readFileSync(mergedXml, 'utf8'));
  const mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8')) as Record<string, MappingEntry>;

  // Dựng lại dữ liệu: { modId: { key: value } }
  const modData: ModLanguageData = {};

  for (const [hashKey, viXmlText] of translatedEntries.entries()) {
    const mapInfo = mapping[hashKey];
    if (mapInfo) {
      const { modId, originalKey } = mapInfo;
      if (!modData[modId]) modData[modId] = {};

      modData[modId][originalKey] = unescapeXml(viXmlText);
    }
  }

  // Tạo thư mục Resource Pack
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outputDir, { recursive: true });

  // Ghi file pack.mcmeta
  const mcmeta: PackMcmeta = {
    pack: {
      pack_format: 15,
      description: "Việt Hóa Modpack AI"
    }
  };
  fs.writeFileSync(path.join(outputDir, 'pack.mcmeta'), JSON.stringify(mcmeta, null, 2), 'utf8');

  // Ghi từng file vi_vn.json
  let filesCreated = 0;
  for (const [modId, translations] of Object.entries(modData)) {
    const langDir = path.join(outputDir, 'assets', modId, 'lang');
    fs.mkdirSync(langDir, { recursive: true });

    // Lưu ở định dạng JSON tiêu chuẩn Minecraft
    fs.writeFileSync(path.join(langDir, 'vi_vn.json'), JSON.stringify(translations, null, 4), 'utf8');
    filesCreated++;
  }

  console.log(`✅ Đã xuất thành công ${filesCreated} file vi_vn.json`);
  console.log(`📁 Resource Pack sẵn sàng tại: ${outputDir}`);
}

if (require.main === module) {
  exportResourcePack();
}

export { exportResourcePack };
