import type { IsoDate } from '../calendar/dates.ts';
import { roundCoordinate } from '../frost/frost.ts';

/**
 * The sea forecast (D-34), from two sources asked directly by the browser (CORS allowed):
 *
 * - IPMA, `forecast/oceanography/daily/hp-daily-sea-forecast-day{0,1,2}.json`: the official
 *   daily summary for 7 coastal points (wave height, period and direction, total sea, water
 *   temperature), for today and the next two days.
 * - Open-Meteo: hourly waves, swell and water temperature (Marine API) and wind (Forecast
 *   API) at the port itself, for 7 days. Fills the days IPMA does not cover and the detail
 *   of each day.
 *
 * All parsing is defensive: this module is the only place that knows both formats.
 */

export const SEA_DAYS = 7;
export const IPMA_SEA_DAYS = 3;

const IPMA_SEA_URL = 'https://api.ipma.pt/open-data/forecast/oceanography/daily';
const MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine';
const WIND_URL = 'https://api.open-meteo.com/v1/forecast';

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
export type Compass = (typeof COMPASS)[number];

/** The 8-point compass direction a bearing (°) points to. */
export function compassOf(degrees: number): Compass {
  const i = Math.round((((degrees % 360) + 360) % 360) / 45) % 8;
  return COMPASS[i] ?? 'N';
}

const num = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) && n !== -99 ? n : null;
};

const range = (a: number | null, b: number | null): Range | null =>
  a === null || b === null ? null : { min: Math.min(a, b), max: Math.max(a, b) };

export interface Range {
  min: number;
  max: number;
}

/** IPMA's summary of one day at one coastal point. */
export interface IpmaSeaDay {
  date: IsoDate;
  /** Significant wave height (m). */
  waveHeight: Range | null;
  /** Wave period (s). */
  wavePeriod: Range | null;
  waveDirection: Compass | null;
  /** Total sea: swell and wind waves together (m). */
  totalSea: Range | null;
  /** Sea surface temperature (°C). */
  water: Range | null;
}

/** Picks one coastal point out of an IPMA day file; null if it is missing or unusable. */
export function parseIpmaSeaDay(json: unknown, ipmaSeaId: number): IpmaSeaDay | null {
  if (typeof json !== 'object' || json === null) return null;
  const { forecastDate, data } = json as { forecastDate?: unknown; data?: unknown };
  if (typeof forecastDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(forecastDate)) return null;
  const raw = (Array.isArray(data) ? data : []).find(
    (d: unknown) =>
      typeof d === 'object' &&
      d !== null &&
      num((d as Record<string, unknown>).globalIdLocal) === ipmaSeaId,
  ) as Record<string, unknown> | undefined;
  if (!raw) return null;
  const dir = typeof raw.predWaveDir === 'string' ? raw.predWaveDir.toUpperCase() : '';
  const day: IpmaSeaDay = {
    date: forecastDate as IsoDate,
    waveHeight: range(num(raw.waveHighMin), num(raw.waveHighMax)),
    // IPMA sometimes gives a "minimum" period above the "maximum": keep them in order.
    wavePeriod: range(num(raw.wavePeriodMin), num(raw.wavePeriodMax)),
    waveDirection: (COMPASS as readonly string[]).includes(dir) ? (dir as Compass) : null,
    totalSea: range(num(raw.totalSeaMin), num(raw.totalSeaMax)),
    water: range(num(raw.sstMin), num(raw.sstMax)),
  };
  return day.waveHeight || day.totalSea || day.water ? day : null;
}

/** One hour of Open-Meteo at the port, in local time (`2026-11-18T14:00`). */
export interface SeaHour {
  time: string;
  waveHeight: number | null;
  wavePeriod: number | null;
  /** Where the waves come from (°). */
  waveDirection: number | null;
  swellHeight: number | null;
  swellPeriod: number | null;
  water: number | null;
  /** Wind at 10 m (km/h) and where it comes from (°). */
  wind: number | null;
  gusts: number | null;
  windDirection: number | null;
}

const numbers = (value: unknown): (number | null)[] =>
  Array.isArray(value) ? value.map((v) => (typeof v === 'number' ? v : null)) : [];

const hourlyOf = (json: unknown): Record<string, unknown> | null => {
  const h = (json as { hourly?: unknown } | null)?.hourly;
  return typeof h === 'object' && h !== null ? (h as Record<string, unknown>) : null;
};

/** Joins the Marine and Forecast hourly series by time; skips hours with no sea data. */
export function parseSeaHours(marine: unknown, wind: unknown): SeaHour[] {
  const m = hourlyOf(marine);
  if (!m || !Array.isArray(m.time)) return [];
  const w = hourlyOf(wind);
  const windAt = new Map<string, number>();
  if (w && Array.isArray(w.time)) {
    w.time.forEach((t, i) => typeof t === 'string' && windAt.set(t, i));
  }
  const col = (series: Record<string, unknown> | null, key: string) => numbers(series?.[key]);
  const wh = col(m, 'wave_height');
  const wp = col(m, 'wave_period');
  const wd = col(m, 'wave_direction');
  const sh = col(m, 'swell_wave_height');
  const sp = col(m, 'swell_wave_period');
  const sst = col(m, 'sea_surface_temperature');
  const ws = col(w, 'wind_speed_10m');
  const wg = col(w, 'wind_gusts_10m');
  const wdir = col(w, 'wind_direction_10m');
  const hours: SeaHour[] = [];
  m.time.forEach((time, i) => {
    if (typeof time !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(time)) return;
    const j = windAt.get(time);
    const hour: SeaHour = {
      time,
      waveHeight: wh[i] ?? null,
      wavePeriod: wp[i] ?? null,
      waveDirection: wd[i] ?? null,
      swellHeight: sh[i] ?? null,
      swellPeriod: sp[i] ?? null,
      water: sst[i] ?? null,
      wind: j === undefined ? null : (ws[j] ?? null),
      gusts: j === undefined ? null : (wg[j] ?? null),
      windDirection: j === undefined ? null : (wdir[j] ?? null),
    };
    if (hour.waveHeight !== null || hour.water !== null) hours.push(hour);
  });
  return hours;
}

export function marineUrl(latitude: number, longitude: number): string {
  const params = new URLSearchParams({
    latitude: String(roundCoordinate(latitude)),
    longitude: String(roundCoordinate(longitude)),
    hourly:
      'wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period,sea_surface_temperature',
    timezone: 'Europe/Lisbon',
    forecast_days: String(SEA_DAYS),
    cell_selection: 'sea',
  });
  return `${MARINE_URL}?${params.toString()}`;
}

export function windUrl(latitude: number, longitude: number): string {
  const params = new URLSearchParams({
    latitude: String(roundCoordinate(latitude)),
    longitude: String(roundCoordinate(longitude)),
    hourly: 'wind_speed_10m,wind_gusts_10m,wind_direction_10m',
    wind_speed_unit: 'kmh',
    timezone: 'Europe/Lisbon',
    forecast_days: String(SEA_DAYS),
  });
  return `${WIND_URL}?${params.toString()}`;
}

async function getJson(url: string, fetchImpl: typeof fetch): Promise<unknown> {
  const response = await fetchImpl(url, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`${new URL(url).host} responded ${response.status}`);
  return response.json();
}

/** All of IPMA's current warnings, every district and kind, in one file. */
export const WARNINGS_URL = 'https://api.ipma.pt/open-data/forecast/warnings/warnings_www.json';
const SEA_WARNING = 'Agitação Marítima';
/** From the mildest to the most severe. */
export const LEVELS = ['yellow', 'orange', 'red'] as const;
export type WarningLevel = (typeof LEVELS)[number];

/** An IPMA sea agitation warning (yellow, orange or red) for the port's district. */
export interface SeaWarning {
  level: WarningLevel;
  /** Local times, `2026-11-18T18:00:00` (IPMA gives them without a zone). */
  start: string;
  end: string;
  text: string;
}

/**
 * The sea agitation warnings of a district that have not ended at `nowLocal` (a local
 * `YYYY-MM-DDTHH:MM` time), in time order. Green ("no warning") entries are dropped.
 */
export function parseSeaWarnings(json: unknown, area: string, nowLocal: string): SeaWarning[] {
  if (!Array.isArray(json)) return [];
  return json
    .flatMap((raw: unknown): SeaWarning[] => {
      if (typeof raw !== 'object' || raw === null) return [];
      const r = raw as Record<string, unknown>;
      const level = r.awarenessLevelID;
      if (
        r.awarenessTypeName !== SEA_WARNING ||
        r.idAreaAviso !== area ||
        !(LEVELS as readonly unknown[]).includes(level) ||
        typeof r.startTime !== 'string' ||
        typeof r.endTime !== 'string'
      ) {
        return [];
      }
      return [
        {
          level: level as WarningLevel,
          start: r.startTime,
          end: r.endTime,
          text: typeof r.text === 'string' ? r.text.trim() : '',
        },
      ];
    })
    .filter((w) => w.end > nowLocal)
    .sort((a, b) => a.start.localeCompare(b.start));
}

/** The raw answers, kept as they came so they can be cached and parsed again. */
export interface SeaJson {
  ipma: unknown[];
  marine: unknown;
  wind: unknown;
  warnings: unknown;
}

/**
 * Downloads everything for a port. Each source may fail on its own (an IPMA day file, the
 * wind); only a failure of the Marine API, the backbone of the screen, fails the whole.
 */
export async function requestSeaJson(
  latitude: number,
  longitude: number,
  fetchImpl: typeof fetch = fetch,
): Promise<SeaJson> {
  const optional = (url: string) => getJson(url, fetchImpl).catch(() => null);
  const [marine, wind, warnings, ...ipma] = await Promise.all([
    getJson(marineUrl(latitude, longitude), fetchImpl),
    optional(windUrl(latitude, longitude)),
    optional(WARNINGS_URL),
    ...Array.from({ length: IPMA_SEA_DAYS }, (_, d) =>
      optional(`${IPMA_SEA_URL}/hp-daily-sea-forecast-day${d}.json`),
    ),
  ]);
  return { marine, wind, warnings, ipma };
}

/** A day of the sea screen: IPMA's summary when there is one, and Open-Meteo's hours. */
export interface SeaDay {
  date: IsoDate;
  ipma: IpmaSeaDay | null;
  hours: SeaHour[];
  /** Day ranges from the hours (used when IPMA has no summary). */
  waveHeight: Range | null;
  wind: Range | null;
  gusts: number | null;
  water: Range | null;
}

const rangeOf = (values: (number | null)[]): Range | null => {
  const v = values.filter((x): x is number => x !== null);
  return v.length ? { min: Math.min(...v), max: Math.max(...v) } : null;
};

export function parseSea(json: SeaJson, ipmaSeaId: number): SeaDay[] {
  const hours = parseSeaHours(json.marine, json.wind);
  const ipma = new Map<IsoDate, IpmaSeaDay>();
  for (const file of json.ipma) {
    const day = parseIpmaSeaDay(file, ipmaSeaId);
    if (day) ipma.set(day.date, day);
  }
  const byDate = new Map<IsoDate, SeaHour[]>();
  for (const h of hours) {
    const date = h.time.slice(0, 10) as IsoDate;
    (byDate.get(date) ?? byDate.set(date, []).get(date))?.push(h);
  }
  const dates = [...new Set([...byDate.keys(), ...ipma.keys()])].sort();
  return dates.map((date) => {
    const dayHours = byDate.get(date) ?? [];
    const gusts = rangeOf(dayHours.map((h) => h.gusts));
    return {
      date,
      ipma: ipma.get(date) ?? null,
      hours: dayHours,
      waveHeight: rangeOf(dayHours.map((h) => h.waveHeight)),
      wind: rangeOf(dayHours.map((h) => h.wind)),
      gusts: gusts?.max ?? null,
      water: rangeOf(dayHours.map((h) => h.water)),
    };
  });
}
