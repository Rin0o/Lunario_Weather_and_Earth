/**
 * Frost risk from the Open-Meteo forecast (RF-16, D-15): the lowest air temperature at 2 m and
 * the lowest surface temperature of each day, for the user's location.
 */
import type { Catalog, Crop } from '../catalog/types.ts';
import type { IsoDate } from '../calendar/dates.ts';
import type { Planting } from '../garden/plantings.ts';

export const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
/** Today and the next four days, like the weather card. */
export const FROST_DAYS = 5;

/** Q-07: the surface at or below 0 °C means frost; the air at or below 3 °C, possible frost. */
export const SURFACE_FROST_C = 0;
export const AIR_POSSIBLE_FROST_C = 3;

export type FrostRisk = 'frost' | 'possible' | 'none';

export interface FrostDay {
  date: IsoDate;
  minAir: number;
  /** Null when the forecast has no surface temperature for the day. */
  minSurface: number | null;
  risk: FrostRisk;
}

export function frostRisk(minAir: number, minSurface: number | null): FrostRisk {
  if (minSurface !== null && minSurface <= SURFACE_FROST_C) return 'frost';
  if (minAir <= AIR_POSSIBLE_FROST_C) return 'possible';
  return 'none';
}

/**
 * Coordinates rounded to 0.01° (about 1 km): enough for a forecast, and it sends less precise
 * positions to a third party (RNF-03).
 */
export const roundCoordinate = (value: number) => Math.round(value * 100) / 100;

export function frostForecastUrl(latitude: number, longitude: number): string {
  const params = new URLSearchParams({
    latitude: String(roundCoordinate(latitude)),
    longitude: String(roundCoordinate(longitude)),
    hourly: 'temperature_2m,soil_temperature_0cm',
    timezone: 'Europe/Lisbon',
    forecast_days: String(FROST_DAYS),
  });
  return `${OPEN_METEO_URL}?${params.toString()}`;
}

export async function requestFrostJson(
  latitude: number,
  longitude: number,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  const response = await fetchImpl(frostForecastUrl(latitude, longitude), { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Open-Meteo responded ${response.status}`);
  return response.json();
}

const numbers = (value: unknown): (number | null)[] | null =>
  Array.isArray(value) ? value.map((v) => (typeof v === 'number' ? v : null)) : null;

/**
 * Daily minimums from Open-Meteo's hourly series (local times, `2026-11-17T05:00`).
 * Returns an empty list for anything that does not look like a forecast.
 */
export function parseFrostForecast(json: unknown): FrostDay[] {
  if (typeof json !== 'object' || json === null) return [];
  const hourly = (json as { hourly?: Record<string, unknown> }).hourly;
  const times = hourly?.time;
  const air = numbers(hourly?.temperature_2m);
  const surface = numbers(hourly?.soil_temperature_0cm);
  if (!Array.isArray(times) || !air) return [];

  const days = new Map<IsoDate, { minAir: number | null; minSurface: number | null }>();
  times.forEach((time, i) => {
    if (typeof time !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(time)) return;
    const date = time.slice(0, 10) as IsoDate;
    const day = days.get(date) ?? { minAir: null, minSurface: null };
    const a = air[i] ?? null;
    const s = surface?.[i] ?? null;
    if (a !== null) day.minAir = day.minAir === null ? a : Math.min(day.minAir, a);
    if (s !== null) day.minSurface = day.minSurface === null ? s : Math.min(day.minSurface, s);
    days.set(date, day);
  });

  return [...days].flatMap(([date, { minAir, minSurface }]) =>
    minAir === null ? [] : [{ date, minAir, minSurface, risk: frostRisk(minAir, minSurface) }],
  );
}

/** Names of the frost-sensitive crops growing in the garden, sorted, without repeats. */
export function sensitiveCropsInGarden(
  plantings: readonly Planting[],
  source: Catalog,
  pick: (crop: Crop) => string,
  locale: string,
): string[] {
  const crops = new Map(source.crops.map((c) => [c.id, c]));
  const names = plantings.flatMap((p) => {
    const crop = crops.get(p.cropId);
    return p.status === 'active' && crop?.frostSensitive ? [pick(crop)] : [];
  });
  return [...new Set(names)].sort(new Intl.Collator(locale).compare);
}
