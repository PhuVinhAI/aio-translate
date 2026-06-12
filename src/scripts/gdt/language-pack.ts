import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import { generateHashKey } from '../../utils/hash';

export interface GdtLanguageEntry {
  value: string;
  comment?: string;
  translation: string;
}

export interface GdtLanguagePack {
  values: GdtLanguageEntry[];
}

export interface GdtMappingEntry {
  key: string;
  originalValue: string;
  translatedValue?: string;
  comment?: string;
  index: number;
}

export type GdtMapping = Record<string, GdtMappingEntry>;

export function ensureDir(fileOrDir: string, isDir: boolean = false): void {
  const dir = isDir ? fileOrDir : path.dirname(fileOrDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function readLanguages(file: string): Record<string, unknown> {
  const source = fs.readFileSync(file, 'utf8');
  const context: { Languages?: Record<string, unknown> } = {};
  vm.createContext(context);
  vm.runInContext(source, context, { filename: file });
  if (!context.Languages || typeof context.Languages !== 'object') {
    throw new Error(`${file} did not define global Languages`);
  }
  return context.Languages;
}

export function readLanguagePack(file: string, lang: string): GdtLanguagePack {
  const languages = readLanguages(file);
  const pack = languages[lang] as GdtLanguagePack | undefined;
  if (!pack || !Array.isArray(pack.values)) {
    throw new Error(`${file} did not define Languages[${JSON.stringify(lang)}].values`);
  }
  return pack;
}

export function createEmptyVietnamesePack(referenceFile: string, referenceLang: string): GdtLanguagePack {
  const reference = readLanguagePack(referenceFile, referenceLang);
  return {
    values: reference.values.map(entry => {
      const next: GdtLanguageEntry = {
        value: entry.value,
        translation: ''
      };
      if (Object.prototype.hasOwnProperty.call(entry, 'comment')) {
        next.comment = entry.comment;
      }
      return next;
    })
  };
}

export function makeEntryKey(entry: Pick<GdtLanguageEntry, 'value' | 'comment'>, occurrence: number): string {
  const baseKey = generateHashKey('gdt', entry.value, entry.comment || '');
  return occurrence === 0 ? baseKey : `${baseKey}_${occurrence + 1}`;
}

export function makeEntryKeys(entries: Array<Pick<GdtLanguageEntry, 'value' | 'comment'>>): string[] {
  const occurrences = new Map<string, number>();
  return entries.map(entry => {
    const baseKey = generateHashKey('gdt', entry.value, entry.comment || '');
    const occurrence = occurrences.get(baseKey) || 0;
    occurrences.set(baseKey, occurrence + 1);
    return occurrence === 0 ? baseKey : `${baseKey}_${occurrence + 1}`;
  });
}

function formatEntry(entry: GdtLanguageEntry): string {
  const fields = [];
  fields.push(`      "value": ${JSON.stringify(entry.value)}`);
  if (Object.prototype.hasOwnProperty.call(entry, 'comment')) {
    fields.push(`      "comment": ${JSON.stringify(entry.comment)}`);
  }
  fields.push(`      "translation": ${JSON.stringify(entry.translation)}`);
  return `    {\n${fields.join(',\n')}\n    }`;
}

export function formatLanguagePack(lang: string, pack: GdtLanguagePack): string {
  return [
    `// ${lang} localization pack. Generated from aio-translate; edit this file for translations.`,
    'var Languages = Languages || {};',
    `Languages[${JSON.stringify(lang)}] = {`,
    '  "values": [',
    pack.values.map(formatEntry).join(',\n'),
    '  ]',
    '};',
    ''
  ].join('\n');
}
