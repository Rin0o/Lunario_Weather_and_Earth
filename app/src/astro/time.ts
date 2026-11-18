/** Mainland Portugal's time zone. Madeira and the Azores are out of scope for v1. */
export const TIME_ZONE = 'Europe/Lisbon';

const partsFormatters = new Map<string, Intl.DateTimeFormat>();
function partsFormatter(timeZone: string) {
  let fmt = partsFormatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    partsFormatters.set(timeZone, fmt);
  }
  return fmt;
}

function zonedParts(moment: Date, timeZone: string) {
  const parts: Record<string, number> = {};
  for (const { type, value } of partsFormatter(timeZone).formatToParts(moment)) {
    if (type !== 'literal') parts[type] = Number(value);
  }
  return parts as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number>;
}

/** Offset of `timeZone` from UTC at `moment`, in minutes (Lisbon: 0 in winter, 60 in summer). */
export function zoneOffsetMinutes(moment: Date, timeZone = TIME_ZONE): number {
  const p = zonedParts(moment, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(moment.getTime() / 1000) * 1000) / 60_000);
}

/** The calendar date (`YYYY-MM-DD`) of `moment` in `timeZone`. */
export function dateInZone(moment: Date, timeZone = TIME_ZONE): string {
  const p = zonedParts(moment, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/**
 * `moment` as a local wall-clock time without a zone (`2026-11-18T14:05`), to compare with
 * the zone-less times IPMA gives.
 */
export function localStamp(moment: Date, timeZone = TIME_ZONE): string {
  const p = zonedParts(moment, timeZone);
  const two = (n: number) => String(n).padStart(2, '0');
  return `${dateInZone(moment, timeZone)}T${two(p.hour)}:${two(p.minute)}`;
}

/** The instant of local midnight at the start of `date` (`YYYY-MM-DD`) in `timeZone`. */
export function startOfDayInZone(date: string, timeZone = TIME_ZONE): Date {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) throw new Error(`Invalid date: ${date}`);
  const guess = Date.UTC(y, m - 1, d);
  // Two passes handle days on which the offset changes (DST transitions).
  let instant = guess - zoneOffsetMinutes(new Date(guess), timeZone) * 60_000;
  instant = guess - zoneOffsetMinutes(new Date(instant), timeZone) * 60_000;
  return new Date(instant);
}

/** Start and end (exclusive) of the local day containing `moment`. */
export function localDayBounds(moment: Date, timeZone = TIME_ZONE): { start: Date; end: Date } {
  const date = dateInZone(moment, timeZone);
  const start = startOfDayInZone(date, timeZone);
  // 26 h after midnight is always inside the next local day, even across DST changes.
  const next = dateInZone(new Date(start.getTime() + 26 * 3_600_000), timeZone);
  return { start, end: startOfDayInZone(next, timeZone) };
}

/** Rounds to the nearest minute, as almanacs print times. */
export function roundToMinute(moment: Date): Date {
  return new Date(Math.round(moment.getTime() / 60_000) * 60_000);
}
