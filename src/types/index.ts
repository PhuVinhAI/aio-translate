export interface TranslationConfig {
  api: {
    provider: string;
    model: string;
    temperature: number;
    top_p: number;
    max_tokens: number;
  };
  translation: {
    batchSize: number;
    parallelBatches: number;
    maxRetries: number;
    retryDelay: number;
  };
  systemPrompt: string;
  version: {
    format: string;
    autoIncrement: boolean;
  };
  backup: {
    enabled: boolean;
    keepVersions: number;
    timestampFormat: string;
  };
}

export interface PathsConfig {
  ROOT: string;
  DATA: string;
  TEMP: {
    DIR: string;
    NEW_CONTENT: string;
    TRANSLATED: string;
    BATCHES: string;
    PROGRESS: string;
  };
  MINECRAFT: {
    INPUT_JSON: string;
    OUTPUT_DIR: string;
    TEMP_EN_XML: string;
    TEMP_NEW: string;
    TEMP_TRANSLATED: string;
    TEMP_MERGED: string;
    MAPPING: string;
    REVERSE_MAPPING: string;
  };
  FTBQUESTS: {
    INPUT_DIR: string;
    OUTPUT_DIR: string;
    TEMP_EN_XML: string;
    TEMP_NEW: string;
    TEMP_TRANSLATED: string;
    TEMP_MERGED: string;
    MAPPING: string;
    REVERSE_MAPPING: string;
  };
  TERRARIA: {
    INPUT_DIR: string;
    OUTPUT_DIR: string;
    TEMP_EN_XML: string;
    TEMP_NEW: string;
    TEMP_TRANSLATED: string;
    TEMP_MERGED: string;
    MAPPING: string;
    REVERSE_MAPPING: string;
  };
  PARALIVES: {
    INPUT_DIR: string;
    OUTPUT_DIR: string;
    TEMP_EN_XML: string;
    TEMP_NEW: string;
    TEMP_TRANSLATED: string;
    MAPPING: string;
  };
  GDT: {
    CORE_ROOT: string;
    CORE_LANGUAGE_DIR: string;
    CORE_VI_JS: string;
    CORE_MANIFEST: string;
    INPUT_DIR: string;
    INPUT_VI_JS: string;
    OUTPUT_DIR: string;
    OUTPUT_VI_JS: string;
    TEMP_EN_XML: string;
    TEMP_NEW: string;
    TEMP_TRANSLATED: string;
    MAPPING: string;
  };
}

export interface ModLanguageData {
  [modId: string]: {
    [key: string]: string;
  };
}

export interface MappingEntry {
  key: string;
  originalValue: string;
  translatedValue?: string;
  file?: string;
  originalKey?: string;
  isArray?: boolean;
}

export interface TranslationMapping {
  [hash: string]: MappingEntry;
}
