// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  formatFortnight,
  harvestMask,
  maskToWindows,
  parseFortnight,
  shiftFortnight,
  windowLength,
  windowMask,
} from './fortnights.ts';

describe('fortnights', () => {
  it('parses and formats labels', () => {
    expect(parseFortnight('Jan Q1')).toBe(1);
    expect(parseFortnight('mar q2'.replace('q', 'Q'))).toBe(6);
    expect(parseFortnight('Dez Q2')).toBe(24);
    expect(formatFortnight(5)).toBe('Mar Q1');
    expect(formatFortnight(24)).toBe('Dez Q2');
    for (const bad of ['Mar', 'Mar Q3', 'Xyz Q1', '']) {
      expect(() => parseFortnight(bad)).toThrow('invalid fortnight');
    }
  });

  it('shifts across the year in both directions', () => {
    expect(shiftFortnight(1, -1)).toBe(24);
    expect(shiftFortnight(24, 1)).toBe(1);
    expect(shiftFortnight(23, 3)).toBe(2);
    expect(shiftFortnight(10, 0)).toBe(10);
  });

  it('measures and masks windows that cross the new year', () => {
    expect(windowLength(5, 5)).toBe(1);
    expect(windowLength(23, 2)).toBe(4);
    expect(windowMask(23, 2).flatMap((on, i) => (on ? [i + 1] : []))).toEqual([1, 2, 23, 24]);
  });

  it('turns masks back into windows, keeping a run across December whole', () => {
    expect(maskToWindows(windowMask(23, 2))).toEqual([[23, 2]]);
    const twoRuns = windowMask(3, 5).map((on, i) => on || windowMask(10, 12)[i] === true);
    expect(maskToWindows(twoRuns)).toEqual([
      [3, 5],
      [10, 12],
    ]);
    expect(maskToWindows(Array(24).fill(true))).toEqual([[1, 24]]);
    expect(maskToWindows(Array(24).fill(false))).toEqual([]);
  });
});

describe('harvestMask (D-19)', () => {
  const runs = (mask: boolean[]) =>
    maskToWindows(mask).map(([a, b]) => [formatFortnight(a), formatFortnight(b)]);

  it('adds the cycle to the first and last sowing day', () => {
    // Lettuce sown 16 Jan–30 Sep, 60–90 days: 17 Mar → 29 Dec.
    expect(
      runs(harvestMask(parseFortnight('Jan Q2'), parseFortnight('Set Q2'), { min: 60, max: 90 })),
    ).toEqual([['Mar Q2', 'Dez Q2']]);
  });

  it('handles sowing windows that cross the new year', () => {
    // Peas sown 1 Oct–15 Mar, 80–120 days: 20 Dec → 13 Jul.
    expect(
      runs(harvestMask(parseFortnight('Out Q1'), parseFortnight('Mar Q1'), { min: 80, max: 120 })),
    ).toEqual([['Dez Q2', 'Jul Q1']]);
  });

  it('covers the whole year when the span is a year or longer', () => {
    expect(harvestMask(1, 24, { min: 30, max: 60 }).every(Boolean)).toBe(true);
  });
});
