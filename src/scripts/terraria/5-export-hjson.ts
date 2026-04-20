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

function exportTerrariaMod(): void {
  console.log('\n=== [Terraria 5] Xuất dạng MOD Việt Hóa chuẩn (Thông minh) ===');

  const inputDir = fs.readdirSync(PATHS.TERRARIA.INPUT_DIR).length > 0
    ? PATHS.TERRARIA.INPUT_DIR
    : "C:/Users/tomis/Docs/aio-translate/ModLocalization";

  const outputModDir = path.join(PATHS.TERRARIA.OUTPUT_DIR, 'TerrariaVietHoaAIO');
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

  // 1. Tạo file build.txt với danh sách tham chiếu đầy đủ
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

  // Regex cải tiến: Chỉ bắt Key: Value, không bắt Key: { (đối tượng)
  const hjsonRegex = /([\w\.\-]+)\s*:\s*('''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|[^#\n\r\{\}\[\]]+)(?!\s*\{)/g;
  const jsonRegex = /"([\w\.\-]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;

  // Danh sách các Key hệ thống tuyệt đối không được ghi đè (vì chúng xác định cấu trúc đối tượng)
  const systemKeys = new Set(['Mods', 'Localization', 'Configs']);
  let replacedCount = 0;
  let filesCreated = 0;

  for (const [relPath, data] of Object.entries(fileData)) {
    const srcFile = path.join(inputDir, relPath);
    const modId = relPath.split(/[/\\]/)[0]; // Lấy tên Mod từ thư mục cha

    // Tên file đích (phẳng hóa để tModLoader dễ nạp)
    const flatFileName = relPath.replace(/[/\\]/g, '.');
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

        // Luôn bọc JSON nếu chưa có cấu trúc chuẩn (Tùy biến cho Calamity Dialogue)
        let jsonString = JSON.stringify(jsonData, null, 4);
        fs.writeFileSync(destFile, jsonString, 'utf8');
      } catch (e) {
        console.error(`❌ Lỗi ghi JSON file ${relPath}: ${(e as Error).message}`);
      }
    } else {
      // XỬ LÝ HJSON
      let content = fs.readFileSync(srcFile, 'utf8');

      // Thực hiện thay thế văn bản đã dịch
      content = content.replace(hjsonRegex, (match, key) => {
        const trimmedKey = key.trim();

        // BỎ QUA nếu là key hệ thống hoặc không có bản dịch
        if (systemKeys.has(trimmedKey) || !data.hjson[trimmedKey]) {
          return match;
        }

        replacedCount++;
        return `${key}: ${data.hjson[trimmedKey]}`;
      });

      // KIỂM TRA LỚP BỌC Mods: { ModId: { ... } }
      // Nếu file chưa có "Mods:" ở những dòng đầu tiên, chúng ta sẽ tự động bọc nó lại
      const needsWrapping = !content.trim().startsWith('Mods:') && !content.includes(`${modId}:`);

      if (needsWrapping) {
        content = `Mods: {\n\t${modId}: {\n${content.split('\n').map(line => '\t\t' + line).join('\n')}\n\t}\n}`;
      }

      fs.writeFileSync(destFile, content, 'utf8');
    }
    filesCreated++;
  }

  console.log(`✅ Đã đóng gói Mod Việt Hóa thông minh tại: ${outputModDir}`);
  console.log(`📊 Đã xử lý ${filesCreated} files, ${replacedCount} câu thoại.`);
}

if (require.main === module) {
  exportTerrariaMod();
}

export { exportTerrariaMod };
