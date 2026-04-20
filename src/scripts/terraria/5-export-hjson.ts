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
  console.log(`\n=== [Terraria 5] Xuất dạng MÃ NGUỒN MOD (Đồng bộ tuyệt đối) ===`);

  const inputDir = fs.readdirSync(PATHS.TERRARIA.INPUT_DIR).length > 0
    ? PATHS.TERRARIA.INPUT_DIR
    : "C:/Users/tomis/Docs/aio-translate/ModLocalization";

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

  const fileTranslations: Record<string, string[]> = {};

  translatedEntries.forEach((viTextRaw, hashKey) => {
    const mapInfo = mapping[hashKey];
    if (!mapInfo) return;

    const viText = unescapeXml(viTextRaw);
    if (!fileTranslations[mapInfo.file]) fileTranslations[mapInfo.file] = [];

    let finalValue = "";
    if (mapInfo.isMultiline) {
      // Đảm bảo dấu đóng ''' luôn ở dòng mới và thụt lề chuẩn
      finalValue = `'''\n${viText.trim()}\n\t\t\t'''`;
    } else if (mapInfo.isJson || mapInfo.originalValue.startsWith('"')) {
      finalValue = `"${viText.replace(/"/g, '\\"')}"`;
    } else {
      let finalViText = viText;
      // PHÒNG VỆ HJSON: Nếu văn bản bắt đầu bằng { hoặc [ (biến số/mã màu), bắt buộc phải bọc ngoặc kép
      const trimmed = viText.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.includes(': ')) {
        finalViText = `"${viText.replace(/"/g, '\\"')}"`;
      }
      finalValue = finalViText;
    }
    fileTranslations[mapInfo.file].push(finalValue);
  });

  if (fs.existsSync(outputModDir)) fs.rmSync(outputModDir, { recursive: true, force: true });
  fs.mkdirSync(localizationDir, { recursive: true });

  const modIds = ["AlchemistNPCLite", "AutoTrash", "BlueMoon", "BossChecklist", "BTitles", "CalamityAmmo", "CalamityCrossmodVulnerabilities", "CalamityHunt", "CalamityMod", "CalamityModMusic", "CalValEX", "CatalystMod", "Clamity", "ClamityMusic", "ColoredCalRelics", "ColoredDamageTypes", "Daybreak", "EvilPylon", "Fargowiltas", "FishingMinigame", "HypnosMod", "InfernumMode", "InfernumModeMusic", "LargeHerbs", "Luminance", "MagicRecipeIntegrator", "MagicStorage", "miningcracks_take_on_luiafk", "MusicDisplay", "NoxusBoss", "OreExcavator", "RecipeBrowser", "RevengeancePlus", "SerousCommonLib", "ShopExpander", "StructureHelper", "SubworldLibrary", "TeamSpectate", "UnCalamityModMusic"];
  const buildTxt = [`displayName = Terraria Vietnamese AIO`, `author = TomiWixoss AI`, `version = 1.0.0`, `modReferences = ${modIds.join(', ')}`, `sortAfter = ${modIds.join(', ')}`].join('\n');
  fs.writeFileSync(path.join(outputModDir, 'build.txt'), buildTxt, 'utf8');
  fs.writeFileSync(path.join(outputModDir, 'description.txt'), "Bản dịch Tiếng Việt tổng hợp cho toàn bộ Modpack.", 'utf8');
  fs.writeFileSync(path.join(outputModDir, `${MOD_NAME}.cs`), `using Terraria.ModLoader;\nnamespace ${MOD_NAME} { public class ${MOD_NAME} : Mod { } }`, 'utf8');
  fs.writeFileSync(path.join(outputModDir, `${MOD_NAME}.csproj`), `<Project Sdk="Microsoft.NET.Sdk">\n\t<Import Project="..\\tModLoader.targets" />\n\t<PropertyGroup>\n\t\t<TargetFramework>net8.0</TargetFramework>\n\t\t<ImplicitUsings>enable</ImplicitUsings>\n\t\t<Nullable>enable</Nullable>\n\t</PropertyGroup>\n</Project>`, 'utf8');

  // REGEX NỚI LỎNG (Đồng bộ 100% với Import)
  const hjsonRegex = /^[ \t]*([\w\.\-]+)\s*:\s*('''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|[^\n\r]+)/gm;

  let totalReplaced = 0;

  for (const relPath of Object.keys(fileTranslations)) {
    const srcFile = path.join(inputDir, relPath);
    const modId = relPath.split(/[/\\]/)[0];

    const pathParts = relPath.split(/[/\\]/);
    const subPath = pathParts.slice(1).join('.');
    const fileNameWithoutExt = subPath.lastIndexOf('.') !== -1 ? subPath.substring(0, subPath.lastIndexOf('.')) : subPath;
    const destFile = path.join(localizationDir, `en-US_Mods.${modId}${fileNameWithoutExt ? '.' + fileNameWithoutExt : ''}.hjson`);

    if (relPath.endsWith('.json')) {
      try {
        const rawContent = fs.readFileSync(srcFile, 'utf8');
        const cleanContent = rawContent.replace(/^\uFEFF/, '');
        const jsonData = JSON.parse(cleanContent);
        fs.writeFileSync(destFile, JSON.stringify(jsonData, null, 4), 'utf8');
      } catch (e) { }
    } else {
      let content = fs.readFileSync(srcFile, 'utf8');
      const translations = fileTranslations[relPath];
      let index = 0;

      content = content.replace(hjsonRegex, (match, key, value) => {
        const trimmedKey = key.trim();
        const rawValue = value.trim();

        // HẬU KIỂM: Bỏ qua y hệt lúc Import
        if (rawValue.startsWith('{') || SYSTEM_KEYS.has(trimmedKey)) return match;
        if (!rawValue || rawValue === '""' || rawValue === "''" || rawValue.startsWith('{$')) {
          return match;
        }

        if (index < translations.length) {
          const newVal = translations[index++];
          totalReplaced++;

          // TÌM VỊ TRÍ CHÍNH XÁC CỦA VALUE ĐỂ THAY THẾ (Tránh thay thế nhầm vào Key)
          const lastIndex = match.lastIndexOf(value);
          return match.substring(0, lastIndex) + newVal;
        }
        return match;
      });

      const needsWrapping = !content.trim().startsWith('Mods:') && !content.includes(`${modId}:`);
      if (needsWrapping) {
        content = `Mods: {\n\t${modId}: {\n${content.split('\n').map(line => '\t\t' + line).join('\n')}\n\t}\n}`;
      }
      fs.writeFileSync(destFile, content, 'utf8');
    }
  }

  console.log(`✅ Đã đóng gói Mod với logic Hậu Kiểm đồng bộ.`);
  console.log(`📊 Tổng cộng ${totalReplaced} câu thoại đã được thay thế.`);
}

if (require.main === module) exportTerrariaModSource();
export { exportTerrariaModSource };
