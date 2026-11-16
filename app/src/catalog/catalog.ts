import { dateInZone } from '../astro/time.ts';
import data from './catalog.json';
import { ACTION_ORDER, activitiesIn } from './fortnights.ts';
import type { Action, Catalog, Fortnight, Zone, ZoneId } from './types.ts';

export { fortnightDates, inWindow, type Activity } from './fortnights.ts';

/** The catalogue, generated from /data at build time and bundled, so it works offline. */
export const catalog = data as Catalog;

/** The zone whose districts include `district` (an IPMA district name). */
export function zoneForDistrict(district: string, source: Catalog = catalog): Zone | undefined {
  return source.zones.find((z) => z.districts.includes(district));
}

/** The fortnight (1–24) of a moment, by the date in Portugal. */
export function fortnightOf(moment: Date): Fortnight {
  const [, month, day] = dateInZone(moment).split('-').map(Number);
  return ((month ?? 1) - 1) * 2 + ((day ?? 1) <= 15 ? 1 : 2);
}

/** What can be done in a zone during a fortnight, grouped by action, in the given order. */
export function activitiesFor(
  zoneId: ZoneId,
  fortnight: Fortnight,
  order: readonly Action[] = ACTION_ORDER,
  source: Catalog = catalog,
) {
  return activitiesIn(source, zoneId, fortnight, order);
}
