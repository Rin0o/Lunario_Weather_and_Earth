/**
 * Builds app/src/catalog/catalog.json from the CSV files in /data.
 * Run with `npm run catalog`; it also runs before dev, build, typecheck and tests.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { buildCatalog, DATA_FILE_NAMES, DataError, type DataFiles } from './lib/catalog.ts';

const root = new URL('../', import.meta.url);
const read = (name: string) => readFileSync(new URL(`data/${name}`, root), 'utf8');

try {
  const files = Object.fromEntries(
    Object.entries(DATA_FILE_NAMES).map(([key, name]) => [key, read(name)]),
  ) as unknown as DataFiles;
  const { catalog, warnings } = buildCatalog(files);

  const out = new URL('app/src/catalog/catalog.json', root);
  mkdirSync(new URL('.', out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(catalog)}\n`);

  const count = (origin: string) => catalog.windows.filter((w) => w.origin === origin).length;
  const feastSayings = catalog.feasts.reduce((n, f) => n + f.sayings.length, 0);
  console.log(
    `catalog.json: ${catalog.crops.length} crops, ${catalog.zones.length} zones, ` +
      `${count('base')} base + ${count('derived')} derived + ${count('manual')} manual + ` +
      `${count('calculated')} harvest windows, ` +
      `${catalog.saints.length} saints, ${catalog.sayings.length} sayings, ` +
      `${catalog.feasts.length} moveable feasts with ${feastSayings} sayings`,
  );
  for (const w of warnings) console.warn(`  warning: ${w}`);
} catch (e) {
  console.error(e instanceof DataError ? e.message : e);
  process.exit(1);
}
