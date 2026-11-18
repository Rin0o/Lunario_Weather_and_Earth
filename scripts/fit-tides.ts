/**
 * Fits the harmonic constants of every port (D-34) and writes app/src/sea/tideConstants.json.
 * Run with `npm run tides` (needs the network); the result is committed, so the app and the
 * build never need these sources. Downloads are cached in .cache/tides/.
 *
 * Sources (both free for non-commercial use, credited in CREDITS.md):
 * - tide gauges: IOC Sea Level Station Monitoring Facility (VLIZ/IOC), 2025, alternate weeks;
 * - sea level of the Open-Meteo Marine API (`sea_level_height_msl`), 2025, hourly.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { PORTS, distanceKm } from '../app/src/coast/ports.ts';
import { CONSTITUENTS, type HarmonicConstants } from '../app/src/sea/tides.ts';
import { fitHarmonics, type Sample } from './lib/harmonics.ts';
import {
  blend,
  corrected,
  correctionOf,
  lowestAstronomicalTide,
  robustFit,
  rounded,
  type Correction,
} from './lib/tideFit.ts';

const YEAR = 2025;
const root = new URL('../', import.meta.url);
const cache = new URL('.cache/tides/', root);
mkdirSync(cache, { recursive: true });

async function cached(name: string, url: string): Promise<unknown> {
  const file = new URL(name, cache);
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  const response = await fetch(url, { headers: { 'User-Agent': 'lunario-tides-fit' } });
  if (!response.ok) throw new Error(`${url} responded ${response.status}`);
  const json: unknown = await response.json();
  writeFileSync(file, JSON.stringify(json));
  return json;
}

/** Gauges with open data, in coast order. `port` is set where a port sits at the gauge. */
const GAUGES = [
  { code: 'vig2', name: 'Vigo', latitude: 42.24, longitude: -8.73, port: null },
  { code: 'casc', name: 'Cascais', latitude: 38.69, longitude: -9.42, port: 'cascais' },
  { code: 'lgos', name: 'Lagos', latitude: 37.1, longitude: -8.67, port: 'lagos' },
  { code: 'huel', name: 'Huelva', latitude: 37.13, longitude: -6.83, port: null },
] as const;

const DAY = 86_400_000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

/**
 * Hourly medians of a gauge, from alternate weeks of the year (hours with ≥ 30 samples). The
 * raw records (one every 5 s to 1 min, ~400 MB a year) are not kept: the cache holds the
 * hourly medians, `{ "2025-01-01T00:30:00.000Z": 1.234, … }`.
 */
async function gaugeSamples(code: string): Promise<Sample[]> {
  const file = new URL(`gauge-${code}-${YEAR}.json`, cache);
  if (!existsSync(file)) {
    const hourly: Record<string, number> = {};
    for (const s of await downloadGauge(code)) hourly[s.time.toISOString()] = s.level;
    writeFileSync(file, JSON.stringify(hourly));
  }
  const hourly = JSON.parse(readFileSync(file, 'utf8')) as Record<string, number>;
  return Object.entries(hourly).map(([time, level]) => ({ time: new Date(time), level }));
}

async function downloadGauge(code: string): Promise<Sample[]> {
  const samples: Sample[] = [];
  for (let week = 0; week < 52; week += 2) {
    const from = Date.UTC(YEAR, 0, 1) + week * 7 * DAY;
    const url =
      'https://www.ioc-sealevelmonitoring.org/service.php?query=data&format=json' +
      `&code=${code}&timestart=${iso(from)}&timestop=${iso(from + 7 * DAY)}`;
    const response = await fetch(url, { headers: { 'User-Agent': 'lunario-tides-fit' } });
    if (!response.ok) throw new Error(`${url} responded ${response.status}`);
    const raw = (await response.json()) as { slevel: number | null; stime: string }[];
    const hours = new Map<number, number[]>();
    for (const r of raw) {
      if (typeof r.slevel !== 'number') continue;
      const hour = Math.floor(Date.parse(`${r.stime.replace(' ', 'T')}Z`) / 3_600_000);
      const list = hours.get(hour) ?? [];
      list.push(r.slevel);
      hours.set(hour, list);
    }
    for (const [hour, levels] of hours) {
      if (levels.length < 30) continue;
      levels.sort((a, b) => a - b);
      samples.push({
        time: new Date(hour * 3_600_000 + 1_800_000),
        level: levels[levels.length >> 1] as number,
      });
    }
  }
  return samples;
}

async function modelSamples(id: string, latitude: number, longitude: number): Promise<Sample[]> {
  const url =
    `https://marine-api.open-meteo.com/v1/marine?latitude=${latitude}&longitude=${longitude}` +
    `&hourly=sea_level_height_msl&start_date=${YEAR}-01-01&end_date=${YEAR}-12-31` +
    '&timezone=GMT&cell_selection=sea';
  const json = (await cached(`model-${id}.json`, url)) as {
    hourly: { time: string[]; sea_level_height_msl: (number | null)[] };
  };
  return json.hourly.time.flatMap((t, i) => {
    const level = json.hourly.sea_level_height_msl[i];
    return typeof level === 'number' ? [{ time: new Date(`${t}Z`), level }] : [];
  });
}

// Positions along the coast (km from Vigo), through the gauges and the ports in order.
const path = [GAUGES[0], ...PORTS, GAUGES[3]];
const along = new Map<string, number>();
let km = 0;
path.forEach((p, i) => {
  if (i > 0) km += distanceKm(path[i - 1] as typeof p, p);
  along.set('code' in p ? p.code : p.id, km);
});
for (const g of GAUGES) if (g.port) along.set(g.code, along.get(g.port) as number);

console.log('Gauges:');
interface Gauge {
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  port: string | null;
  /** km from Vigo along the coast. */
  at: number;
  constants: HarmonicConstants;
  correction: Correction;
}
const gauges: Gauge[] = [];
for (const g of GAUGES) {
  const fit = robustFit(await gaugeSamples(g.code));
  const model = fitHarmonics(await modelSamples(g.code, g.latitude, g.longitude));
  const correction = correctionOf(fit.constants, model);
  const m2 = correction[CONSTITUENTS.findIndex((k) => k.name === 'M2')] as Correction[number];
  console.log(
    `  ${g.name.padEnd(8)} ${fit.kept} h, residual ${(fit.rms * 100).toFixed(1)} cm; ` +
      `model M2 ×${m2.ratio.toFixed(3)}, ${m2.dg.toFixed(1)}° late`,
  );
  gauges.push({ ...g, at: along.get(g.code) as number, constants: fit.constants, correction });
}

/** The correction at a coast position, between the gauges on either side. */
function correctionAt(
  at: number,
  skip?: string,
): { correction: Correction; nearest: HarmonicConstants } {
  const list = gauges.filter((g) => g.code !== skip);
  const after = list.findIndex((g) => g.at >= at);
  const b = list[after === -1 ? list.length - 1 : Math.max(after, 1)] as (typeof list)[number];
  const a = list[list.indexOf(b) - 1] as (typeof list)[number];
  const t = Math.min(1, Math.max(0, (at - a.at) / (b.at - a.at)));
  return { correction: blend(a.correction, b.correction, t), nearest: (t < 0.5 ? a : b).constants };
}

// Leave-one-out check: Cascais and Lagos predicted from the other gauges, as if they had none.
console.log('Leave-one-out (model corrected from the other gauges vs the gauge):');
for (const g of gauges.filter((x) => x.port)) {
  const { correction, nearest } = correctionAt(g.at, g.code);
  const predicted = corrected(
    fitHarmonics(await modelSamples(g.code, g.latitude, g.longitude)),
    correction,
    nearest,
  );
  const report = ['M2', 'S2', 'N2', 'K1', 'O1'].map((name) => {
    const i = CONSTITUENTS.findIndex((k) => k.name === name);
    const [ph, pg] = predicted.constituents[i] as readonly [number, number];
    const [gh, gg] = g.constants.constituents[i] as readonly [number, number];
    const speed = name.endsWith('1') ? 15 : 29; // °/h, roughly
    const minutes = ((((pg - gg + 540) % 360) - 180) / speed) * 60;
    return `${name} ${((ph - gh) * 100).toFixed(1)} cm ${minutes.toFixed(1)} min`;
  });
  console.log(`  ${g.name.padEnd(8)} ${report.join(' · ')}`);
}

console.log('Ports:');
const ports: Record<
  string,
  { method: 'gauge' | 'model'; datum: number; constituents: [number, number][] }
> = {};
for (const port of PORTS) {
  const gauge = gauges.find((g) => g.port === port.id);
  let constants: HarmonicConstants;
  if (gauge) {
    constants = { ...gauge.constants, z0: 0 };
  } else {
    const { correction, nearest } = correctionAt(along.get(port.id) as number);
    constants = corrected(
      fitHarmonics(await modelSamples(port.id, port.latitude, port.longitude)),
      correction,
      nearest,
    );
  }
  const datum = Math.round(lowestAstronomicalTide(constants, 2026) * 100) / 100;
  const m2 = constants.constituents[CONSTITUENTS.findIndex((k) => k.name === 'M2')] as readonly [
    number,
    number,
  ];
  console.log(
    `  ${port.name.padEnd(26)} ${gauge ? 'gauge' : 'model'}  M2 ${m2[0].toFixed(3)} m ${m2[1].toFixed(1)}°  LAT −${datum.toFixed(2)} m`,
  );
  ports[port.id] = { method: gauge ? 'gauge' : 'model', datum, constituents: rounded(constants) };
}

const out = new URL('app/src/sea/tideConstants.json', root);
writeFileSync(
  out,
  `${JSON.stringify({ fitted: YEAR, constituents: CONSTITUENTS.map((k) => k.name), ports })}\n`,
);
console.log(`Wrote ${out.pathname}`);
