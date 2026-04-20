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

const SYSTEM_KEYS = new Set(['Mods', 'Localization', 'Configs']);

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

// Hàm đệ quy để chuyển đối tượng thành chuỗi HJSON có thụt lề chuẩn và BẢO VỆ KEY
function toHjson(obj: any, indent: number = 0): string {
  const tabs = '\t'.repeat(indent);
  let res = "";

  for (const [key, val] of Object.entries(obj)) {
    // PHÒNG VỆ TÊN KEY TOÀN CỤC: Bọc ngoặc kép nếu key chứa ký tự nhạy cảm ở BẤT KỲ TẦNG NÀO
    const safeKey = /[\s\[\]\.]/.test(key) ? `"${key}"` : key;

    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      res += `${tabs}${safeKey}: {\n${toHjson(val, indent + 1)}${tabs}}\n`;
    } else {
      res += `${tabs}${safeKey}: ${val}\n`;
    }
  }
  return res;
}

function exportTerrariaModSource(): void {
  const MOD_NAME = "TerrariaVietHoaAIO";
  console.log(`\n=== [Terraria 5] Xuất dạng MÃ NGUỒN MOD (Cây Đa Tầng & Key An Toàn) ===`);

  const mergedXml = PATHS.TERRARIA.TEMP_MERGED;
  const mappingFile = PATHS.TERRARIA.MAPPING;

  if (!fs.existsSync(mergedXml) || !fs.existsSync(mappingFile)) {
    console.error(`❌ Thiếu file XML hoặc Mapping!`);
    process.exit(1);
  }

  const translatedEntries = parseXMLToMap(fs.readFileSync(mergedXml, 'utf8'));
  const mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8')) as Record<string, MappingEntry>;

  const rootObj: any = { Mods: {} };

  translatedEntries.forEach((viTextRaw, hashKey) => {
    const mapInfo = mapping[hashKey];
    if (!mapInfo) return;

    const viText = unescapeXml(viTextRaw);
    const modId = mapInfo.file.split(/[/\\]/)[0];
    const keyPath = mapInfo.originalKey;

    let cleanViText = viText.trim();
    cleanViText = cleanViText.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\"/g, '"').replace(/\\'/g, "'");

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

    setDeep(rootObj.Mods, `${modId}.${keyPath}`, finalValue);
  });

  const outputModDir = "C:/Users/tomis/OneDrive/Tài liệu/My Games/Terraria/tModLoader/ModSources/" + MOD_NAME;
  const localizationDir = path.join(outputModDir, 'Localization');
  if (fs.existsSync(outputModDir)) fs.rmSync(outputModDir, { recursive: true, force: true });
  fs.mkdirSync(localizationDir, { recursive: true });

  console.log(`📦 Đang xây dựng cây ngôn ngữ bảo mật cao...`);
  const hjsonContent = toHjson(rootObj);
  fs.writeFileSync(path.join(localizationDir, 'en-US.hjson'), hjsonContent, 'utf8');

  const buildTxt = [`displayName = Terraria Vietnamese AIO`, `author = TomiWixoss AI`, `version = 1.0.0`, `modReferences = ${Object.keys(rootObj.Mods).join(', ')}`, `sortAfter = ${Object.keys(rootObj.Mods).join(', ')}`].join('\n');
  fs.writeFileSync(path.join(outputModDir, 'build.txt'), buildTxt, 'utf8');
  fs.writeFileSync(path.join(outputModDir, 'description.txt'), "Bản dịch Tiếng Việt tổng hợp duy nhất cho toàn bộ Modpack.\nCấu trúc cây đa tầng bảo mật tuyệt đối.", 'utf8');
  fs.writeFileSync(path.join(outputModDir, `${MOD_NAME}.cs`), `using Terraria.ModLoader;\nnamespace ${MOD_NAME} { public class ${MOD_NAME} : Mod { } }`, 'utf8');
  fs.writeFileSync(path.join(outputModDir, `${MOD_NAME}.csproj`), `<Project Sdk="Microsoft.NET.Sdk">\n\t<Import Project="..\\tModLoader.targets" />\n\t<PropertyGroup>\n\t\t<TargetFramework>net8.0</TargetFramework>\n\t\t<ImplicitUsings>enable</ImplicitUsings>\n\t\t<Nullable>enable</Nullable>\n\t</PropertyGroup>\n</Project>`, 'utf8');

  console.log(`\n✅ Đã hoàn thành xuất bản với cơ chế Bảo Vệ Key đa tầng.`);
}

if (require.main === module) exportTerrariaModSource();
export { exportTerrariaModSource };
