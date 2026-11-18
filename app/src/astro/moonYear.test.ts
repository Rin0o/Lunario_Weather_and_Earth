import { describe, expect, it } from 'vitest';
import { moonPhasesOfYear } from './moon.ts';

describe('moonPhasesOfYear', () => {
  it("lists every principal phase of 2026 by Portugal's calendar, in order", () => {
    const phases = moonPhasesOfYear(2026);
    expect(phases.every((p) => p.date.startsWith('2026-'))).toBe(true);
    expect(phases.length).toBeGreaterThanOrEqual(49);
    expect(phases.length).toBeLessThanOrEqual(50);
    const times = phases.map((p) => p.time.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    // USNO: full moon on 3 January 2026 at 10:03 UTC.
    expect(phases.find((p) => p.phase === 'full')?.date).toBe('2026-01-03');
    expect(phases.filter((p) => p.phase === 'full')).toHaveLength(13);
  });

  it('marks the blue moon of May 2026', () => {
    const blue = moonPhasesOfYear(2026).filter((p) => p.blueMoon);
    expect(blue.map((p) => p.date)).toEqual(['2026-05-31']);
  });

  it("marks 2026's lunar eclipses at their full moons", () => {
    const eclipses = moonPhasesOfYear(2026)
      .filter((p) => p.eclipse)
      .map((p) => [p.date, p.eclipse]);
    expect(eclipses).toEqual([
      ['2026-03-03', 'total'],
      ['2026-08-28', 'partial'],
    ]);
  });

  it('keeps a phase just after midnight on 1 January in the new year', () => {
    // 2025-12-30 / 2026-01-01 boundaries: no phase of another year slips in.
    const y2027 = moonPhasesOfYear(2027);
    expect(y2027[0]?.date.startsWith('2027-01')).toBe(true);
    expect(y2027.at(-1)?.date.startsWith('2027-12')).toBe(true);
  });
});
