import { describe, expect, it } from 'vitest';
import { fitHarmonics } from '../../../scripts/lib/harmonics.ts';
import { tideDay, tideNow, tideStrength } from './portTides.ts';
import { CONSTITUENTS, seaLevel, tideExtremes, type HarmonicConstants } from './tides.ts';
import tideData from './tideConstants.json';

const MINUTE = 60_000;

/** Only M2 and S2, with a mean level of 2 m. */
const synthetic: HarmonicConstants = {
  z0: 2,
  constituents: CONSTITUENTS.map((k) =>
    k.name === 'M2' ? [1, 60] : k.name === 'S2' ? [0.35, 90] : [0, 0],
  ),
};

describe('tide model', () => {
  it('has two high and two low waters a day, about 12 h 25 min apart', () => {
    const from = new Date('2026-11-18T00:00:00Z');
    const extremes = tideExtremes(synthetic, from, new Date(from.getTime() + 3 * 86_400_000));
    const highs = extremes.filter((e) => e.kind === 'high');
    expect(highs.length).toBeGreaterThanOrEqual(5);
    for (let i = 1; i < highs.length; i++) {
      const gap = ((highs[i]?.time.getTime() ?? 0) - (highs[i - 1]?.time.getTime() ?? 0)) / MINUTE;
      expect(gap).toBeGreaterThan(12 * 60);
      expect(gap).toBeLessThan(12 * 60 + 50);
    }
    // Highs and lows alternate.
    extremes.forEach((e, i) => i > 0 && expect(e.kind).not.toBe(extremes[i - 1]?.kind));
  });

  it('finds the turning points to the minute', () => {
    const from = new Date('2026-11-18T00:00:00Z');
    for (const e of tideExtremes(synthetic, from, new Date(from.getTime() + 86_400_000))) {
      const before = seaLevel(synthetic, new Date(e.time.getTime() - 5 * MINUTE));
      const after = seaLevel(synthetic, new Date(e.time.getTime() + 5 * MINUTE));
      if (e.kind === 'high') expect(e.height).toBeGreaterThanOrEqual(Math.max(before, after));
      else expect(e.height).toBeLessThanOrEqual(Math.min(before, after));
    }
  });

  it('recovers the constants it was given from a year of hourly levels', () => {
    const samples = Array.from({ length: 365 * 24 }, (_, h) => {
      const time = new Date(Date.UTC(2025, 0, 1) + h * 3_600_000);
      return { time, level: seaLevel(synthetic, time) };
    });
    const fitted = fitHarmonics(samples);
    expect(fitted.z0).toBeCloseTo(2, 3);
    const m2 = fitted.constituents[CONSTITUENTS.findIndex((k) => k.name === 'M2')];
    const s2 = fitted.constituents[CONSTITUENTS.findIndex((k) => k.name === 'S2')];
    expect(m2?.[0]).toBeCloseTo(1, 3);
    expect(m2?.[1]).toBeCloseTo(60, 1);
    expect(s2?.[0]).toBeCloseTo(0.35, 3);
    expect(s2?.[1]).toBeCloseTo(90, 1);
  });
});

describe('port tides', () => {
  it('has constants for every constituent of every port', () => {
    expect(tideData.constituents).toEqual(CONSTITUENTS.map((k) => k.name));
    for (const port of Object.values(tideData.ports)) {
      expect(port.constituents).toHaveLength(CONSTITUENTS.length);
      expect(port.datum).toBeGreaterThan(1.5);
      expect(port.datum).toBeLessThan(2.3);
    }
  });

  it('matches the Cascais tide gauge (IOC) on 7 October 2026, outside the fitted year', () => {
    // Turning points of the gauge's 5-minute means that day (UTC), out of sample.
    const observed = [
      { kind: 'low', time: '2026-10-07T05:56:47Z' },
      { kind: 'high', time: '2026-10-07T12:03:48Z' },
      { kind: 'low', time: '2026-10-07T18:29:46Z' },
    ];
    const day = tideDay('cascais', new Date('2026-10-07T12:00:00Z'));
    for (const o of observed) {
      const match = day?.extremes.find(
        (e) => e.kind === o.kind && Math.abs(e.time.getTime() - Date.parse(o.time)) < 3 * 3_600_000,
      );
      expect(match, o.time).toBeDefined();
      expect(Math.abs((match?.time.getTime() ?? 0) - Date.parse(o.time)) / MINUTE).toBeLessThan(12);
    }
  });

  it('gives heights above the chart datum, a curve for the whole day and a strength', () => {
    const day = tideDay('leixoes', new Date('2026-11-18T12:00:00Z'));
    expect(day?.extremes.length).toBeGreaterThanOrEqual(3);
    for (const e of day?.extremes ?? []) {
      expect(e.height).toBeGreaterThan(-0.1);
      expect(e.height).toBeLessThan(4.5);
    }
    expect(day?.curve).toHaveLength(73); // every 20 min, midnight to midnight
    expect(['spring', 'neap', 'mean']).toContain(day?.strength);
    expect(day?.method).toBe('model');
    expect(tideDay('cascais', new Date())?.method).toBe('gauge');
  });

  it('calls spring tides after new and full moon and neap tides after the quarters', () => {
    // First quarter 2026-11-17, full moon 11-24, last quarter 12-01, new moon 12-09.
    expect(tideStrength(new Date('2026-11-18T12:00:00Z'))).toBe('neap');
    expect(tideStrength(new Date('2026-11-26T12:00:00Z'))).toBe('spring');
    expect(tideStrength(new Date('2026-12-02T12:00:00Z'))).toBe('neap');
    expect(tideStrength(new Date('2026-12-10T12:00:00Z'))).toBe('spring');
    expect(tideStrength(new Date('2026-11-22T00:00:00Z'))).toBe('mean');
  });

  it('has a bigger range at spring tides than at neap tides', () => {
    const range = (iso: string) => tideDay('cascais', new Date(iso))?.range ?? 0;
    // A perigean spring tide (full moon near perigee) and the neap before it.
    expect(range('2026-11-26T12:00:00Z')).toBeGreaterThan(2.8);
    expect(range('2026-11-17T12:00:00Z')).toBeLessThan(1.4);
  });

  it('knows whether the tide is rising', () => {
    const day = tideDay('cascais', new Date('2026-11-18T12:00:00Z'));
    const [first, second] = day?.extremes ?? [];
    if (!first || !second) throw new Error('no tides');
    const between = new Date((first.time.getTime() + second.time.getTime()) / 2);
    expect(tideNow('cascais', between)?.rising).toBe(first.kind === 'low');
  });

  it('returns null for an unknown port', () => {
    expect(tideDay('atlantis', new Date())).toBeNull();
    expect(tideNow('atlantis', new Date())).toBeNull();
  });
});
