import { describe, expect, it } from 'vitest';
import type { Location } from './location.ts';
import { moonDay, nextMoonQuarters } from './moon.ts';
import { sunDay } from './sun.ts';
import {
  dateInZone,
  localDayBounds,
  roundToMinute,
  startOfDayInZone,
  zoneOffsetMinutes,
} from './time.ts';

// Reference values from the US Naval Observatory (aa.usno.navy.mil/data), rounded to the
// minute in UTC. We allow ±1.5 min for their rounding.
const TOLERANCE_MS = 90_000;
const utc = (iso: string) => new Date(`${iso}:00Z`);
const expectNear = (actual: Date | null, expected: string) => {
  expect(actual).not.toBeNull();
  expect(Math.abs((actual as Date).getTime() - utc(expected).getTime())).toBeLessThanOrEqual(
    TOLERANCE_MS,
  );
};

const LISBON: Location = { name: 'Lisboa', latitude: 38.7223, longitude: -9.1393 };
const GUARDA: Location = { name: 'Guarda', latitude: 40.5373, longitude: -7.2676 };

describe('time zone helpers (Europe/Lisbon)', () => {
  it('knows the winter and summer offsets', () => {
    expect(zoneOffsetMinutes(utc('2025-01-15T12:00'))).toBe(0);
    expect(zoneOffsetMinutes(utc('2025-07-15T12:00'))).toBe(60);
  });

  it('finds local midnight, including on DST change days', () => {
    expect(startOfDayInZone('2025-01-15').toISOString()).toBe('2025-01-15T00:00:00.000Z');
    expect(startOfDayInZone('2025-07-15').toISOString()).toBe('2025-07-14T23:00:00.000Z');
    expect(startOfDayInZone('2025-03-30').toISOString()).toBe('2025-03-30T00:00:00.000Z');
    expect(startOfDayInZone('2025-10-26').toISOString()).toBe('2025-10-25T23:00:00.000Z');
  });

  it('gives 23 h and 25 h days at the DST changes', () => {
    const hours = (iso: string) => {
      const { start, end } = localDayBounds(utc(iso));
      return (end.getTime() - start.getTime()) / 3_600_000;
    };
    expect(hours('2025-03-30T12:00')).toBe(23);
    expect(hours('2025-10-26T12:00')).toBe(25);
    expect(hours('2025-06-21T12:00')).toBe(24);
  });

  it('maps an instant to the local calendar date', () => {
    expect(dateInZone(utc('2025-07-14T23:30'))).toBe('2025-07-15');
    expect(dateInZone(utc('2025-01-14T23:30'))).toBe('2025-01-14');
  });

  it('rejects malformed dates and rounds to the minute', () => {
    expect(() => startOfDayInZone('2025-xx-01')).toThrow('Invalid date');
    expect(roundToMinute(new Date('2025-01-01T10:00:29Z')).toISOString()).toBe(
      '2025-01-01T10:00:00.000Z',
    );
    expect(roundToMinute(new Date('2025-01-01T10:00:30Z')).toISOString()).toBe(
      '2025-01-01T10:01:00.000Z',
    );
  });
});

describe('moon phases', () => {
  it('matches the USNO principal phases for January–February 2025', () => {
    const quarters = nextMoonQuarters(utc('2025-01-01T00:00'), 8);
    const expected: [string, string][] = [
      ['first-quarter', '2025-01-06T23:56'],
      ['full', '2025-01-13T22:27'],
      ['last-quarter', '2025-01-21T20:31'],
      ['new', '2025-01-29T12:36'],
      ['first-quarter', '2025-02-05T08:02'],
      ['full', '2025-02-12T13:53'],
      ['last-quarter', '2025-02-20T17:32'],
      ['new', '2025-02-28T00:45'],
    ];
    expect(quarters.map((q) => q.phase)).toEqual(expected.map(([phase]) => phase));
    quarters.forEach((q, i) => expectNear(q.time, expected[i]?.[1] ?? ''));
  });

  it.each([
    ['2025-01-03T12:00', 'waxing-crescent'],
    ['2025-01-06T12:00', 'first-quarter'], // at 23:56, still 6 January in Lisbon
    ['2025-01-10T12:00', 'waxing-gibbous'],
    ['2025-01-13T12:00', 'full'],
    ['2025-01-17T12:00', 'waning-gibbous'],
    ['2025-01-21T12:00', 'last-quarter'],
    ['2025-01-25T12:00', 'waning-crescent'],
    ['2025-01-29T12:00', 'new'],
  ])('names the day of %s as %s', (moment, phase) => {
    expect(moonDay(utc(moment), LISBON).phase).toBe(phase);
  });

  it('reports the exact phase time and the illumination', () => {
    const full = moonDay(utc('2025-01-13T12:00'), LISBON);
    expectNear(full.phaseTime, '2025-01-13T22:27');
    expect(full.illumination).toBeGreaterThan(0.98);

    const newMoon = moonDay(utc('2025-01-29T12:00'), LISBON);
    expect(newMoon.illumination).toBeLessThan(0.01);

    const between = moonDay(utc('2025-01-10T12:00'), LISBON);
    expect(between.phaseTime).toBeNull();
    expect(between.angle).toBeGreaterThan(90);
    expect(between.angle).toBeLessThan(180);
  });

  it('matches the USNO moonrise and moonset in Lisbon on 21 June 2025', () => {
    const day = moonDay(utc('2025-06-21T12:00'), LISBON);
    expectNear(day.rise, '2025-06-21T01:39');
    expectNear(day.set, '2025-06-21T15:54');
  });

  it('matches the USNO days without moonrise or moonset in Lisbon (January 2025)', () => {
    const noSet = moonDay(utc('2025-01-06T12:00'), LISBON);
    expectNear(noSet.rise, '2025-01-06T11:52');
    expect(noSet.set).toBeNull();

    const noRise = moonDay(utc('2025-01-20T12:00'), LISBON);
    expect(noRise.rise).toBeNull();
    expectNear(noRise.set, '2025-01-20T11:07');
  });

  it('never reports a moonrise or moonset outside the local day', () => {
    // Over a lunar month, about one day has no moonrise; it must never leak into the next day.
    const moments = Array.from({ length: 30 }, (_, i) => new Date(Date.UTC(2025, 0, 1 + i, 12)));
    const days = moments.map((moment) => ({
      date: dateInZone(moment),
      ...moonDay(moment, LISBON),
    }));
    expect(days.some((d) => d.rise === null)).toBe(true);
    expect(days.some((d) => d.set === null)).toBe(true);
    for (const d of days) {
      if (d.rise) expect(dateInZone(d.rise)).toBe(d.date);
      if (d.set) expect(dateInZone(d.set)).toBe(d.date);
    }
  });
});

describe('sun', () => {
  it('matches the USNO sunrise and sunset in Lisbon at the June solstice', () => {
    const day = sunDay(utc('2025-06-21T12:00'), LISBON);
    expectNear(day.sunrise, '2025-06-21T05:12');
    expectNear(day.sunset, '2025-06-21T20:05');
    expect(day.dayLengthMinutes).toBeGreaterThanOrEqual(892);
    expect(day.dayLengthMinutes).toBeLessThanOrEqual(894);
  });

  it('matches the USNO sunrise and sunset in Guarda at the December solstice', () => {
    const day = sunDay(utc('2025-12-21T12:00'), GUARDA);
    expectNear(day.sunrise, '2025-12-21T07:49');
    expectNear(day.sunset, '2025-12-21T17:05');
  });
});
