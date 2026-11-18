import { describe, expect, it } from 'vitest';
import { catalog } from '../catalog/catalog.ts';
import type { Saint } from '../catalog/types.ts';
import { matchesSaint, saintsByMonth } from './saints.ts';

const saint = (month: number, day: number, pt: string, origin: Saint['origin'] = 'geral') =>
  ({ month, day, name: { pt, en: pt }, origin }) satisfies Saint;

describe('matchesSaint', () => {
  const antonio = saint(6, 13, 'Santo António de Lisboa', 'popular');

  it('finds names without accents, in any order of words', () => {
    expect(matchesSaint(antonio, { query: 'antonio', origin: null })).toBe(true);
    expect(matchesSaint(antonio, { query: 'lisboa santo', origin: null })).toBe(true);
    expect(matchesSaint(antonio, { query: 'porto', origin: null })).toBe(false);
  });

  it('filters by origin', () => {
    expect(matchesSaint(antonio, { query: '', origin: 'popular' })).toBe(true);
    expect(matchesSaint(antonio, { query: '', origin: 'portugal' })).toBe(false);
  });
});

describe('saintsByMonth', () => {
  it('groups by month from the first one, and by day in date order', () => {
    const saints = [saint(1, 20, 'C'), saint(1, 6, 'A'), saint(1, 6, 'B'), saint(12, 8, 'D')];
    const months = saintsByMonth(saints, { query: '', origin: null }, 12);
    expect(months.map((m) => m.month)).toEqual([12, 1]);
    expect(months[1]?.count).toBe(3);
    expect(months[1]?.days.map((d) => [d.day, d.saints.map((s) => s.name.pt)])).toEqual([
      [6, ['A', 'B']],
      [20, ['C']],
    ]);
  });

  it('holds every saint of the catalogue, once', () => {
    const months = saintsByMonth(catalog.saints, { query: '', origin: null });
    expect(months).toHaveLength(12);
    expect(months.reduce((n, m) => n + m.count, 0)).toBe(catalog.saints.length);
  });
});
