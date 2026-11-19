/** The saints library: search and filter the catalogue's saints (RF-08). Pure, no state. */
import type { Saint, SaintOrigin } from '../catalog/types.ts';
import { searchable } from './sayings.ts';

/** A filter chip: one origin, or the moveable feasts (Q-11) whatever their origin. */
export type SaintGroup = SaintOrigin | 'moveable';

export interface SaintFilter {
  /** Free text, matched against the name in both languages; empty matches all. */
  query: string;
  /** One group (Portuguese saints, popular saints, moveable feasts), or null for all of them. */
  origin: SaintGroup | null;
}

export function matchesSaint(saint: Saint, { query, origin }: SaintFilter): boolean {
  if (origin === 'moveable' ? !saint.moveable : origin && saint.origin !== origin) return false;
  const words = searchable(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = searchable(`${saint.name.pt} ${saint.name.en}`);
  return words.every((word) => haystack.includes(word));
}

export interface DayOfSaints {
  day: number;
  saints: Saint[];
}

export interface MonthOfSaints {
  /** 1–12. */
  month: number;
  days: DayOfSaints[];
  /** How many saints the month holds after the filter. */
  count: number;
}

/**
 * The saints that pass the filter, by month from `firstMonth` round the year and by day within
 * each month, keeping the data file's order on a day. Months without any are left out.
 */
export function saintsByMonth(
  saints: readonly Saint[],
  filter: SaintFilter,
  firstMonth = 1,
): MonthOfSaints[] {
  const months: MonthOfSaints[] = [];
  for (let i = 0; i < 12; i++) {
    const month = ((firstMonth - 1 + i) % 12) + 1;
    const found = saints.filter((s) => s.month === month && matchesSaint(s, filter));
    if (found.length === 0) continue;
    const days: DayOfSaints[] = [];
    for (const saint of found) {
      const last = days.find((d) => d.day === saint.day);
      if (last) last.saints.push(saint);
      else days.push({ day: saint.day, saints: [saint] });
    }
    days.sort((a, b) => a.day - b.day);
    months.push({ month, days, count: found.length });
  }
  return months;
}
