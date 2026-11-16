/**
 * Fortnight helpers over any catalogue. Pure, with no bundled data, so the build can use them
 * to generate the regional calendars (RF-12).
 */
import { addDays, isoDate, type IsoDate } from '../calendar/dates.ts';
import type { Action, CalendarWindow, Catalog, Crop, Fortnight, ZoneId } from './types.ts';

/** First and last day of a fortnight in a given year. */
export function fortnightDates(n: Fortnight, year: number): { first: IsoDate; last: IsoDate } {
  const month = Math.ceil(n / 2);
  if (n % 2 === 1) return { first: isoDate(year, month, 1), last: isoDate(year, month, 15) };
  return { first: isoDate(year, month, 16), last: addDays(isoDate(year, month + 1, 1), -1) };
}

/** Whether a fortnight falls inside an inclusive window that may cross the new year. */
export function inWindow(n: Fortnight, w: Pick<CalendarWindow, 'start' | 'end'>): boolean {
  return w.start <= w.end ? n >= w.start && n <= w.end : n >= w.start || n <= w.end;
}

export interface Activity {
  crop: Crop;
  /** Note for this crop in this zone, e.g. "only under cover" inland. */
  note: CalendarWindow['note'];
  /** True when this is the window's last fortnight. */
  endsNow: boolean;
}

export const ACTION_ORDER: readonly Action[] = ['SV', 'SD', 'TR', 'PL', 'CO'];

/** What can be done in a zone during a fortnight, grouped by action, in the given order. */
export function activitiesIn(
  source: Catalog,
  zoneId: ZoneId,
  fortnight: Fortnight,
  order: readonly Action[] = ACTION_ORDER,
): { action: Action; activities: Activity[] }[] {
  const crops = new Map(source.crops.map((c) => [c.id, c]));
  return order
    .map((action) => {
      const byCrop = new Map<string, Activity>();
      for (const w of source.windows) {
        if (w.zoneId !== zoneId || w.action !== action || !inWindow(fortnight, w)) continue;
        const crop = crops.get(w.cropId);
        if (!crop) continue;
        const endsNow = w.end === fortnight;
        const existing = byCrop.get(crop.id);
        // A crop with two overlapping windows ends now only if none continues.
        byCrop.set(crop.id, {
          crop,
          note: existing?.note ?? w.note,
          endsNow: existing ? existing.endsNow && endsNow : endsNow,
        });
      }
      return { action, activities: [...byCrop.values()] };
    })
    .filter((group) => group.activities.length > 0);
}
