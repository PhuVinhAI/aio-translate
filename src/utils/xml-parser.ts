/**
 * XML Parser Utilities for Minecraft Translation
 */

export interface XMLEntry {
  key: string;
  text: string;
}

/**
 * Escape XML special characters
 */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Unescape XML special characters
 */
export function unescapeXml(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Parse XML entries from content
 */
export function parseXMLEntries(xmlContent: string): XMLEntry[] {
  const entries: XMLEntry[] = [];
  const regex = /<Text Key="([^"]+)">([^<]*)<\/Text>/g;
  let match;

  while ((match = regex.exec(xmlContent)) !== null) {
    entries.push({
      key: match[1],
      text: unescapeXml(match[2])
    });
  }

  return entries;
}

/**
 * Parse XML to Map structure
 */
export function parseXMLToMap(xmlContent: string): Map<string, string> {
  const map = new Map<string, string>();
  const entries = parseXMLEntries(xmlContent);

  for (const entry of entries) {
    map.set(entry.key, entry.text);
  }

  return map;
}

/**
 * Convert Map to XML string
 */
export function mapToXML(map: Map<string, string>): string {
  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<STBLKeyStringList>\n';

  for (const [key, value] of map.entries()) {
    xml += `  <Text Key="${key}">${escapeXml(value)}</Text>\n`;
  }

  xml += '</STBLKeyStringList>';

  return xml;
}
