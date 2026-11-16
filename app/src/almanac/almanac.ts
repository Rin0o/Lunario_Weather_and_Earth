/** Saint of the day and saying of the day (RF-08), from the catalogue. Pure, with no state. */
import { catalog } from '../catalog/catalog.ts';
import type { Catalog, Saint, Saying } from '../catalog/types.ts';
import type { IsoDate } from '../calendar/dates.ts';

const parts = (date: IsoDate) => {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return { year, month, day };
};

/** Saints and feasts on a date, in the order of the data file. Empty on days with none. */
export function saintsOn(date: IsoDate, source: Catalog = catalog): Saint[] {
  const { month, day } = parts(date);
  return source.saints.filter((s) => s.month === month && s.day === day);
}

/**
 * The saying for a date. A saying tied to that day (usually its saint's) wins; otherwise the
 * month's sayings take turns, shifted each year so the same date gets a different one.
 */
export function sayingFor(date: IsoDate, source: Catalog = catalog): Saying | undefined {
  const { year, month, day } = parts(date);
  const ofDay = source.sayings.filter((s) => s.month === month && s.day === day);
  if (ofDay.length > 0) return ofDay[year % ofDay.length];
  const ofMonth = source.sayings.filter((s) => s.month === month && s.day === null);
  return ofMonth[(day - 1 + year) % ofMonth.length];
}
