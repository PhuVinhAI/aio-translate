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

function toHjson(obj: any, indent: number = 0): string {
  const tabs = '\t'.repeat(indent);
  let res = "";
  for (const [key, val] of Object.entries(obj)) {
    const safeKey = /[\s\[\]\.]/.test(key) ? `"${key}"` : key;
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      res += `${tabs}${safeKey}: {\n${toHjson(val, indent + 1)}${tabs}}\n`;
    } else {
      res += `${tabs}${safeKey}: ${val}\n`;
    }
  }
  return res;
}

function exportIndividualMods(): void {
  console.log(`\n=== [Terraria 5] Xuất hàng loạt MOD Việt Hóa riêng lẻ ===`);

  const inputDir = fs.readdirSync(PATHS.TERRARIA.INPUT_DIR).length > 0
    ? PATHS.TERRARIA.INPUT_DIR
    : "C:/Users/tomis/Docs/aio-translate/ModLocalization";

  const modSourcesDir = "C:/Users/tomis/OneDrive/Tài liệu/My Games/Terraria/tModLoader/ModSources/";
  const mergedXml = PATHS.TERRARIA.TEMP_MERGED;
  const mappingFile = PATHS.TERRARIA.MAPPING;

  const translatedEntries = parseXMLToMap(fs.readFileSync(mergedXml, 'utf8'));
  const mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8')) as Record<string, MappingEntry>;

  // Gom dữ liệu theo từng ModId
  const modsData: Record<string, any> = {};

  translatedEntries.forEach((viTextRaw, hashKey) => {
    const mapInfo = mapping[hashKey];
    if (!mapInfo) return;

    const modId = mapInfo.file.split(/[/\\]/)[0];
    if (!modsData[modId]) modsData[modId] = { Mods: {} };
    if (!modsData[modId].Mods[modId]) modsData[modId].Mods[modId] = {};

    const viText = unescapeXml(viTextRaw);
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
    if (cleanViText.includes('\n') || cleanViText.includes('\r') || cleanViText.includes('"') || cleanViText.includes("'")) {
      finalValue = `'''\n${cleanViText}\n\t\t\t'''`;
    } else {
      const needsQuotes = /^[{\[\]\}:,]/.test(cleanViText) || cleanViText.includes(': ');
      finalValue = needsQuotes ? `"${cleanViText}"` : cleanViText;
    }

    setDeep(modsData[modId].Mods[modId], mapInfo.originalKey, finalValue);
  });

  // Xuất bản từng Mod
  for (const [modId, data] of Object.entries(modsData)) {
    const newModName = `${modId}Vietnamese`;
    const targetPath = path.join(modSourcesDir, newModName);
    const locDir = path.join(targetPath, 'Localization');

    console.log(`📦 Đang tạo Mod: ${newModName}...`);

    if (fs.existsSync(targetPath)) fs.rmSync(targetPath, { recursive: true, force: true });
    fs.mkdirSync(locDir, { recursive: true });

    // 1. en-US.hjson
    fs.writeFileSync(path.join(locDir, 'en-US.hjson'), toHjson(data), 'utf8');

    // 2. build.txt
    const buildTxt = [
      `displayName = ${modId} Vietnamese`,
      `author = TomiWixoss AI`,
      `version = 1.0.0`,
      `modReferences = ${modId}`,
      `sortAfter = ${modId}`
    ].join('\n');
    fs.writeFileSync(path.join(targetPath, 'build.txt'), buildTxt, 'utf8');

    // 3. .cs
    fs.writeFileSync(path.join(targetPath, `${newModName}.cs`), `using Terraria.ModLoader;\nnamespace ${newModName} { public class ${newModName} : Mod { } }`, 'utf8');

    // 4. .csproj
    fs.writeFileSync(path.join(targetPath, `${newModName}.csproj`), `<Project Sdk="Microsoft.NET.Sdk">\n\t<Import Project="..\\tModLoader.targets" />\n\t<PropertyGroup>\n\t\t<TargetFramework>net8.0</TargetFramework>\n\t</PropertyGroup>\n</Project>`, 'utf8');
  }

  console.log(`\n✅ Đã xuất bản thành công ${Object.keys(modsData).length} bản Mod Việt Hóa riêng lẻ.`);
  console.log(`👉 BƯỚC CUỐI: Vào game tModLoader > Develop Mods > Nhấn BUILD ALL bản mod mới!`);
}

if (require.main === module) exportIndividualMods();
export { exportIndividualMods };
