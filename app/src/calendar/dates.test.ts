import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, isoDate, isoDateToNoonUtc } from './dates.ts';

describe('dates', () => {
  it('builds and normalises ISO dates', () => {
    expect(isoDate(2026, 2, 5)).toBe('2026-02-05');
    expect(isoDate(2026, 2, 30)).toBe('2026-03-02');
  });

  it('counts whole days between dates, across DST and years', () => {
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(daysBetween('2026-12-25', '2027-01-01')).toBe(7);
    expect(daysBetween('2026-01-10', '2026-01-01')).toBe(-9);
    expect(daysBetween('2026-01-01', addDays('2026-01-01', 365))).toBe(365);
  });

  it('gives midday UTC for safe formatting', () => {
    expect(isoDateToNoonUtc('2026-10-25').toISOString()).toBe('2026-10-25T12:00:00.000Z');
  });
});
