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

  console.log('\n=== [Terraria 1] Import HJSON/JSON → XML ===');

  if (!fs.existsSync(inputDir)) {
    console.error(`❌ Không tìm thấy thư mục input: ${inputDir}`);
    console.log(`👉 ĐANG TỰ ĐỘNG QUÉT THƯ MỤC GỐC: C:/Users/tomis/Docs/aio-translate/ModLocalization`);
    // Nếu không có trong input, thử quét trực tiếp từ thư mục người dùng chỉ định
    const sourceDir = "C:/Users/tomis/Docs/aio-translate/ModLocalization";
    if (fs.existsSync(sourceDir)) {
        if (!fs.existsSync(inputDir)) fs.mkdirSync(inputDir, { recursive: true });
        // Ở đây ta cứ chạy trực tiếp trên sourceDir nếu inputDir trống
    } else {
        process.exit(1);
    }
  }

  const activeSourceDir = fs.readdirSync(inputDir).length > 0 ? inputDir : "C:/Users/tomis/Docs/aio-translate/ModLocalization";

  backupFile(outputXml);
  backupFile(mappingFile);

  const locFiles = walkDir(activeSourceDir);
  console.log(`📂 Tìm thấy ${locFiles.length} file localization từ ${activeSourceDir}`);

  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  xml += '<STBLKeyStringList>\n';

  const mapping: Record<string, MappingEntry> = {};
  let count = 0;

  // Regex cho HJSON: Key: "Value" hoặc Key: '''Value''' hoặc Key: Value
  const hjsonRegex = /([\w\.\-]+)\s*:\s*('''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|[^#\n\r\{\}\[\]]+)/g;

  locFiles.forEach((file: string) => {
    const relPath = path.relative(activeSourceDir, file).replace(/\\/g, '/');
    const content = fs.readFileSync(file, 'utf8');

    if (file.endsWith('.json')) {
      // XỬ LÝ JSON CHUẨN (Dialogue Calamity)
      try {
        // Xóa BOM nếu có trước khi parse
        const cleanContent = content.replace(/^\uFEFF/, '');
        const jsonData = JSON.parse(cleanContent);
        const processNode = (node: any, jsonPath: string) => {
          if (typeof node === 'string') {
            if (node.trim() === "" || node.startsWith('{$')) return;

            const hashKey = generateHashKey(`${relPath}|||${jsonPath}|||${count}`);
            xml += `  <Text Key="${hashKey}">${escapeXml(node)}</Text>\n`;
            mapping[hashKey] = {
              file: relPath,
              originalKey: jsonPath,
              isMultiline: false,
              isJson: true,
              jsonPath: jsonPath,
              originalValue: node
            };
            count++;
          } else if (Array.isArray(node)) {
            node.forEach((item, index) => processNode(item, `${jsonPath}[${index}]`));
          } else if (node !== null && typeof node === 'object') {
            Object.entries(node).forEach(([key, value]) => processNode(value, jsonPath ? `${jsonPath}.${key}` : key));
          }
        };
        processNode(jsonData, "");
      } catch (e) {
        console.error(`❌ Lỗi parse JSON file ${relPath}: ${(e as Error).message}`);
      }
    } else {
      // XỬ LÝ HJSON
      let match;
      while ((match = hjsonRegex.exec(content)) !== null) {
        const originalKey = match[1].trim();
        let rawValue = match[2].trim();
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
        mapping[hashKey] = {
          file: relPath,
          originalKey,
          isMultiline,
          isJson: false,
          originalValue: rawValue
        };
        count++;
      }
    }
  });

  xml += '</STBLKeyStringList>';

  if (!fs.existsSync(path.dirname(outputXml))) fs.mkdirSync(path.dirname(outputXml), { recursive: true });
  if (!fs.existsSync(path.dirname(mappingFile))) fs.mkdirSync(path.dirname(mappingFile), { recursive: true });

  fs.writeFileSync(outputXml, xml, 'utf8');
  fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2), 'utf8');

  console.log(`✅ Đã tạo XML: ${count} entries từ ${locFiles.length} files`);
}

if (require.main === module) {
  importTerraria();
}

export { importTerraria };
