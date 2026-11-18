import { describe, expect, it } from 'vitest';
import { localDaysBetween, seasonEvents, seasonsNow } from './seasons.ts';

const MINUTE = 60_000;

// Reference instants (UTC) from the US Naval Observatory, "Earth's Seasons", to the minute.
const USNO = {
  2026: ['2026-03-20T14:46Z', '2026-06-21T08:24Z', '2026-09-23T00:05Z', '2026-12-21T20:50Z'],
  2027: ['2027-03-20T20:25Z', '2027-06-21T14:11Z', '2027-09-23T06:02Z', '2027-12-22T02:42Z'],
};

describe('seasons', () => {
  it('matches the USNO solstices and equinoxes to within two minutes', () => {
    for (const [year, instants] of Object.entries(USNO)) {
      seasonEvents(Number(year)).forEach((e, i) => {
        const diff = Math.abs(e.time.getTime() - Date.parse(instants[i] ?? ''));
        expect(diff, `${e.event} ${year}`).toBeLessThan(2 * MINUTE);
      });
    }
  });

  it('knows the season and the next event', () => {
    const now = new Date('2026-11-18T10:00:00Z');
    const s = seasonsNow(now);
    expect(s.season).toBe('autumn');
    expect(s.next.event).toBe('december-solstice');
    expect(s.daysUntil).toBe(33);
    expect(s.progress).toBeGreaterThan(0.6);
    expect(s.progress).toBeLessThan(0.7);
    expect(s.year.map((e) => e.event)).toEqual([
      'march-equinox',
      'june-solstice',
      'september-equinox',
      'december-solstice',
    ]);
  });

  it('turns the year: winter goes on after the December solstice', () => {
    const s = seasonsNow(new Date('2027-01-10T12:00:00Z'));
    expect(s.season).toBe('winter');
    expect(s.since.getUTCFullYear()).toBe(2026);
    expect(s.next.event).toBe('march-equinox');
    expect(s.year[0]?.time.getUTCFullYear()).toBe(2027);
    // Until the March equinox the list starts with the December solstice of 2026, the current.
    expect(s.list).toHaveLength(5);
    expect(s.list[0]).toEqual(s.current);
    expect(s.list[0]?.event).toBe('december-solstice');

    // Once spring begins, the list is just the year's four.
    expect(seasonsNow(new Date('2027-04-01T12:00:00Z')).list).toHaveLength(4);
    expect(seasonsNow(new Date('2026-11-18T10:00:00Z')).list).toHaveLength(4);

    const late = seasonsNow(new Date('2026-12-25T12:00:00Z'));
    expect(late.season).toBe('winter');
    expect(late.next.time.getUTCFullYear()).toBe(2027);
  });

  it('counts zero days on the day of the event, and changes season at its instant', () => {
    const before = seasonsNow(new Date('2026-12-21T20:00:00Z'));
    expect(before.season).toBe('autumn');
    expect(before.daysUntil).toBe(0);
    expect(seasonsNow(new Date('2026-12-21T21:00:00Z')).season).toBe('winter');
  });

  it('counts local days across a change of clocks', () => {
    // 2027-03-28 01:00 UTC the clocks go forward in Lisbon.
    expect(
      localDaysBetween(new Date('2027-03-27T23:30:00Z'), new Date('2027-03-29T00:30:00Z')),
    ).toBe(2);
  });
});
