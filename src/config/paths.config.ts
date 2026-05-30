import path from 'path';
import { PathsConfig } from '../types';

const ROOT = path.resolve(__dirname, '..', '..');

export const PATHS: PathsConfig = {
  // Thư mục gốc
  ROOT,

  // Data directories
  DATA: path.join(ROOT, 'data'),

  // Temp
  TEMP: {
    DIR: path.join(ROOT, 'temp'),
    NEW_CONTENT: path.join(ROOT, 'temp', 'new_content.xml'),
    TRANSLATED: path.join(ROOT, 'temp', 'translated.xml'),
    BATCHES: path.join(ROOT, 'temp', 'batches'),
    PROGRESS: path.join(ROOT, 'temp', 'progress.json'),
  },

  // Minecraft Mods workflow
  MINECRAFT: {
    INPUT_JSON: path.join(ROOT, 'data', 'minecraft', 'extracted.json'),
    OUTPUT_DIR: path.join(ROOT, 'output', 'minecraft', 'resourcepack'),

    TEMP_EN_XML: path.join(ROOT, 'temp', 'minecraft', 'en.xml'),
    TEMP_NEW: path.join(ROOT, 'temp', 'minecraft', 'new.xml'),
    TEMP_TRANSLATED: path.join(ROOT, 'temp', 'minecraft', 'translated.xml'),
    TEMP_MERGED: path.join(ROOT, 'temp', 'minecraft', 'merged.xml'),

    MAPPING: path.join(ROOT, 'data', 'minecraft', 'mapping.json'),
    REVERSE_MAPPING: path.join(ROOT, 'data', 'minecraft', 'reverse_mapping.json'),
  },

  // FTB Quests workflow
  FTBQUESTS: {
    INPUT_DIR: path.join(ROOT, 'input', 'ftbquests'),
    OUTPUT_DIR: path.join(ROOT, 'output', 'ftbquests'),

    TEMP_EN_XML: path.join(ROOT, 'temp', 'ftbquests', 'en.xml'),
    TEMP_NEW: path.join(ROOT, 'temp', 'ftbquests', 'new.xml'),
    TEMP_TRANSLATED: path.join(ROOT, 'temp', 'ftbquests', 'translated.xml'),
    TEMP_MERGED: path.join(ROOT, 'temp', 'ftbquests', 'merged.xml'),

    MAPPING: path.join(ROOT, 'data', 'ftbquests', 'mapping.json'),
    REVERSE_MAPPING: path.join(ROOT, 'data', 'ftbquests', 'reverse_mapping.json'),
  },

  // Terraria workflow
  TERRARIA: {
    INPUT_DIR: path.join(ROOT, 'input', 'terraria'),
    OUTPUT_DIR: path.join(ROOT, 'output', 'terraria'),

    TEMP_EN_XML: path.join(ROOT, 'temp', 'terraria', 'en.xml'),
    TEMP_NEW: path.join(ROOT, 'temp', 'terraria', 'new.xml'),
    TEMP_TRANSLATED: path.join(ROOT, 'temp', 'terraria', 'translated.xml'),
    TEMP_MERGED: path.join(ROOT, 'temp', 'terraria', 'merged.xml'),

    MAPPING: path.join(ROOT, 'data', 'terraria', 'mapping.json'),
    REVERSE_MAPPING: path.join(ROOT, 'data', 'terraria', 'reverse_mapping.json'),
  },

  // Paralives workflow (TSV localization)
  PARALIVES: {
    INPUT_DIR: path.join(ROOT, 'input', 'paralives'),
    OUTPUT_DIR: path.join(ROOT, 'output', 'paralives'),

    TEMP_EN_XML: path.join(ROOT, 'temp', 'paralives', 'en.xml'),
    TEMP_NEW: path.join(ROOT, 'temp', 'paralives', 'new.xml'),
    TEMP_TRANSLATED: path.join(ROOT, 'temp', 'paralives', 'translated.xml'),

    MAPPING: path.join(ROOT, 'data', 'paralives', 'mapping.json'),
  },
};

export default PATHS;
