import { describe, expect, it } from 'vitest';
import { catalog } from '../catalog/catalog.ts';
import type { Saying } from '../catalog/types.ts';
import { fold, matches, sayingsByMonth } from './sayings.ts';

const saying = (over: Partial<Saying>): Saying => ({
  month: 1,
  day: null,
  text: 'A água de janeiro vale dinheiro.',
  meaning: 'Rain in January is worth money.',
  themes: ['tempo'],
  ...over,
});

const ALL = { query: '', theme: null };

describe('fold', () => {
  it('ignores case and accents', () => {
    expect(fold('São João, ÁGUA')).toBe('sao joao, agua');
  });
});

describe('matches', () => {
  it('finds every word, in any order, without accents, in the saying or its meaning', () => {
    const s = saying({});
    expect(matches(s, ALL)).toBe(true);
    expect(matches(s, { query: 'agua', theme: null })).toBe(true);
    expect(matches(s, { query: '  dinheiro   JANEIRO ', theme: null })).toBe(true);
    expect(matches(s, { query: 'rain', theme: null })).toBe(true);
    expect(matches(s, { query: 'água vinho', theme: null })).toBe(false);
  });

  it('reads "S." as "São", both ways', () => {
    const s = saying({ text: 'Por S. Vicente, toda a água é quente.' });
    expect(matches(s, { query: 'são vicente', theme: null })).toBe(true);
    expect(matches(s, { query: 's. vicente', theme: null })).toBe(true);
    expect(matches(s, { query: 'sao', theme: null })).toBe(true);
    expect(matches(saying({ text: 'Os dias.' }), { query: 'sao', theme: null })).toBe(false);
  });

  it('keeps only the sayings of the chosen theme', () => {
    const s = saying({ themes: ['tempo', 'vinha'] });
    expect(matches(s, { query: '', theme: 'vinha' })).toBe(true);
    expect(matches(s, { query: '', theme: 'animais' })).toBe(false);
  });
});

describe('sayingsByMonth', () => {
  it('groups by month from January, the whole month first, then by day', () => {
    const months = sayingsByMonth(
      [
        saying({ month: 3, day: 19, text: 'C' }),
        saying({ month: 3, text: 'B' }),
        saying({ month: 1, day: 22, text: 'A2' }),
        saying({ month: 1, day: 3, text: 'A1' }),
      ],
      ALL,
    );
    expect(months.map((m) => [m.month, m.sayings.map((s) => s.text)])).toEqual([
      [1, ['A1', 'A2']],
      [3, ['B', 'C']],
    ]);
  });

  it('shows every saying of the catalogue, in all twelve months', () => {
    const months = sayingsByMonth(catalog.sayings, ALL);
    expect(months).toHaveLength(12);
    expect(months.reduce((n, m) => n + m.sayings.length, 0)).toBe(catalog.sayings.length);
  });

  it('can start at any month and go round the year', () => {
    const months = sayingsByMonth(catalog.sayings, ALL, 11);
    expect(months.map((m) => m.month)).toEqual([11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('leaves out the months with nothing found', () => {
    const months = sayingsByMonth(catalog.sayings, { query: 'Martinho', theme: null });
    expect(months.map((m) => m.month)).toEqual([10, 11]);
  });
});
