import {
  CONSTITUENTS,
  constituentArguments,
  type HarmonicConstants,
} from '../../app/src/sea/tides.ts';

export interface Sample {
  time: Date;
  level: number;
}

/** A square matrix stored row by row, plus the right-hand side in an extra column. */
class Augmented {
  readonly n: number;
  readonly cells: Float64Array;
  constructor(n: number) {
    this.n = n;
    this.cells = new Float64Array(n * (n + 1));
  }
  get(r: number, c: number): number {
    return this.cells[r * (this.n + 1) + c] ?? 0;
  }
  set(r: number, c: number, value: number): void {
    this.cells[r * (this.n + 1) + c] = value;
  }
  add(r: number, c: number, value: number): void {
    this.set(r, c, this.get(r, c) + value);
  }
}

/** Solves the system by Gauss–Jordan elimination with partial pivoting. */
function solve(m: Augmented): number[] {
  const { n } = m;
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m.get(r, col)) > Math.abs(m.get(pivot, col))) pivot = r;
    }
    if (pivot !== col) {
      for (let c = 0; c <= n; c++) {
        const tmp = m.get(col, c);
        m.set(col, c, m.get(pivot, c));
        m.set(pivot, c, tmp);
      }
    }
    const p = m.get(col, col);
    if (Math.abs(p) < 1e-12) throw new Error('Singular system: the record is too short.');
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = m.get(r, col) / p;
      if (factor === 0) continue;
      for (let c = col; c <= n; c++) m.add(r, c, -factor * m.get(col, c));
    }
  }
  return Array.from({ length: n }, (_, i) => m.get(i, n) / m.get(i, i));
}

/**
 * Least-squares harmonic analysis: fits Z0 and, per constituent, f·(a·cos(V+u) + b·sin(V+u))
 * to the samples, then turns (a, b) into amplitude H and phase lag g.
 */
export function fitHarmonics(samples: readonly Sample[]): HarmonicConstants {
  const n = 1 + 2 * CONSTITUENTS.length;
  const normal = new Augmented(n);
  const row = new Float64Array(n);
  for (const { time, level } of samples) {
    row[0] = 1;
    constituentArguments(time).forEach(({ f, phase }, i) => {
      row[1 + 2 * i] = f * Math.cos(phase);
      row[2 + 2 * i] = f * Math.sin(phase);
    });
    for (let i = 0; i < n; i++) {
      const ri = row[i] ?? 0;
      normal.add(i, n, ri * level);
      for (let j = i; j < n; j++) normal.add(i, j, ri * (row[j] ?? 0));
    }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) normal.set(i, j, normal.get(j, i));
  const x = solve(normal);
  const at = (i: number) => x[i] ?? 0;
  return {
    z0: at(0),
    constituents: CONSTITUENTS.map((_, i) => {
      const a = at(1 + 2 * i);
      const b = at(2 + 2 * i);
      const g = (Math.atan2(b, a) * 180) / Math.PI;
      return [Math.hypot(a, b), (g + 360) % 360] as const;
    }),
  };
}
