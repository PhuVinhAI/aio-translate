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

function exportTerrariaModSource(): void {
  const MOD_NAME = "TerrariaVietHoaAIO";
  console.log(`\n=== [Terraria 5] Xuất dạng MÃ NGUỒN MOD (Chuẩn hóa Key an toàn) ===`);

  const outputModDir = "C:/Users/tomis/OneDrive/Tài liệu/My Games/Terraria/tModLoader/ModSources/" + MOD_NAME;
  const localizationDir = path.join(outputModDir, 'Localization');

  const mergedXml = PATHS.TERRARIA.TEMP_MERGED;
  const mappingFile = PATHS.TERRARIA.MAPPING;

  if (!fs.existsSync(mergedXml) || !fs.existsSync(mappingFile)) {
    console.error(`❌ Thiếu file XML hoặc Mapping!`);
    process.exit(1);
  }

  const translatedEntries = parseXMLToMap(fs.readFileSync(mergedXml, 'utf8'));
  const mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8')) as Record<string, MappingEntry>;

  const allTranslations: Record<string, Record<string, string>> = {};

  translatedEntries.forEach((viTextRaw, hashKey) => {
    const mapInfo = mapping[hashKey];
    if (!mapInfo) return;

    const viText = unescapeXml(viTextRaw);
    const modId = mapInfo.file.split(/[/\\]/)[0];

    if (!allTranslations[modId]) allTranslations[modId] = {};

    let cleanViText = viText.trim();
    cleanViText = cleanViText.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\"/g, '"').replace(/\\'/g, "'");

    while ((cleanViText.startsWith('"') && cleanViText.endsWith('"')) || (cleanViText.startsWith("'''") && cleanViText.endsWith("'''"))) {
      if (cleanViText.startsWith('"')) cleanViText = cleanViText.substring(1, cleanViText.length - 1).trim();
      if (cleanViText.startsWith("'''")) cleanViText = cleanViText.substring(3, cleanViText.length - 3).trim();
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

    allTranslations[modId][mapInfo.originalKey] = finalValue;
  });

  if (fs.existsSync(outputModDir)) fs.rmSync(outputModDir, { recursive: true, force: true });
  fs.mkdirSync(localizationDir, { recursive: true });

  let hjsonContent = "Mods: {\n";
  for (const [modId, keys] of Object.entries(allTranslations)) {
    console.log(`📦 Đang gộp Mod: ${modId} (${Object.keys(keys).length} câu)`);
    hjsonContent += `\t${modId}: {\n`;
    for (const [key, val] of Object.entries(keys)) {
      // PHÒNG VỆ TÊN KEY: Nếu key chứa dấu ngoặc vuông hoặc dấu chấm, phải bọc ngoặc kép cho KEY
      const safeKey = /[\s\[\]\.]/.test(key) ? `"${key}"` : key;
      hjsonContent += `\t\t${safeKey}: ${val}\n`;
    }
    hjsonContent += `\t}\n`;
  }
  hjsonContent += "}";
  fs.writeFileSync(path.join(localizationDir, 'en-US.hjson'), hjsonContent, 'utf8');

  const buildTxt = [`displayName = Terraria Vietnamese AIO`, `author = TomiWixoss AI`, `version = 1.0.0`, `modReferences = ${Object.keys(allTranslations).join(', ')}`, `sortAfter = ${Object.keys(allTranslations).join(', ')}`].join('\n');
  fs.writeFileSync(path.join(outputModDir, 'build.txt'), buildTxt, 'utf8');
  fs.writeFileSync(path.join(outputModDir, 'description.txt'), "Bản dịch Tiếng Việt tổng hợp duy nhất cho toàn bộ Modpack.", 'utf8');
  fs.writeFileSync(path.join(outputModDir, `${MOD_NAME}.cs`), `using Terraria.ModLoader;\nnamespace ${MOD_NAME} { public class ${MOD_NAME} : Mod { } }`, 'utf8');
  fs.writeFileSync(path.join(outputModDir, `${MOD_NAME}.csproj`), `<Project Sdk="Microsoft.NET.Sdk">\n\t<Import Project="..\\tModLoader.targets" />\n\t<PropertyGroup>\n\t\t<TargetFramework>net8.0</TargetFramework>\n\t\t<ImplicitUsings>enable</ImplicitUsings>\n\t\t<Nullable>enable</Nullable>\n\t</PropertyGroup>\n</Project>`, 'utf8');

  console.log(`\n✅ Đã xuất bản Mod với cơ chế bảo vệ tên Key.`);
}

if (require.main === module) exportTerrariaModSource();
export { exportTerrariaModSource };
