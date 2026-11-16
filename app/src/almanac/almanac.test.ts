import { describe, expect, it } from 'vitest';
import { addDays, type IsoDate } from '../calendar/dates.ts';
import { catalog } from '../catalog/catalog.ts';
import type { Catalog } from '../catalog/types.ts';
import { saintsOn, sayingFor } from './almanac.ts';

const names = (date: IsoDate) => saintsOn(date).map((s) => s.name.pt);

describe('saint of the day', () => {
  it("finds the day's saints, including Portugal's own and popular devotions", () => {
    expect(names('2026-06-13')).toEqual(['Santo António']);
    expect(names('2026-11-11')).toEqual(['São Martinho']);
    expect(names('2026-02-20')).toEqual(['São Francisco e Santa Jacinta Marto']);
    expect(names('2026-05-15')).toEqual(['Santo Isidro Lavrador']);
    expect(names('2026-02-03')).toEqual(['São Brás', 'São Óscar (Ansgário)']);
  });

  it('has nothing on days without a saint in the calendars used (D-31)', () => {
    expect(saintsOn('2026-01-04')).toEqual([]);
  });

  it('covers most of the year', () => {
    const days = new Set(catalog.saints.map((s) => `${String(s.month)}-${String(s.day)}`));
    expect(days.size).toBeGreaterThan(210);
  });
});

describe('saying of the day', () => {
  it("uses the saint's saying on its day", () => {
    expect(sayingFor('2026-04-25')?.text).toBe('Sáveis por S. Marcos enchem os barcos.');
  });

  it('takes turns between the sayings of a day across the years', () => {
    const a = sayingFor('2026-11-11')?.text;
    const b = sayingFor('2027-11-11')?.text;
    expect([a, b].sort()).toEqual([
      'Dia de S. Martinho, lume, castanhas e vinho.',
      'No dia de S. Martinho, vai à adega e prova o vinho.',
    ]);
  });

  it('rotates through the month on the other days, so consecutive days differ', () => {
    const january = Array.from({ length: 5 }, (_, i) => sayingFor(addDays('2026-01-01', i)));
    expect(january.every((s) => s?.month === 1 && s.day === null)).toBe(true);
    expect(new Set(january.map((s) => s?.text)).size).toBe(5);
    expect(sayingFor('2026-01-01')?.text).not.toBe(sayingFor('2027-01-01')?.text);
  });

  it('has a saying with its meaning for every day of the year', () => {
    for (let i = 0; i < 366; i++) {
      const saying = sayingFor(addDays('2028-01-01', i));
      expect(saying?.meaning, addDays('2028-01-01', i)).toBeTruthy();
    }
  });

  it('returns nothing for a month without sayings', () => {
    const empty: Catalog = { ...catalog, sayings: [] };
    expect(sayingFor('2026-03-03', empty)).toBeUndefined();
  });
});
