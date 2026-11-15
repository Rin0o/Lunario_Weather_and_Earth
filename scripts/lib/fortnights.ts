import type { Fortnight } from '../../app/src/catalog/types.ts';

/** Month abbreviations as used in /data (`Mar Q1`). */
export const MONTHS_PT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
] as const;

/** `Mar Q1` → 5; throws on anything else. */
export function parseFortnight(label: string): Fortnight {
  const match = /^([A-Za-z]{3}) Q([12])$/.exec(label.trim());
  const month = match
    ? MONTHS_PT.findIndex((m) => m.toLowerCase() === match[1]?.toLowerCase())
    : -1;
  if (!match || month < 0) throw new Error(`invalid fortnight "${label}" (expected e.g. "Mar Q1")`);
  return month * 2 + Number(match[2]);
}

/** 5 → `Mar Q1`. */
export function formatFortnight(n: Fortnight): string {
  return `${MONTHS_PT[Math.ceil(n / 2) - 1]} Q${n % 2 === 1 ? 1 : 2}`;
}

/** Moves a fortnight by `by`, wrapping around the year (1…24). */
export function shiftFortnight(n: Fortnight, by: number): Fortnight {
  return ((((n - 1 + by) % 24) + 24) % 24) + 1;
}

/** Number of fortnights in an inclusive window, allowing it to cross the new year. */
export function windowLength(start: Fortnight, end: Fortnight): number {
  return ((end - start + 24) % 24) + 1;
}

/** Fortnights covered by a window, as a 24-slot mask. */
export function windowMask(start: Fortnight, end: Fortnight): boolean[] {
  const mask = Array<boolean>(24).fill(false);
  for (let i = 0; i < windowLength(start, end); i++) mask[shiftFortnight(start, i) - 1] = true;
  return mask;
}

/** Contiguous runs of a 24-slot mask, joining a run that crosses December into January. */
export function maskToWindows(mask: readonly boolean[]): [Fortnight, Fortnight][] {
  if (mask.every(Boolean)) return [[1, 24]];
  // Start scanning just after a gap so a run crossing the new year stays whole.
  const firstGap = mask.findIndex((v) => !v);
  if (firstGap < 0) return [];
  const runs: [Fortnight, Fortnight][] = [];
  let runStart: number | null = null;
  for (let k = 1; k <= 24; k++) {
    const idx = (firstGap + k) % 24;
    if (mask[idx] && runStart === null) runStart = idx;
    if (!mask[idx] && runStart !== null) {
      runs.push([runStart + 1, ((idx + 23) % 24) + 1]);
      runStart = null;
    }
  }
  return runs.sort((a, b) => a[0] - b[0]);
}

const REFERENCE_YEAR = 2025; // any non-leap year; only day counts matter
const DAY_MS = 86_400_000;

/** First and last day (UTC ms) of a fortnight in the reference year. */
function fortnightDays(n: Fortnight): { first: number; last: number } {
  const month = Math.ceil(n / 2) - 1;
  const firstHalf = n % 2 === 1;
  const first = Date.UTC(REFERENCE_YEAR, month, firstHalf ? 1 : 16);
  const last = firstHalf
    ? Date.UTC(REFERENCE_YEAR, month, 15)
    : Date.UTC(REFERENCE_YEAR, month + 1, 0);
  return { first, last };
}

/** Fortnight containing a day (UTC ms), wrapping into the reference year. */
function fortnightOfDay(ms: number): Fortnight {
  const d = new Date(ms);
  return d.getUTCMonth() * 2 + (d.getUTCDate() <= 15 ? 1 : 2);
}

/**
 * Harvest window for crops sown or planted during [start, end]: from the first sowing day plus
 * the shortest cycle to the last sowing day plus the longest cycle (D-19).
 */
export function harvestMask(
  start: Fortnight,
  end: Fortnight,
  cycle: { min: number; max: number },
): boolean[] {
  const firstSowing = fortnightDays(start).first;
  // A window that crosses the new year ends in the following year.
  const lastSowing = fortnightDays(end).last + (end < start ? 365 * DAY_MS : 0);
  const from = firstSowing + cycle.min * DAY_MS;
  const to = lastSowing + cycle.max * DAY_MS;
  if (to - from >= 365 * DAY_MS) return Array<boolean>(24).fill(true);
  return windowMask(fortnightOfDay(from), fortnightOfDay(to));
}
