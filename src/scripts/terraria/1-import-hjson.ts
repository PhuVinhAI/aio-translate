import * as fs from 'fs';
import * as path from 'path';
import { PATHS } from '../../config/paths.config';
import { escapeXml } from '../../utils/xml-parser';
import { backupFile } from '../../utils/backup';
import { generateHashKey } from '../../utils/hash';

interface MappingEntry {
  file: string;
  originalKey: string;
  isMultiline: boolean;
  isJson: boolean;
  jsonPath?: string;
  originalValue: string;
}

const SYSTEM_KEYS = new Set(['Mods', 'Localization', 'Configs']);

function walkDir(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walkDir(filePath, fileList);
    } else if (filePath.endsWith('.hjson') || filePath.endsWith('.json')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function importTerraria(): void {
  const inputDir = PATHS.TERRARIA.INPUT_DIR;
  const outputXml = PATHS.TERRARIA.TEMP_EN_XML;
  const mappingFile = PATHS.TERRARIA.MAPPING;

  console.log('\n=== [Terraria 1] Import HJSON/JSON → XML (Hậu Kiểm Thông Minh) ===');

  const sourceDir = "C:/Users/tomis/Docs/aio-translate/ModLocalization";
  const activeSourceDir = fs.existsSync(inputDir) && fs.readdirSync(inputDir).length > 0 ? inputDir : sourceDir;

  if (fs.existsSync(outputXml)) fs.unlinkSync(outputXml);
  if (fs.existsSync(mappingFile)) fs.unlinkSync(mappingFile);

  const locFiles = walkDir(activeSourceDir);
  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<STBLKeyStringList>\n';
  const mapping: Record<string, MappingEntry> = {};
  let count = 0;

  // REGEX NỚI LỎNG: Lấy Key và toàn bộ phần còn lại của dòng
  const hjsonRegex = /^[ \t]*([\w\.\-]+)\s*:\s*('''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|[^\n\r]+)/gm;

  locFiles.forEach((file: string) => {
    const relPath = path.relative(activeSourceDir, file).replace(/\\/g, '/');
    const content = fs.readFileSync(file, 'utf8');

    if (file.endsWith('.json')) {
      try {
        const jsonData = JSON.parse(content.replace(/^\uFEFF/, ''));
        const processNode = (node: any, jsonPath: string) => {
          if (typeof node === 'string') {
            if (node.trim() === "" || node.startsWith('{$')) return;
            const hashKey = generateHashKey(`${relPath}|||${jsonPath}|||${count}`);
            xml += `  <Text Key="${hashKey}">${escapeXml(node)}</Text>\n`;
            mapping[hashKey] = { file: relPath, originalKey: jsonPath, isMultiline: false, isJson: true, jsonPath: jsonPath, originalValue: node };
            count++;
          } else if (Array.isArray(node)) {
            node.forEach((item, index) => processNode(item, `${jsonPath}[${index}]`));
          } else if (node !== null && typeof node === 'object') {
            Object.entries(node).forEach(([key, value]) => processNode(value, jsonPath ? `${jsonPath}.${key}` : key));
          }
        };
        processNode(jsonData, "");
      } catch (e) { }
    } else {
      let match;
      while ((match = hjsonRegex.exec(content)) !== null) {
        const originalKey = match[1].trim();
        let rawValue = match[2].trim();

        // HẬU KIỂM: Nếu giá trị bắt đầu bằng { hoặc là Key hệ thống -> BỎ QUA
        if (rawValue.startsWith('{') || SYSTEM_KEYS.has(originalKey)) continue;

        let isMultiline = false;
        let textValue = "";

        if (rawValue.startsWith("'''") && rawValue.endsWith("'''")) {
          isMultiline = true;
          textValue = rawValue.substring(3, rawValue.length - 3).trim();
        } else if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
          textValue = rawValue.substring(1, rawValue.length - 1);
        } else {
          textValue = rawValue;
          const commentIdx = textValue.indexOf('#');
          if (commentIdx !== -1) textValue = textValue.substring(0, commentIdx).trim();
        }

        if (!textValue || textValue.trim() === "" || textValue.startsWith('{$')) continue;

        const hashKey = generateHashKey(`${relPath}|||${originalKey}|||${count}`);
        xml += `  <Text Key="${hashKey}">${escapeXml(textValue)}</Text>\n`;
        mapping[hashKey] = { file: relPath, originalKey: originalKey, isMultiline: isMultiline, isJson: false, originalValue: rawValue };
        count++;
      }
    }
  });

  xml += '</STBLKeyStringList>';
  fs.writeFileSync(outputXml, xml, 'utf8');
  fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2), 'utf8');
  console.log(`✅ Đã Import sạch sẽ: ${count} entries.`);
}

if (require.main === module) importTerraria();
export { importTerraria };
