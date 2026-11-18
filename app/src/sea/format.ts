import { intlLocale } from '../i18n/format.ts';
import type { Range } from './seaForecast.ts';

/** `1,5` / `1.5`: one decimal at most. */
export function formatDecimal(value: number, language: string | undefined, digits = 1): string {
  return new Intl.NumberFormat(intlLocale(language), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** `1,5–2,0` (or `1,5` when both ends round to the same value). */
export function formatRange(range: Range, language: string | undefined, digits = 1): string {
  const a = formatDecimal(range.min, language, digits);
  const b = formatDecimal(range.max, language, digits);
  return a === b ? a : `${a}–${b}`;
}

/** Wind speed (km/h) on the Beaufort scale, 0–12. */
export function beaufort(kmh: number): number {
  const limits = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];
  const force = limits.findIndex((limit) => kmh < limit);
  return force === -1 ? 12 : force;
}
