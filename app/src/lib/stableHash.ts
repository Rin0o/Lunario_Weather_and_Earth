/**
 * A number from a string, always the same for the same string, with ids that differ by one
 * character landing far apart. For small touches that should look random but never change
 * between visits (where a seedling stands, how a plate is tilted).
 */
export function stableHash(text: string): number {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b) >>> 0;
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b) >>> 0;
  return (hash ^ (hash >>> 16)) >>> 0;
}
