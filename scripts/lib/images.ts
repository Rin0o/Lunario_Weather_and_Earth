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
];

/** The square logo, source of the installed app icon and the favicon. */
export const APP_ICON = 'art/backgrounds/Logo_round-square.png';

export const outputName = (name: string, width: number) => `${name}-${width}.webp`;
