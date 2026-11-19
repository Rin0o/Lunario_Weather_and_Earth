/**
 * Moveable feasts (Q-11): counted from Easter, so they are placed on their date for a given
 * year and then read like the fixed saints and day sayings. Pure, with no state.
 */
import { catalog } from '../catalog/catalog.ts';
import type { Catalog, Saint, Saying } from '../catalog/types.ts';
import { addDays } from '../calendar/dates.ts';
import { easterSunday } from '../calendar/holidays.ts';

const monthDay = (iso: string) => ({
  month: Number(iso.slice(5, 7)),
  day: Number(iso.slice(8, 10)),
});

function feastDates(year: number, source: Catalog) {
  const easter = easterSunday(year);
  return source.feasts.map((feast) => ({
    feast,
    ...monthDay(addDays(easter, feast.easterOffset)),
  }));
}

/** The fixed saints and, on their dates for `year`, the moveable feasts (marked `moveable`). */
export function saintsOfYear(year: number, source: Catalog = catalog): Saint[] {
  const moveable = feastDates(year, source).map(({ feast, month, day }): Saint => ({
    month,
    day,
    name: feast.name,
    origin: feast.origin,
    moveable: true,
  }));
  return [...source.saints, ...moveable];
}

/** The catalogue's sayings and, as day sayings for `year`, those of the moveable feasts. */
export function sayingsOfYear(year: number, source: Catalog = catalog): Saying[] {
  const moveable = feastDates(year, source).flatMap(({ feast, month, day }) =>
    feast.sayings.map((s): Saying => ({ ...s, month, day, feast: feast.name })),
  );
  return [...source.sayings, ...moveable];
}
