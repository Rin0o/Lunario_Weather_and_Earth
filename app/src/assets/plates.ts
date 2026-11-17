/**
 * The botanical plate of each crop (RF-06): old public-domain engravings (art/plates,
 * art/plates/SOURCES.md), printed in brown ink by `npm run images`. Only the URLs are bundled;
 * a plate is downloaded when it is shown.
 */
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

export function plateFor(cropId: string): Plate | null {
  const thumb = thumbs[`./images/plates/plate-${cropId}-128.webp`];
  const sheet = sheets[`./images/plates/plate-${cropId}-560.webp`];
  return thumb && sheet ? { thumb, sheet } : null;
}
