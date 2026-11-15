import { addDays, isoDate, type IsoDate } from './dates.ts';

/**
 * Portuguese national holidays (Código do Trabalho, art. 234, as restored in 2016).
 * Carnival is not a mandatory holiday but is widely observed, so it is listed as optional.
 * Municipal holidays depend on the concelho and are out of scope until RF-04.
 */
export type HolidayId =
  | 'new-year'
  | 'carnival'
  | 'good-friday'
  | 'easter'
  | 'freedom-day'
  | 'labour-day'
  | 'corpus-christi'
  | 'portugal-day'
  | 'assumption'
  | 'republic-day'
  | 'all-saints'
  | 'restoration'
  | 'immaculate-conception'
  | 'christmas';

export interface Holiday {
  id: HolidayId;
  date: IsoDate;
  /** True for Carnival, which employers may or may not grant. */
  optional: boolean;
}

const FIXED: readonly [HolidayId, number, number][] = [
  ['new-year', 1, 1],
  ['freedom-day', 4, 25],
  ['labour-day', 5, 1],
  ['portugal-day', 6, 10],
  ['assumption', 8, 15],
  ['republic-day', 10, 5],
  ['all-saints', 11, 1],
  ['restoration', 12, 1],
  ['immaculate-conception', 12, 8],
  ['christmas', 12, 25],
];

/** Offsets in days from Easter Sunday. */
const MOVEABLE: readonly [HolidayId, number][] = [
  ['carnival', -47],
  ['good-friday', -2],
  ['easter', 0],
  ['corpus-christi', 60],
];

/** Gregorian Easter Sunday (anonymous Gregorian algorithm, Meeus/Jones/Butcher). */
export function easterSunday(year: number): IsoDate {
  if (!Number.isInteger(year) || year < 1583) throw new Error(`Unsupported year: ${year}`);
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return isoDate(year, month, day);
}

/** All national holidays of a year, in date order. */
export function holidaysOfYear(year: number): Holiday[] {
  const easter = easterSunday(year);
  const holidays: Holiday[] = [
    ...FIXED.map(([id, month, day]) => ({ id, date: isoDate(year, month, day), optional: false })),
    ...MOVEABLE.map(([id, offset]) => ({
      id,
      date: addDays(easter, offset),
      optional: id === 'carnival',
    })),
  ];
  return holidays.sort((x, y) => x.date.localeCompare(y.date));
}

/** The holiday on a given date, if any. */
export function holidayOn(date: IsoDate): Holiday | undefined {
  const year = Number(date.slice(0, 4));
  return holidaysOfYear(year).find((h) => h.date === date);
}

/** The next `count` holidays strictly after `date`, continuing into the following years. */
export function upcomingHolidays(date: IsoDate, count: number): Holiday[] {
  const result: Holiday[] = [];
  for (let year = Number(date.slice(0, 4)); result.length < count; year++) {
    for (const h of holidaysOfYear(year)) {
      if (h.date > date && result.length < count) result.push(h);
    }
  }
  return result;
}
