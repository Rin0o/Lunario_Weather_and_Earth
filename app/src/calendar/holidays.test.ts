import { describe, expect, it } from 'vitest';
import { easterSunday, holidayOn, holidaysOfYear, upcomingHolidays } from './holidays.ts';

describe('easterSunday', () => {
  it.each([
    [2008, '2008-03-23'],
    [2011, '2011-04-24'],
    [2019, '2019-04-21'],
    [2024, '2024-03-31'],
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
    [2038, '2038-04-25'], // latest possible date
    [2285, '2285-03-22'], // earliest possible date
  ])('%i → %s', (year, expected) => {
    expect(easterSunday(year)).toBe(expected);
  });

  it('rejects years before the Gregorian calendar', () => {
    expect(() => easterSunday(1500)).toThrow('Unsupported year');
    expect(() => easterSunday(2025.5)).toThrow('Unsupported year');
  });
});

describe('holidaysOfYear', () => {
  // Reference: date.nager.at public holidays for Portugal (national, incl. optional Carnival).
  // prettier-ignore
  const reference: Record<number, string[]> = {
    2025: [
      '2025-01-01', '2025-03-04', '2025-04-18', '2025-04-20', '2025-04-25', '2025-05-01',
      '2025-06-10', '2025-06-19', '2025-08-15', '2025-10-05', '2025-11-01', '2025-12-01',
      '2025-12-08', '2025-12-25',
    ],
    2026: [
      '2026-01-01', '2026-02-17', '2026-04-03', '2026-04-05', '2026-04-25', '2026-05-01',
      '2026-06-04', '2026-06-10', '2026-08-15', '2026-10-05', '2026-11-01', '2026-12-01',
      '2026-12-08', '2026-12-25',
    ],
    2027: [
      '2027-01-01', '2027-02-09', '2027-03-26', '2027-03-28', '2027-04-25', '2027-05-01',
      '2027-05-27', '2027-06-10', '2027-08-15', '2027-10-05', '2027-11-01', '2027-12-01',
      '2027-12-08', '2027-12-25',
    ],
  };

  it.each(Object.entries(reference))('matches the reference list for %s', (year, dates) => {
    expect(holidaysOfYear(Number(year)).map((h) => h.date)).toEqual(dates);
  });

  it('has 13 mandatory holidays and Carnival as the only optional one', () => {
    const holidays = holidaysOfYear(2026);
    expect(holidays.filter((h) => !h.optional)).toHaveLength(13);
    expect(holidays.filter((h) => h.optional).map((h) => h.id)).toEqual(['carnival']);
  });
});

describe('lookups', () => {
  it('finds the holiday on a date', () => {
    expect(holidayOn('2026-06-04')?.id).toBe('corpus-christi');
    expect(holidayOn('2026-06-05')).toBeUndefined();
  });

  it('lists the next holidays, crossing into the next year', () => {
    expect(upcomingHolidays('2026-12-08', 3).map((h) => `${h.date} ${h.id}`)).toEqual([
      '2026-12-25 christmas',
      '2027-01-01 new-year',
      '2027-02-09 carnival',
    ]);
  });

  it('does not include the given date itself', () => {
    expect(upcomingHolidays('2026-12-25', 1)[0]?.id).toBe('new-year');
  });
});
