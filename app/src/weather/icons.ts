/**
 * Weather and moon icons: Meteocons by Bas Milius (MIT, app/src/assets/meteocons/LICENSE),
 * the static versions, bundled as files so they work offline.
 */
import type { MoonPhaseName } from '../astro/moon.ts';

const files = import.meta.glob<string>('../assets/meteocons/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** The URL of a bundled Meteocons icon, by its file name without extension. */
export function meteocon(name: string): string {
  return (
    files[`../assets/meteocons/${name}.svg`] ?? files['../assets/meteocons/not-available.svg'] ?? ''
  );
}

/** Meteocons for IPMA weather types (idWeatherType 0–30). */
const WEATHER: Record<number, string> = {
  0: 'not-available',
  1: 'clear-day',
  2: 'partly-cloudy-day',
  3: 'partly-cloudy-day',
  4: 'overcast',
  5: 'overcast-day',
  6: 'partly-cloudy-day-rain',
  7: 'partly-cloudy-day-drizzle',
  8: 'rain',
  9: 'rain',
  10: 'drizzle',
  11: 'rain',
  12: 'partly-cloudy-day-rain',
  13: 'partly-cloudy-day-drizzle',
  14: 'rain',
  15: 'drizzle',
  16: 'mist',
  17: 'fog',
  18: 'snow',
  19: 'thunderstorms',
  20: 'thunderstorms-rain',
  21: 'hail',
  22: 'snowflake',
  23: 'thunderstorms-rain',
  24: 'cloudy',
  25: 'overcast-day',
  26: 'fog',
  27: 'cloudy',
  28: 'partly-cloudy-day-snow',
  29: 'sleet',
  30: 'sleet',
};

export const weatherIcon = (type: number): string => meteocon(WEATHER[type] ?? 'not-available');

/** IPMA types with a translated description; others fall back to "no information". */
export const isKnownWeatherType = (type: number): boolean => type in WEATHER;

export const moonIcon = (phase: MoonPhaseName): string => meteocon(`moon-${phase}`);
