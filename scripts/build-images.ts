/**
 * Turns the original artwork in /art into the WebP files the app uses
 * (app/src/assets/images, generated, not committed). Runs before dev, build and tests.
 *   npm run images
 * Each image is made at a few widths, so phones download the small one. An output newer
 * than its original is left alone, so the script is quick when nothing changed.
 */
import { mkdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { APP_ICON, IMAGES, outputName } from './lib/images.ts';

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
