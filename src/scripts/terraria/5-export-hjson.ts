import * as fs from 'fs';
import * as path from 'path';
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

// Hàm hỗ trợ gán giá trị vào đối tượng lồng nhau dựa trên đường dẫn dấu chấm
function setDeep(obj: any, path: string, value: any) {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
}

// Hàm đệ quy để chuyển đối tượng thành chuỗi HJSON có thụt lề chuẩn
function toHjson(obj: any, indent: number = 0): string {
  const tabs = '\t'.repeat(indent);
  let res = "";

  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      res += `${tabs}${key}: {\n${toHjson(val, indent + 1)}${tabs}}\n`;
    } else {
      res += `${tabs}${key}: ${val}\n`;
    }
  }
  return res;
}

function exportTerrariaModSource(): void {
  const MOD_NAME = "TerrariaVietHoaAIO";
  console.log(`\n=== [Terraria 5] Xuất dạng MÃ NGUỒN MOD (Cấu trúc Cây Đa Tầng) ===`);

  const mergedXml = PATHS.TERRARIA.TEMP_MERGED;
  const mappingFile = PATHS.TERRARIA.MAPPING;

  if (!fs.existsSync(mergedXml) || !fs.existsSync(mappingFile)) {
    console.error(`❌ Thiếu file XML hoặc Mapping!`);
    process.exit(1);
  }

  const translatedEntries = parseXMLToMap(fs.readFileSync(mergedXml, 'utf8'));
  const mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8')) as Record<string, MappingEntry>;

  // Xây dựng cây dữ liệu khổng lồ: { Mods: { ModId: { ... } } }
  const rootObj: any = { Mods: {} };

  translatedEntries.forEach((viTextRaw, hashKey) => {
    const mapInfo = mapping[hashKey];
    if (!mapInfo) return;

    const viText = unescapeXml(viTextRaw);
    const modId = mapInfo.file.split(/[/\\]/)[0];
    const keyPath = mapInfo.originalKey;

    let cleanViText = viText.trim();
    // Giải mã các ký tự thoát AI có thể đã thêm
    cleanViText = cleanViText.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\"/g, '"').replace(/\\'/g, "'");

    // XÓA NHÁY THEO CẶP
    let changed = true;
    while (changed) {
      changed = false;
      if (cleanViText.startsWith("'''") && cleanViText.endsWith("'''")) {
        cleanViText = cleanViText.substring(3, cleanViText.length - 3).trim();
        changed = true;
      } else if (cleanViText.startsWith('"') && cleanViText.endsWith('"')) {
        cleanViText = cleanViText.substring(1, cleanViText.length - 1).trim();
        changed = true;
      } else if (cleanViText.startsWith("'") && cleanViText.endsWith("'")) {
        cleanViText = cleanViText.substring(1, cleanViText.length - 1).trim();
        changed = true;
      }
    }

    let finalValue = "";
    const hasNewline = cleanViText.includes('\n') || cleanViText.includes('\r');
    const hasInternalQuotes = cleanViText.includes('"') || cleanViText.includes("'");

    if (hasNewline || hasInternalQuotes) {
      finalValue = `'''\n${cleanViText}\n\t\t\t'''`;
    } else {
      const needsQuotes = /^[{\[\]\}:,]/.test(cleanViText) || cleanViText.includes(': ');
      finalValue = needsQuotes ? `"${cleanViText}"` : cleanViText;
    }

    // Gán vào cây dữ liệu (Tự động lồng nhau theo dấu chấm)
    setDeep(rootObj.Mods, `${modId}.${keyPath}`, finalValue);
  });

  // Tạo thư mục
  const outputModDir = "C:/Users/tomis/OneDrive/Tài liệu/My Games/Terraria/tModLoader/ModSources/" + MOD_NAME;
  const localizationDir = path.join(outputModDir, 'Localization');
  if (fs.existsSync(outputModDir)) fs.rmSync(outputModDir, { recursive: true, force: true });
  fs.mkdirSync(localizationDir, { recursive: true });

  // 1. Xuất file en-US.hjson duy nhất với cấu trúc cây
  console.log(`📦 Đang xây dựng cây ngôn ngữ cho 37 Mod...`);
  const hjsonContent = toHjson(rootObj);
  fs.writeFileSync(path.join(localizationDir, 'en-US.hjson'), hjsonContent, 'utf8');

  // 2. Tạo các file cấu hình mod
  const modIds = Object.keys(rootObj.Mods);
  const buildTxt = [
    `displayName = Terraria Vietnamese AIO`,
    `author = TomiWixoss AI`,
    `version = 1.0.0`,
    `modReferences = ${modIds.join(', ')}`,
    `sortAfter = ${modIds.join(', ')}`
  ].join('\n');
  fs.writeFileSync(path.join(outputModDir, 'build.txt'), buildTxt, 'utf8');
  fs.writeFileSync(path.join(outputModDir, 'description.txt'), "Bản dịch Tiếng Việt tổng hợp chuẩn cấu trúc phân tầng cho toàn bộ Modpack.", 'utf8');
  fs.writeFileSync(path.join(outputModDir, `${MOD_NAME}.cs`), `using Terraria.ModLoader;\nnamespace ${MOD_NAME} { public class ${MOD_NAME} : Mod { } }`, 'utf8');
  fs.writeFileSync(path.join(outputModDir, `${MOD_NAME}.csproj`), `<Project Sdk="Microsoft.NET.Sdk">\n\t<Import Project="..\\tModLoader.targets" />\n\t<PropertyGroup>\n\t\t<TargetFramework>net8.0</TargetFramework>\n\t\t<ImplicitUsings>enable</ImplicitUsings>\n\t\t<Nullable>enable</Nullable>\n\t</PropertyGroup>\n</Project>`, 'utf8');

  console.log(`\n✅ Đã hoàn thành xuất bản với cấu trúc Cây Đa Tầng.`);
  console.log(`👉 BƯỚC CUỐI: Vào game tModLoader > Develop Mods > Nhấn BUILD bản mod ${MOD_NAME}!`);
}

if (require.main === module) exportTerrariaModSource();
export { exportTerrariaModSource };
