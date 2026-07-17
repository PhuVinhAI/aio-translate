import path from 'path';
import { PathsConfig } from '../types';

const ROOT = path.resolve(__dirname, '..', '..');
const GDT_CORE_ROOT = process.env.GDT_CORE_ROOT || path.resolve(ROOT, '..', 'Game.Dev.Tycoon.v1.7.9', 'gdt-core');
const GDT_CORE_LANGUAGE_DIR = path.join(GDT_CORE_ROOT, 'game', 'i18n', 'languages');

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

    AGENT: {
      DIR: path.join(ROOT, 'temp', 'minecraft', 'agent'),
      TASK_MD: path.join(ROOT, 'temp', 'minecraft', 'agent', 'AGENT_TASK.md'),
      CHUNKS_DIR: path.join(ROOT, 'temp', 'minecraft', 'agent', 'chunks'),
    },
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

    AGENT: {
      DIR: path.join(ROOT, 'temp', 'ftbquests', 'agent'),
      TASK_MD: path.join(ROOT, 'temp', 'ftbquests', 'agent', 'AGENT_TASK.md'),
      CHUNKS_DIR: path.join(ROOT, 'temp', 'ftbquests', 'agent', 'chunks'),
    },
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

    AGENT: {
      DIR: path.join(ROOT, 'temp', 'terraria', 'agent'),
      TASK_MD: path.join(ROOT, 'temp', 'terraria', 'agent', 'AGENT_TASK.md'),
      CHUNKS_DIR: path.join(ROOT, 'temp', 'terraria', 'agent', 'chunks'),
    },
  },

  // Paralives workflow (TSV localization)
  PARALIVES: {
    INPUT_DIR: path.join(ROOT, 'input', 'paralives'),
    OUTPUT_DIR: path.join(ROOT, 'output', 'paralives'),

    TEMP_EN_XML: path.join(ROOT, 'temp', 'paralives', 'en.xml'),
    TEMP_NEW: path.join(ROOT, 'temp', 'paralives', 'new.xml'),
    TEMP_TRANSLATED: path.join(ROOT, 'temp', 'paralives', 'translated.xml'),

    MAPPING: path.join(ROOT, 'data', 'paralives', 'mapping.json'),

    AGENT: {
      DIR: path.join(ROOT, 'temp', 'paralives', 'agent'),
      TASK_MD: path.join(ROOT, 'temp', 'paralives', 'agent', 'AGENT_TASK.md'),
      CHUNKS_DIR: path.join(ROOT, 'temp', 'paralives', 'agent', 'chunks'),
    },
  },

  // Game Dev Tycoon workflow (split JS localization packs)
  GDT: {
    CORE_ROOT: GDT_CORE_ROOT,
    CORE_LANGUAGE_DIR: GDT_CORE_LANGUAGE_DIR,
    CORE_VI_JS: path.join(GDT_CORE_LANGUAGE_DIR, 'vi.js'),
    CORE_MANIFEST: path.join(GDT_CORE_LANGUAGE_DIR, 'manifest.json'),

    INPUT_DIR: path.join(ROOT, 'input', 'gdt'),
    INPUT_VI_JS: path.join(ROOT, 'input', 'gdt', 'vi.js'),
    OUTPUT_DIR: path.join(ROOT, 'output', 'gdt'),
    OUTPUT_VI_JS: path.join(ROOT, 'output', 'gdt', 'vi.js'),

    TEMP_EN_XML: path.join(ROOT, 'temp', 'gdt', 'en.xml'),
    TEMP_NEW: path.join(ROOT, 'temp', 'gdt', 'new.xml'),
    TEMP_TRANSLATED: path.join(ROOT, 'temp', 'gdt', 'translated.xml'),

    MAPPING: path.join(ROOT, 'data', 'gdt', 'mapping.json'),

    AGENT: {
      DIR: path.join(ROOT, 'temp', 'gdt', 'agent'),
      TASK_MD: path.join(ROOT, 'temp', 'gdt', 'agent', 'AGENT_TASK.md'),
      CHUNKS_DIR: path.join(ROOT, 'temp', 'gdt', 'agent', 'chunks'),
    },
  },
};

export default PATHS;
