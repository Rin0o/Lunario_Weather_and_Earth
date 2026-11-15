/** A calendar date in ISO form, `YYYY-MM-DD`, with no time zone. */
export type IsoDate = `${number}-${number}-${number}`;

const pad = (n: number) => String(n).padStart(2, '0');

const fromUtc = (d: Date): IsoDate =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` as IsoDate;

/** Builds an ISO date from a year, month (1–12) and day. */
export function isoDate(year: number, month: number, day: number): IsoDate {
  return fromUtc(new Date(Date.UTC(year, month - 1, day)));
}

function parseIsoDate(date: IsoDate): Date {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) throw new Error(`Invalid date: ${date}`);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Adds whole days to an ISO date, independent of the local time zone and DST. */
export function addDays(date: IsoDate, days: number): IsoDate {
  const d = parseIsoDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtc(d);
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / 86_400_000);
}

/** The device-local calendar date of a moment. */
export function toIsoDate(moment: Date): IsoDate {
  return `${moment.getFullYear()}-${pad(moment.getMonth() + 1)}-${pad(moment.getDate())}` as IsoDate;
}

/**
 * Midday UTC on an ISO date: a safe instant for formatting the date in any European time
 * zone without it slipping to the previous or next day.
 */
export function isoDateToNoonUtc(date: IsoDate): Date {
  const d = parseIsoDate(date);
  d.setUTCHours(12);
  return d;
}
