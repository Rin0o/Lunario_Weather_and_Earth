/** The artwork the app uses: original in /art, WebP widths to generate (scripts/build-images.ts). */
export interface ImageSpec {
  /** Base name of the generated files: `<name>-<width>.webp`. */
  name: string;
  /** Original, relative to the repository root. */
  source: string;
  widths: number[];
  quality?: number;
}

export const IMAGES: ImageSpec[] = [
  // The notebook page behind every screen.
  { name: 'page', source: 'art/backgrounds/page_background.png', widths: [640, 1024], quality: 68 },
  // The leather cover of the opening screen.
  { name: 'cover', source: 'art/backgrounds/start_page.png', widths: [640, 1024], quality: 68 },
  // The text logo on the cover.
  { name: 'logo-text', source: 'art/backgrounds/Logo_text.png', widths: [480, 960], quality: 85 },
  // The round mark in the header (shown at 40 px, so 2× and 3× screens).
  { name: 'logo-round', source: 'art/backgrounds/Logo_round.png', widths: [96, 144], quality: 85 },
  // The scrap of old paper each plate is glued on, on the crop sheet (shown at about 10 rem).
  { name: 'paper-square', source: 'art/backgrounds/page_square.png', widths: [480], quality: 72 },
];

/**
 * Botanical plates (RF-06): art/plates/<crop id>.png, greyscale engravings on white. They are
 * turned into ink on a transparent background, so they look printed on the notebook page:
 * a thumbnail for the crop list and a larger one for the crop sheet.
 */
export const PLATES_DIR = 'art/plates';
export const PLATE_WIDTHS = { thumb: 128, sheet: 560 } as const;
/** The ink colour: a dark brown, like old printing ink on paper. */
export const PLATE_INK = { r: 52, g: 38, b: 26 };
export const plateName = (cropId: string, width: number) => `plate-${cropId}-${width}.webp`;

/** The square logo, source of the installed app icon and the favicon. */
export const APP_ICON = 'art/backgrounds/Logo_round-square.png';

export const outputName = (name: string, width: number) => `${name}-${width}.webp`;
