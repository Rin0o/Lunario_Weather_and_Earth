/**
 * Tides from harmonic constants (D-34): the sea level is a sum of cosines, one per
 * constituent, each with a fixed speed set by the motions of the Moon and the Sun.
 *
 *   h(t) = Z0 + Σ f·H·cos(V(t) + u − g)
 *
 * H and g (amplitude and phase lag) are the port's constants, fitted once by
 * `scripts/fit-tides.ts`. V is the constituent's astronomical argument (Doodson numbers);
 * f and u are the nodal corrections for the 18.6-year cycle of the Moon's node (Pugh,
 * "Tides, Surges and Mean Sea-Level", table 4.3). The same functions do the fitting and the
 * prediction, so the phase convention only has to be self-consistent.
 */

const DEG = Math.PI / 180;

/** Doodson numbers (τ, s, h, p, N′, p′) plus a phase offset in degrees. */
interface Constituent {
  name: string;
  doodson: readonly [number, number, number, number, number, number];
  offset: number;
  nodal: 'none' | 'M2' | 'O1' | 'K1' | 'K2' | 'M4' | 'M6';
}

export const CONSTITUENTS: readonly Constituent[] = [
  { name: 'SA', doodson: [0, 0, 1, 0, 0, 0], offset: 0, nodal: 'none' },
  { name: 'SSA', doodson: [0, 0, 2, 0, 0, 0], offset: 0, nodal: 'none' },
  { name: 'MM', doodson: [0, 1, 0, -1, 0, 0], offset: 0, nodal: 'none' },
  { name: 'MSF', doodson: [0, 2, -2, 0, 0, 0], offset: 0, nodal: 'M2' },
  { name: 'Q1', doodson: [1, -2, 0, 1, 0, 0], offset: -90, nodal: 'O1' },
  { name: 'O1', doodson: [1, -1, 0, 0, 0, 0], offset: -90, nodal: 'O1' },
  { name: 'P1', doodson: [1, 1, -2, 0, 0, 0], offset: -90, nodal: 'none' },
  { name: 'K1', doodson: [1, 1, 0, 0, 0, 0], offset: 90, nodal: 'K1' },
  { name: '2N2', doodson: [2, -2, 0, 2, 0, 0], offset: 0, nodal: 'M2' },
  { name: 'MU2', doodson: [2, -2, 2, 0, 0, 0], offset: 0, nodal: 'M2' },
  { name: 'N2', doodson: [2, -1, 0, 1, 0, 0], offset: 0, nodal: 'M2' },
  { name: 'NU2', doodson: [2, -1, 2, -1, 0, 0], offset: 0, nodal: 'M2' },
  { name: 'M2', doodson: [2, 0, 0, 0, 0, 0], offset: 0, nodal: 'M2' },
  { name: 'L2', doodson: [2, 1, 0, -1, 0, 0], offset: 180, nodal: 'M2' },
  { name: 'T2', doodson: [2, 2, -3, 0, 0, 1], offset: 0, nodal: 'none' },
  { name: 'S2', doodson: [2, 2, -2, 0, 0, 0], offset: 0, nodal: 'none' },
  { name: 'K2', doodson: [2, 2, 0, 0, 0, 0], offset: 0, nodal: 'K2' },
  { name: 'MN4', doodson: [4, -1, 0, 1, 0, 0], offset: 0, nodal: 'M4' },
  { name: 'M4', doodson: [4, 0, 0, 0, 0, 0], offset: 0, nodal: 'M4' },
  { name: 'MS4', doodson: [4, 2, -2, 0, 0, 0], offset: 0, nodal: 'M2' },
  { name: 'M6', doodson: [6, 0, 0, 0, 0, 0], offset: 0, nodal: 'M6' },
];

/** Mean longitudes in degrees at `time` (Meeus; T in Julian centuries from J2000). */
function astronomical(time: Date) {
  const days = time.getTime() / 86_400_000 - 10_957.5; // days since 2000-01-01 12:00 UTC
  const T = days / 36_525;
  const hours = (time.getTime() / 3_600_000) % 24;
  const s = 218.3165 + 481_267.8813 * T;
  const h = 280.4665 + 36_000.7698 * T;
  const p = 83.3532 + 4_069.0137 * T;
  const N = 125.0445 - 1_934.1363 * T;
  const p1 = 282.9384 + 1.7195 * T;
  const tau = 15 * hours + 180 + h - s;
  return { tau, s, h, p, Nprime: -N, N, p1 };
}

function nodal(kind: Constituent['nodal'], N: number): { f: number; u: number } {
  const c = Math.cos(N * DEG);
  const c2 = Math.cos(2 * N * DEG);
  const sn = Math.sin(N * DEG);
  const s2 = Math.sin(2 * N * DEG);
  const m2 = { f: 1 - 0.037 * c, u: -2.1 * sn };
  switch (kind) {
    case 'M2':
      return m2;
    case 'M4':
      return { f: m2.f ** 2, u: 2 * m2.u };
    case 'M6':
      return { f: m2.f ** 3, u: 3 * m2.u };
    case 'O1':
      return { f: 1.009 + 0.187 * c - 0.015 * c2, u: 10.8 * sn - 1.3 * s2 };
    case 'K1':
      return { f: 1.006 + 0.115 * c - 0.009 * c2, u: -8.9 * sn + 0.7 * s2 };
    case 'K2':
      return { f: 1.024 + 0.286 * c + 0.008 * c2, u: -17.7 * sn + 0.7 * s2 };
    default:
      return { f: 1, u: 0 };
  }
}

/** f and V + u (radians) of every constituent at `time`, in the order of CONSTITUENTS. */
export function constituentArguments(time: Date): { f: number; phase: number }[] {
  const a = astronomical(time);
  return CONSTITUENTS.map((k) => {
    const [d1, d2, d3, d4, d5, d6] = k.doodson;
    const V = d1 * a.tau + d2 * a.s + d3 * a.h + d4 * a.p + d5 * a.Nprime + d6 * a.p1 + k.offset;
    const { f, u } = nodal(k.nodal, a.N);
    return { f, phase: (V + u) * DEG };
  });
}

/** A port's constants: mean level and, per constituent, amplitude (m) and phase lag (°). */
export interface HarmonicConstants {
  z0: number;
  /** [H, g] in the order of CONSTITUENTS. */
  constituents: readonly (readonly [number, number])[];
}

/** Sea level (m, relative to the mean level of the fitted data) at `time`. */
export function seaLevel(constants: HarmonicConstants, time: Date): number {
  const args = constituentArguments(time);
  let h = constants.z0;
  for (let i = 0; i < args.length; i++) {
    const c = constants.constituents[i];
    const arg = args[i];
    if (!c || !arg) continue;
    h += arg.f * c[0] * Math.cos(arg.phase - c[1] * DEG);
  }
  return h;
}

export interface TideExtreme {
  kind: 'high' | 'low';
  time: Date;
  height: number;
}

const MINUTE = 60_000;

/**
 * High and low waters between `from` and `to`: scans the curve every 10 minutes, then refines
 * each turning point to the minute with a parabola through the three samples around it.
 */
export function tideExtremes(constants: HarmonicConstants, from: Date, to: Date): TideExtreme[] {
  const step = 10 * MINUTE;
  const start = from.getTime() - step;
  const end = to.getTime() + step;
  const levels: number[] = [];
  for (let t = start; t <= end; t += step) levels.push(seaLevel(constants, new Date(t)));
  const out: TideExtreme[] = [];
  for (let i = 1; i < levels.length - 1; i++) {
    const a = levels[i - 1] as number;
    const b = levels[i] as number;
    const c = levels[i + 1] as number;
    const high = b > a && b >= c;
    const low = b < a && b <= c;
    if (!high && !low) continue;
    const denom = a - 2 * b + c;
    const shift = denom === 0 ? 0 : (0.5 * (a - c)) / denom;
    const t = Math.round((start + (i + shift) * step) / MINUTE) * MINUTE;
    if (t < from.getTime() || t >= to.getTime()) continue;
    const time = new Date(t);
    out.push({ kind: high ? 'high' : 'low', time, height: seaLevel(constants, time) });
  }
  return out;
}
