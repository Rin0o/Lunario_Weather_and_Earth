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

  it('adds the moveable feasts on their date for each year, after the fixed saints (Q-11)', () => {
    // Easter is on 5 April 2026 and 28 March 2027.
    expect(names('2026-02-17')).toContain('Terça-feira de Entrudo (Carnaval)');
    expect(names('2026-05-14').at(-1)).toBe('Quinta-feira da Ascensão (Dia da Espiga)');
    expect(names('2027-05-06')).toContain('Quinta-feira da Ascensão (Dia da Espiga)');
    expect(names('2027-05-14')).not.toContain('Quinta-feira da Ascensão (Dia da Espiga)');
    expect(names('2026-06-04')).toContain('Corpo de Deus');
    expect(saintsOn('2026-04-05').find((s) => s.moveable)?.name.en).toBe('Easter Sunday');
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

  it("uses a moveable feast's sayings on its date that year (Q-11)", () => {
    const palmSunday = ['Ramos molhados são louvados.', 'Depois de Ramos, na Páscoa estamos.'];
    // Easter is on 5 April 2026 and 28 March 2027.
    expect(palmSunday).toContain(sayingFor('2026-03-29')?.text);
    expect(palmSunday).toContain(sayingFor('2027-03-21')?.text);
    expect(palmSunday).not.toContain(sayingFor('2027-03-29')?.text);
    expect(sayingFor('2026-03-29')?.feast?.pt).toBe('Domingo de Ramos');
  });

  it('returns nothing for a month without sayings', () => {
    const empty: Catalog = { ...catalog, sayings: [] };
    expect(sayingFor('2026-03-03', empty)).toBeUndefined();
  });
});
