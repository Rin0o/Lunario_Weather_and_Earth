/**
 * Draws the grass-on-soil strip along the top of the tab bar, as an SVG data URI for
 * app/src/styles.css (`.tab-bar::before`). Run it after changing the numbers below, and
 * paste the output into the `url("data:image/svg+xml,…")` there:
 *   node scripts/grass-strip.ts
 * The random numbers come from a fixed seed, so the same settings always give the same grass.
 */

const SEED = 7;
/** Width and height of one tile, in px; the tile repeats along the bar. */
const WIDTH = 120;
const HEIGHT = 20;
/** Where the grass meets the soil. */
const GROUND = 15;
/** Blade colours, dark to light. */
const GREENS = ['#3f5a26', '#4f6b2f', '#5f7a3a', '#7d9a4c', '#8fae5a'];
const SOIL = '#3b2415';
const SOIL_TOP = '#5a3a22';
const PEBBLES = '#6b4a2e';

let seed = SEED;
const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const round = (n: number) => Math.round(n * 10) / 10;

const blades: string[] = [];
// Tufts of 2–5 blades, the middle ones taller, every 3–9 px.
for (let x = 0.5; x < WIDTH - 1; x += 3 + random() * 6) {
  const tuft = 2 + Math.floor(random() * 4);
  for (let k = 0; k < tuft; k++) {
    const base = x + random() * 3;
    const middle = 1 - Math.abs(k - (tuft - 1) / 2) / tuft;
    const height = 4 + random() * 6 + middle * 6;
    const lean = (random() - 0.5) * 7;
    const width = 1.2 + random() * 1.3;
    const colour = GREENS[Math.floor(random() * GREENS.length)];
    const bendX = base + lean * 0.25;
    const bendY = GROUND - height * 0.6;
    blades.push(
      `<path d='M${round(base)} ${GROUND}Q${round(bendX)} ${round(bendY)} ` +
        `${round(base + lean)} ${round(GROUND - height)}` +
        `Q${round(bendX + width * 0.6)} ${round(bendY)} ${round(base + width)} ${GROUND}Z' ` +
        `fill='${colour}'/>`,
    );
  }
}

const pebbles = Array.from(
  { length: 10 },
  () =>
    `<circle cx='${round(random() * WIDTH)}' cy='${round(16.3 + random() * 3)}' ` +
    `r='${round(0.4 + random() * 0.4)}' fill='${PEBBLES}'/>`,
);

const svg =
  `<svg xmlns='http://www.w3.org/2000/svg' width='${WIDTH}' height='${HEIGHT}' ` +
  `viewBox='0 0 ${WIDTH} ${HEIGHT}'>` +
  `<rect y='14.5' width='${WIDTH}' height='5.5' fill='${SOIL}'/>` +
  `<rect y='14.5' width='${WIDTH}' height='1.2' fill='${SOIL_TOP}'/>` +
  pebbles.join('') +
  blades.join('') +
  `</svg>`;

console.log(svg.replaceAll('#', '%23').replaceAll('<', '%3C').replaceAll('>', '%3E'));
