/**
 * The botanical plate of each crop (RF-06): old public-domain engravings (art/plates,
 * art/plates/SOURCES.md), printed in brown ink by `npm run images`. Only the URLs are bundled;
 * a plate is downloaded when it is shown.
 */
import { stableHash } from '../lib/stableHash.ts';

const thumbs = import.meta.glob<string>('./images/plates/plate-*-128.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});
const sheets = import.meta.glob<string>('./images/plates/plate-*-560.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

export interface Plate {
  /** 128 px wide, for the crop list. */
  thumb: string;
  /** 560 px wide, for the crop sheet. */
  sheet: string;
}

/**
 * How much the plate's paper is turned on the crop sheet, in degrees: between 1.5 and 4.5
 * either way, as if glued in by hand, and always the same for the same crop.
 */
export function plateTilt(cropId: string): number {
  const hash = stableHash(cropId);
  const degrees = 1.5 + (hash % 13) / 4; // 1.5, 1.75 … 4.5
  return hash & 0x100 ? degrees : -degrees;
}

export function plateFor(cropId: string): Plate | null {
  const thumb = thumbs[`./images/plates/plate-${cropId}-128.webp`];
  const sheet = sheets[`./images/plates/plate-${cropId}-560.webp`];
  return thumb && sheet ? { thumb, sheet } : null;
}
