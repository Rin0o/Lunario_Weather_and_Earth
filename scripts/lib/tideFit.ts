/**
 * From sea-level records to each port's harmonic constants (D-34).
 *
 * Tide gauges with open data cover only Vigo, Cascais, Lagos and Huelva. The Open-Meteo sea
 * level (a global ocean model) has the right shape everywhere but runs early: fitted side by
 * side in 2025, its semidiurnal phases lag the gauges by a near-constant 15–17° (about half an
 * hour) and its amplitudes are within 2%. So each port gets:
 *
 * - at a gauge port (Cascais, Lagos): the gauge's own constants;
 * - elsewhere: the model's constants at the port, corrected by the gauge/model difference,
 *   interpolated along the coast between the two nearest gauges.
 */
import { CONSTITUENTS, seaLevel, type HarmonicConstants } from '../../app/src/sea/tides.ts';
import { fitHarmonics, type Sample } from './harmonics.ts';

/** Fits, drops samples whose residual is beyond 4σ (spikes, datum jumps), and fits again. */
export function robustFit(samples: readonly Sample[]): {
  constants: HarmonicConstants;
  rms: number;
  kept: number;
} {
  let kept = samples;
  let constants = fitHarmonics(kept);
  for (let pass = 0; pass < 3; pass++) {
    const residuals = kept.map((s) => s.level - seaLevel(constants, s.time));
    const sd = Math.sqrt(residuals.reduce((a, r) => a + r * r, 0) / residuals.length);
    kept = kept.filter((_, i) => Math.abs(residuals[i] as number) < 4 * sd);
    constants = fitHarmonics(kept);
  }
  const residuals = kept.map((s) => s.level - seaLevel(constants, s.time));
  const rms = Math.sqrt(residuals.reduce((a, r) => a + r * r, 0) / residuals.length);
  return { constants, rms, kept: kept.length };
}

/** Per constituent: amplitude ratio (gauge / model) and phase difference (gauge − model, °). */
export type Correction = readonly { ratio: number; dg: number }[];

const index = (name: string) => CONSTITUENTS.findIndex((k) => k.name === name);

/**
 * Which constituent's correction each constituent uses. The six large ones are measured on
 * their own; the small ones borrow from the nearest large one of the same species, where the
 * gauges' few-centimetre amplitudes would make a ratio noisy. Long-period and shallow-water
 * constituents are not corrected but copied from the nearest gauge (`null`).
 */
const SOURCE: Record<string, string | null> = {
  SA: null,
  SSA: null,
  MM: null,
  MSF: null,
  Q1: 'O1',
  O1: 'O1',
  P1: 'K1',
  K1: 'K1',
  '2N2': 'N2',
  MU2: 'N2',
  N2: 'N2',
  NU2: 'N2',
  M2: 'M2',
  L2: 'M2',
  T2: 'S2',
  S2: 'S2',
  K2: 'K2',
  MN4: null,
  M4: null,
  MS4: null,
  M6: null,
};

export function correctionOf(gauge: HarmonicConstants, model: HarmonicConstants): Correction {
  return CONSTITUENTS.map((k) => {
    const source = SOURCE[k.name];
    if (!source) return { ratio: 1, dg: 0 };
    const i = index(source);
    const [gh, gg] = gauge.constituents[i] as readonly [number, number];
    const [mh, mg] = model.constituents[i] as readonly [number, number];
    return { ratio: gh / mh, dg: ((gg - mg + 540) % 360) - 180 };
  });
}

/** Linear blend of two corrections, `t` = 0 at `a` and 1 at `b`. */
export function blend(a: Correction, b: Correction, t: number): Correction {
  return a.map((x, i) => {
    const y = b[i] as { ratio: number; dg: number };
    return { ratio: x.ratio + (y.ratio - x.ratio) * t, dg: x.dg + (y.dg - x.dg) * t };
  });
}

/**
 * The model's constants with a correction applied; the constituents that are not corrected
 * come from `nearestGauge` instead.
 */
export function corrected(
  model: HarmonicConstants,
  correction: Correction,
  nearestGauge: HarmonicConstants,
): HarmonicConstants {
  return {
    z0: 0,
    constituents: CONSTITUENTS.map((k, i) => {
      if (!SOURCE[k.name]) return nearestGauge.constituents[i] as readonly [number, number];
      const [h, g] = model.constituents[i] as readonly [number, number];
      const c = correction[i] as { ratio: number; dg: number };
      return [h * c.ratio, (g + c.dg + 360) % 360] as const;
    }),
  };
}

/**
 * Depth of the lowest astronomical tide below the mean level over a full 18.6-year nodal
 * cycle, sampled every 10 minutes: the chart datum ("zero hidrográfico") the heights are
 * given from.
 */
export function lowestAstronomicalTide(constants: HarmonicConstants, fromYear: number): number {
  const c = { ...constants, z0: 0 };
  const start = Date.UTC(fromYear, 0, 1);
  const end = Date.UTC(fromYear + 19, 0, 1);
  let low = Infinity;
  // Coarse hourly scan, then 10-minute detail around each candidate low.
  for (let t = start; t < end; t += 3_600_000) {
    const h = seaLevel(c, new Date(t));
    if (h < low + 0.05) {
      for (let u = t - 3_600_000; u <= t + 3_600_000; u += 600_000) {
        low = Math.min(low, seaLevel(c, new Date(u)));
      }
    }
  }
  return -low;
}

/** Constants rounded for the JSON file: mm and 0.1°. */
export function rounded(constants: HarmonicConstants): [number, number][] {
  return constants.constituents.map(([h, g]) => [
    Math.round(h * 1000) / 1000,
    Math.round(g * 10) / 10,
  ]);
}
