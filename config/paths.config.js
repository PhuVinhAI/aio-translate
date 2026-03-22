const path = require('path');

const ROOT = path.resolve(__dirname, '..');

module.exports = {
  // Thư mục gốc
  ROOT,

  // Data directories
  DATA: path.join(ROOT, 'data'),

  // Temp
  TEMP: {
    DIR: path.join(ROOT, 'data', 'temp'),
    NEW_CONTENT: path.join(ROOT, 'data', 'temp', 'new_content.xml'),
    TRANSLATED: path.join(ROOT, 'data', 'temp', 'translated.xml'),
    BATCHES: path.join(ROOT, 'data', 'temp', 'temp-batches-new-content'),
    PROGRESS: path.join(ROOT, 'data', 'temp', 'progress.json'),
  },

  // Minecraft Mods workflow
  MINECRAFT: {
    INPUT_JSON: path.join(ROOT, 'data', 'output_to_translate.json'),
    OUTPUT_DIR: path.join(ROOT, 'minecraft', 'resourcepacks', 'VietHoa_Modpack'),

    TEMP_EN_XML: path.join(ROOT, 'data', 'temp', 'minecraft-en.xml'),
    TEMP_NEW: path.join(ROOT, 'data', 'temp', 'minecraft-new.xml'),
    TEMP_TRANSLATED: path.join(ROOT, 'data', 'temp', 'minecraft-translated.xml'),
    TEMP_MERGED: path.join(ROOT, 'data', 'temp', 'minecraft-merged.xml'),

    MAPPING: path.join(ROOT, 'data', 'minecraft_mapping.json'),
    REVERSE_MAPPING: path.join(ROOT, 'data', 'minecraft_reverse_mapping.json'),
  },

  // FTB Quests workflow
  FTBQUESTS: {
    INPUT_DIR: path.join(ROOT, 'ftbquests', 'input'),
    OUTPUT_DIR: path.join(ROOT, 'ftbquests', 'output'),
    TEMP_EN_XML: path.join(ROOT, 'data', 'temp', 'ftbquests-en.xml'),
    TEMP_NEW: path.join(ROOT, 'data', 'temp', 'ftbquests-new.xml'),
    TEMP_TRANSLATED: path.join(ROOT, 'data', 'temp', 'ftbquests-translated.xml'),
    TEMP_MERGED: path.join(ROOT, 'data', 'temp', 'ftbquests-merged.xml'),
    MAPPING: path.join(ROOT, 'data', 'ftbquests_mapping.json'),
    REVERSE_MAPPING: path.join(ROOT, 'data', 'ftbquests_reverse_mapping.json'),
  },
};
