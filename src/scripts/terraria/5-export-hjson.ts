import fs from 'fs';
import path from 'path';
import { PATHS } from '../../config/paths.config';
import { unescapeXml, parseXMLToMap } from '../../utils/xml-parser';

interface MappingEntry {
  file: string;
  originalKey: string;
  isMultiline: boolean;
  isJson: boolean;
  jsonPath?: string;
  originalValue: string;
}

function setValueByPath(obj: any, jsonPath: string, value: string) {
  const parts = jsonPath.split(/[.\[\]]+/).filter(p => p !== "");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

function exportTerraria(): void {
  console.log('\n=== [Terraria 5] Xuất HJSON/JSON ===');

  const inputDir = fs.readdirSync(PATHS.TERRARIA.INPUT_DIR).length > 0
    ? PATHS.TERRARIA.INPUT_DIR
    : "C:/Users/tomis/Docs/aio-translate/ModLocalization";

  const outputDir = PATHS.TERRARIA.OUTPUT_DIR;
  const mergedXml = PATHS.TERRARIA.TEMP_MERGED;
  const mappingFile = PATHS.TERRARIA.MAPPING;

  if (!fs.existsSync(mergedXml) || !fs.existsSync(mappingFile)) {
    console.error(`❌ Thiếu file XML hoặc Mapping!`);
    process.exit(1);
  }

  const translatedEntries = parseXMLToMap(fs.readFileSync(mergedXml, 'utf8'));
  const mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8')) as Record<string, MappingEntry>;

  // Tổ chức dữ liệu theo file
  const fileData: Record<string, any> = {};

  for (const [hashKey, viTextRaw] of translatedEntries.entries()) {
    const mapInfo = mapping[hashKey];
    if (!mapInfo) continue;

    const viText = unescapeXml(viTextRaw);
    if (!fileData[mapInfo.file]) fileData[mapInfo.file] = { hjson: {}, json: {} };

    if (mapInfo.isJson) {
      fileData[mapInfo.file].json[mapInfo.jsonPath!] = viText;
    } else {
      let finalOutput = "";
      if (mapInfo.isMultiline) {
        finalOutput = `'''\n${viText}\n\t\t\t'''`;
      } else if (mapInfo.originalValue.startsWith('"')) {
        finalOutput = `"${viText.replace(/"/g, '\\"')}"`;
      } else {
        finalOutput = viText;
      }
      fileData[mapInfo.file].hjson[mapInfo.originalKey] = finalOutput;
    }
  }

  if (fs.existsSync(outputDir)) fs.rmSync(outputDir, { recursive: true, force: true });

  const hjsonRegex = /([\w\.\-]+)\s*:\s*('''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|[^#\n\r\{\}\[\]]+)/g;

  let replacedCount = 0;
  let filesCreated = 0;

  for (const [relPath, data] of Object.entries(fileData)) {
    const srcFile = path.join(inputDir, relPath);
    let destRelPath = relPath.replace(/en-US/g, 'vi-VN');
    const destFile = path.join(outputDir, destRelPath);

    fs.mkdirSync(path.dirname(destFile), { recursive: true });

    if (relPath.endsWith('.json')) {
      // XỬ LÝ JSON (Calamity Dialogue)
      try {
        const jsonData = JSON.parse(fs.readFileSync(srcFile, 'utf8'));
        Object.entries(data.json).forEach(([jsonPath, translatedValue]) => {
          setValueByPath(jsonData, jsonPath, translatedValue as string);
          replacedCount++;
        });
        fs.writeFileSync(destFile, JSON.stringify(jsonData, null, 4), 'utf8');
      } catch (e) {
        console.error(`❌ Lỗi ghi JSON file ${relPath}: ${(e as Error).message}`);
      }
    } else {
      // XỬ LÝ HJSON
      let content = fs.readFileSync(srcFile, 'utf8');
      content = content.replace(hjsonRegex, (match, key) => {
        const trimmedKey = key.trim();
        if (data.hjson[trimmedKey]) {
          replacedCount++;
          return `${key}: ${data.hjson[trimmedKey]}`;
        }
        return match;
      });
      fs.writeFileSync(destFile, content, 'utf8');
    }
    filesCreated++;
  }

  console.log(`✅ Đã xuất thành công ${filesCreated} files với ${replacedCount} keys đã dịch!`);
  console.log(`📁 Files đã sẵn sàng tại: ${outputDir}`);
}

if (require.main === module) {
  exportTerraria();
}

export { exportTerraria };
