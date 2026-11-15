import { describe, expect, it } from 'vitest';
import { DISTRICTS } from '../location/locations.ts';
import {
  activitiesFor,
  catalog,
  fortnightDates,
  fortnightOf,
  inWindow,
  zoneForDistrict,
} from './catalog.ts';

const names = (groups: ReturnType<typeof activitiesFor>, action: string) =>
  groups
    .find((g) => g.action === action)
    ?.activities.map((a) => a.crop.id)
    .sort() ?? [];

describe('catalog', () => {
  it('maps every IPMA district to a zone', () => {
    for (const district of Object.values(DISTRICTS)) {
      expect(zoneForDistrict(district), district).toBeDefined();
    }
    expect(zoneForDistrict('Coimbra')?.id).toBe('LC');
    expect(zoneForDistrict('Aveiro')?.id).toBe('LN');
    expect(zoneForDistrict('Guarda')?.id).toBe('IN');
    expect(zoneForDistrict('Faro')?.id).toBe('SU');
    expect(zoneForDistrict('Funchal')).toBeUndefined();
  });

  it('finds the fortnight by the date in Portugal', () => {
    expect(fortnightOf(new Date('2026-01-01T12:00:00Z'))).toBe(1);
    expect(fortnightOf(new Date('2026-11-15T23:30:00Z'))).toBe(21); // still 15 Nov in Lisbon
    expect(fortnightOf(new Date('2026-07-15T23:30:00Z'))).toBe(14); // already 16 Jul (UTC+1)
    expect(fortnightOf(new Date('2026-12-31T12:00:00Z'))).toBe(24);
  });

  it('gives the dates of a fortnight, including leap-year February', () => {
    expect(fortnightDates(21, 2026)).toEqual({ first: '2026-11-01', last: '2026-11-15' });
    expect(fortnightDates(4, 2028)).toEqual({ first: '2028-02-16', last: '2028-02-29' });
    expect(fortnightDates(24, 2026)).toEqual({ first: '2026-12-16', last: '2026-12-31' });
  });

  it('checks windows that cross the new year', () => {
    expect(inWindow(5, { start: 3, end: 7 })).toBe(true);
    expect(inWindow(8, { start: 3, end: 7 })).toBe(false);
    expect(inWindow(1, { start: 23, end: 2 })).toBe(true);
    expect(inWindow(24, { start: 23, end: 2 })).toBe(true);
    expect(inWindow(10, { start: 23, end: 2 })).toBe(false);
  });

  it('lists what to do in Litoral Centro in the first half of November', () => {
    const groups = activitiesFor('LC', 21);
    expect(groups.map((g) => g.action)).toEqual(['SV', 'SD', 'TR', 'PL', 'CO']);
    expect(names(groups, 'SV')).toEqual(['cebola']);
    expect(names(groups, 'SD')).toEqual(['ervilha', 'espinafre', 'fava', 'nabo']);
    expect(names(groups, 'TR')).toEqual(['couve_coracao', 'couve_galega']);
    expect(names(groups, 'PL')).toEqual(['alho', 'morango']);
    const spinach = groups
      .find((g) => g.action === 'SD')
      ?.activities.find((a) => a.crop.id === 'espinafre');
    expect(spinach?.endsNow).toBe(true);
    const peas = groups
      .find((g) => g.action === 'SD')
      ?.activities.find((a) => a.crop.id === 'ervilha');
    expect(peas?.endsNow).toBe(false);
  });

  it('merges overlapping windows of one crop without claiming it ends', () => {
    // Onion in the South: nursery windows Out Q1–Dez Q2 and Dez Q2–Jan Q2 overlap in Dez Q2.
    const onion = activitiesFor('SU', 24, ['SV']).flatMap((g) => g.activities);
    expect(onion.filter((a) => a.crop.id === 'cebola')).toEqual([
      expect.objectContaining({ endsNow: false }),
    ]);
  });

  it('carries zone notes, such as marginal crops inland', () => {
    const melon = activitiesFor('IN', 11, ['SD'])
      .flatMap((g) => g.activities)
      .find((a) => a.crop.id === 'melao');
    expect(melon?.note?.pt).toMatch(/^Marginal no interior/);
  });

  it('skips actions with nothing to do', () => {
    expect(activitiesFor('LC', 21, ['SV', 'SD']).map((g) => g.action)).toEqual(['SV', 'SD']);
    const empty = { ...catalog, windows: [] };
    expect(activitiesFor('LC', 21, undefined, empty)).toEqual([]);
  });
});
