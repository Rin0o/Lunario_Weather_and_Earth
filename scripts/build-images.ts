/**
 * Turns the original artwork in /art into the WebP files the app uses
 * (app/src/assets/images, generated, not committed). Runs before dev, build and tests.
 *   npm run images
 * Each image is made at a few widths, so phones download the small one. An output newer
 * than its original is left alone, so the script is quick when nothing changed.
 */
import { mkdirSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import {
  APP_ICON,
  IMAGES,
  PLATE_INK,
  PLATE_WIDTHS,
  PLATES_DIR,
  outputName,
  plateName,
  VIGNETTE_WIDTH,
  VIGNETTES_DIR,
  vignetteName,
} from './lib/images.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = `${root}app/src/assets/images`;
mkdirSync(outDir, { recursive: true });

const mtime = (path: string) => {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return 0;
  }
};

let made = 0;
for (const image of IMAGES) {
  const source = `${root}${image.source}`;
  for (const width of image.widths) {
    const target = `${outDir}/${outputName(image.name, width)}`;
    if (mtime(target) > mtime(source)) continue;
    await sharp(source)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: image.quality ?? 80, alphaQuality: 90 })
      .toFile(target);
    made++;
  }
}

// Plates and vignettes: greyscale engravings become brown ink on a transparent background.
// The paper tone of each scan (its most common light tone) is taken as white, so a greyish
// scan comes out as clean as the others.
async function printInInk(source: string, width: number, target: string) {
  if (mtime(target) > mtime(source)) return;
  const { data, info } = await sharp(source)
    .flatten({ background: '#ffffff' })
    .greyscale()
    .resize({ width, withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });
  // The paper: the most common light tone, less a margin for the grain of old scans.
  const counts = new Array<number>(256).fill(0);
  for (const value of data) counts[value] = (counts[value] ?? 0) + 1;
  let mode = 255;
  for (let v = 128; v < 256; v++) if ((counts[v] ?? 0) > (counts[mode] ?? 0)) mode = v;
  const paper = mode - 18;
  const black = 30;
  const rgba = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < data.length; i++) {
    const ink = Math.min(1, Math.max(0, (paper - (data[i] ?? 255)) / (paper - black)));
    rgba[i * 4] = PLATE_INK.r;
    rgba[i * 4 + 1] = PLATE_INK.g;
    rgba[i * 4 + 2] = PLATE_INK.b;
    rgba[i * 4 + 3] = Math.round(ink * 255);
  }
  await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .webp({ quality: 80, alphaQuality: 85 })
    .toFile(target);
  made++;
}

const pngs = (dir: string) => readdirSync(`${root}${dir}`).filter((f) => f.endsWith('.png'));

mkdirSync(`${outDir}/plates`, { recursive: true });
for (const file of pngs(PLATES_DIR)) {
  const cropId = file.slice(0, -'.png'.length);
  for (const width of Object.values(PLATE_WIDTHS)) {
    await printInInk(
      `${root}${PLATES_DIR}/${file}`,
      width,
      `${outDir}/plates/${plateName(cropId, width)}`,
    );
  }
}

mkdirSync(`${outDir}/vignettes`, { recursive: true });
for (const file of pngs(VIGNETTES_DIR)) {
  const name = file.slice(0, -'.png'.length);
  await printInInk(
    `${root}${VIGNETTES_DIR}/${file}`,
    VIGNETTE_WIDTH,
    `${outDir}/vignettes/${vignetteName(name)}`,
  );
}

// The app icon source for the PWA icon generator (pwa-assets.config.ts), which reads from
// public/: a 512 px copy, so the full-size original is never shipped.
const iconTarget = `${root}public/app-icon.png`;
if (mtime(iconTarget) <= mtime(`${root}${APP_ICON}`)) {
  await sharp(`${root}${APP_ICON}`)
    .resize({ width: 512 })
    .png({ palette: true })
    .toFile(iconTarget);
  made++;
}

console.log(made ? `images: ${made} file(s) written` : 'images: up to date');
