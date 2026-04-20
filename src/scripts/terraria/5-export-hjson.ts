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

function setValueByPath(obj: any, jsonPath: string, value: string) {
  const parts = jsonPath.split(/[.\[\]]+/).filter(p => p !== "");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (i === parts.length - 1) {
      current[part] = value;
    } else {
      if (!current[part]) current[part] = {};
      current = current[part];
    }
  }
}

function exportTerrariaModSource(): void {
  const MOD_NAME = "TerrariaVietHoaAIO";
  console.log(`\n=== [Terraria 5] Xuất dạng MÃ NGUỒN MOD (ModSources) ===`);

  const inputDir = fs.readdirSync(PATHS.TERRARIA.INPUT_DIR).length > 0
    ? PATHS.TERRARIA.INPUT_DIR
    : "C:/Users/tomis/Docs/aio-translate/ModLocalization";

  // Thư mục đích trong ModSources của người dùng
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

  const fileData: Record<string, any> = {};

  translatedEntries.forEach((viTextRaw, hashKey) => {
    const mapInfo = mapping[hashKey];
    if (!mapInfo) return;

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
  });

  if (fs.existsSync(outputModDir)) fs.rmSync(outputModDir, { recursive: true, force: true });
  fs.mkdirSync(localizationDir, { recursive: true });

  // 1. Tạo file build.txt
  const modIds = [
    "AlchemistNPCLite", "AutoTrash", "BlueMoon", "BossChecklist", "BTitles",
    "CalamityAmmo", "CalamityCrossmodVulnerabilities", "CalamityHunt",
    "CalamityMod", "CalamityModMusic", "CalValEX", "CatalystMod", "Clamity",
    "ClamityMusic", "ColoredCalRelics", "ColoredDamageTypes", "Daybreak",
    "EvilPylon", "Fargowiltas", "FishingMinigame", "HypnosMod", "InfernumMode",
    "InfernumModeMusic", "LargeHerbs", "Luminance", "MagicRecipeIntegrator",
    "MagicStorage", "miningcracks_take_on_luiafk", "MusicDisplay", "NoxusBoss",
    "OreExcavator", "RecipeBrowser", "RevengeancePlus", "SerousCommonLib",
    "ShopExpander", "StructureHelper", "SubworldLibrary", "TeamSpectate",
    "UnCalamityModMusic"
  ];

  const buildTxt = [
    `displayName = Terraria Vietnamese AIO`,
    `author = TomiWixoss AI`,
    `version = 1.0.0`,
    `modReferences = ${modIds.join(', ')}`,
    `sortAfter = ${modIds.join(', ')}`
  ].join('\n');
  fs.writeFileSync(path.join(outputModDir, 'build.txt'), buildTxt, 'utf8');

  // 2. Tạo file description.txt
  const descriptionTxt = "Bản dịch Tiếng Việt tổng hợp cho toàn bộ Modpack.\nĐược dịch tự động bởi AI (NVIDIA Mistral-Small).";
  fs.writeFileSync(path.join(outputModDir, 'description.txt'), descriptionTxt, 'utf8');

  // 3. Tạo file .cs chuẩn ModSkeleton
  const csContent = `using Terraria.ModLoader;\n\nnamespace ${MOD_NAME}\n{\n\tpublic class ${MOD_NAME} : Mod\n\t{\n\t}\n}`;
  fs.writeFileSync(path.join(outputModDir, `${MOD_NAME}.cs`), csContent, 'utf8');

  // 4. Tạo file .csproj
  const csprojContent = `<Project Sdk="Microsoft.NET.Sdk">\n\t<Import Project="..\\tModLoader.targets" />\n\t<PropertyGroup>\n\t\t<TargetFramework>net8.0</TargetFramework>\n\t\t<ImplicitUsings>enable</ImplicitUsings>\n\t\t<Nullable>enable</Nullable>\n\t</PropertyGroup>\n</Project>`;
  fs.writeFileSync(path.join(outputModDir, `${MOD_NAME}.csproj`), csprojContent, 'utf8');

  const hjsonRegex = /([\w\.\-]+)\s*:\s*('''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|[^#\n\r\{\}\[\]]+)(?!\s*\{)/g;
  const systemKeys = new Set(['Mods', 'Localization', 'Configs']);

  let replacedCount = 0;
  let filesCreated = 0;

  for (const [relPath, data] of Object.entries(fileData)) {
    const srcFile = path.join(inputDir, relPath);
    const modId = relPath.split(/[/\\]/)[0];

    // Quy tắc đặt tên file: en-US_Mods.TênMod.TênFileGốc.hjson
    const flatFileName = `en-US_Mods.${modId}.${relPath.replace(/[/\\]/g, '.')}.hjson`;
    const destFile = path.join(localizationDir, flatFileName);

    if (relPath.endsWith('.json')) {
      try {
        const rawContent = fs.readFileSync(srcFile, 'utf8');
        const cleanContent = rawContent.replace(/^\uFEFF/, '');
        const jsonData = JSON.parse(cleanContent);
        Object.entries(data.json).forEach(([jsonPath, translatedValue]) => {
          setValueByPath(jsonData, jsonPath, translatedValue as string);
          replacedCount++;
        });
        fs.writeFileSync(destFile, JSON.stringify(jsonData, null, 4), 'utf8');
      } catch (e) {
        console.error(`❌ Lỗi ghi JSON file ${relPath}: ${(e as Error).message}`);
      }
    } else {
      let content = fs.readFileSync(srcFile, 'utf8');
      content = content.replace(hjsonRegex, (match, key) => {
        const trimmedKey = key.trim();
        if (systemKeys.has(trimmedKey) || !data.hjson[trimmedKey]) return match;
        replacedCount++;
        return `${key}: ${data.hjson[trimmedKey]}`;
      });

      const needsWrapping = !content.trim().startsWith('Mods:') && !content.includes(`${modId}:`);
      if (needsWrapping) {
        content = `Mods: {\n\t${modId}: {\n${content.split('\n').map(line => '\t\t' + line).join('\n')}\n\t}\n}`;
      }
      fs.writeFileSync(destFile, content, 'utf8');
    }
    filesCreated++;
  }

  console.log(`✅ Đã tạo mã nguồn Mod tại: ${outputModDir}`);
  console.log(`📊 Đã xử lý ${filesCreated} files, ${replacedCount} câu thoại.`);
  console.log(`👉 BƯỚC CUỐI: Vào game tModLoader > Develop Mods > Nhấn BUILD bản mod ${MOD_NAME}!`);
}

if (require.main === module) {
  exportTerrariaModSource();
}

export { exportTerrariaModSource };
