import type { IsoDate } from '../calendar/dates.ts';

/**
 * IPMA daily forecast (api.ipma.pt/open-data/forecast/meteorology/cities/daily/{id}.json).
 * Called directly from the browser (CORS allowed, D-17). All parsing is defensive: the
 * module is the only place that knows IPMA's format, so a format change is fixed here.
 */
export interface DayForecast {
  date: IsoDate;
  tMin: number;
  tMax: number;
  /** 0–100, or null when IPMA has no value. */
  rainProbability: number | null;
  /** IPMA `idWeatherType`, 0–30. */
  weatherType: number;
  /** N, NE, E, SE, S, SW, W, NW, or null. */
  windDirection: string | null;
  /** IPMA wind class 1 (weak) – 4 (very strong), or null. */
  windClass: number | null;
}

export interface Forecast {
  locationId: number;
  days: DayForecast[];
}

const FORECAST_URL = 'https://api.ipma.pt/open-data/forecast/meteorology/cities/daily';
const WIND_DIRECTIONS = new Set(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']);

const num = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  // IPMA uses -99 for "no data".
  return Number.isFinite(n) && n !== -99 ? n : null;
};

function parseDay(raw: unknown): DayForecast | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const date = typeof r.forecastDate === 'string' ? r.forecastDate : '';
  const tMin = num(r.tMin);
  const tMax = num(r.tMax);
  const weatherType = num(r.idWeatherType);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || tMin === null || tMax === null || weatherType === null) {
    return null;
  }
  const rain = num(r.precipitaProb);
  const windClass = num(r.classWindSpeed);
  const dir = typeof r.predWindDir === 'string' ? r.predWindDir.toUpperCase() : '';
  return {
    date: date as IsoDate,
    tMin,
    tMax,
    rainProbability: rain === null ? null : Math.round(rain),
    weatherType,
    windDirection: WIND_DIRECTIONS.has(dir) ? dir : null,
    windClass: windClass !== null && windClass >= 1 && windClass <= 4 ? windClass : null,
  };
}

/** Parses IPMA's JSON; throws if there is no usable day. */
export function parseForecast(json: unknown, locationId: number): Forecast {
  const data = (json as { data?: unknown } | null)?.data;
  const days = (Array.isArray(data) ? data : [])
    .map(parseDay)
    .filter((d): d is DayForecast => d !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (days.length === 0) throw new Error('IPMA forecast has no usable days');
  return { locationId, days };
}

/** Downloads IPMA's raw forecast JSON (kept raw so it can be cached and re-parsed). */
export async function requestForecastJson(
  locationId: number,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  const response = await fetchImpl(`${FORECAST_URL}/${locationId}.json`, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`IPMA responded ${response.status}`);
  return response.json();
}
