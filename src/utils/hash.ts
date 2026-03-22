import crypto from 'crypto';

/**
 * Create short hash key from original key
 */
export function createHashKey(originalKey: string): string {
  return crypto
    .createHash('md5')
    .update(originalKey)
    .digest('hex')
    .substring(0, 8)
    .toUpperCase();
}

/**
 * Generate hash key from multiple parts
 */
export function generateHashKey(...parts: string[]): string {
  const combined = parts.join('::');
  return createHashKey(combined);
}
