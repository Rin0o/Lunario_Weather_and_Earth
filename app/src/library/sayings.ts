/** The sayings library: search and filter the catalogue's sayings (RF-08). Pure, no state. */
import type { Saying, SayingTheme } from '../catalog/types.ts';

/** Lower case without accents, so "agua" finds "água" and "sao joao" finds "São João". */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** Folded, with the sayings' "S. Martinho" read as "São Martinho", as people type it. */
export function searchable(text: string): string {
  return fold(text).replace(/(^|[^\p{L}])s\.\s*/gu, '$1sao ');
}

export interface SayingFilter {
  /** Free text, matched against the saying and its English meaning; empty matches all. */
  query: string;
  /** One theme, or null for all of them. */
  theme: SayingTheme | null;
}

export function matches(saying: Saying, { query, theme }: SayingFilter): boolean {
  if (theme && !saying.themes.includes(theme)) return false;
  const words = searchable(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = searchable(`${saying.text} ${saying.meaning}`);
  return words.every((word) => haystack.includes(word));
}

export interface MonthOfSayings {
  /** 1–12. */
  month: number;
  sayings: Saying[];
}

/**
 * The sayings that pass the filter, by month from `firstMonth` round the year (so the library
 * opens on the current month), months without any left out. Within a month, the sayings of
 * the whole month come first, then those of a day, by day.
 */
export function sayingsByMonth(
  sayings: readonly Saying[],
  filter: SayingFilter,
  firstMonth = 1,
): MonthOfSayings[] {
  const months: MonthOfSayings[] = [];
  for (let i = 0; i < 12; i++) {
    const month = ((firstMonth - 1 + i) % 12) + 1;
    const found = sayings
      .filter((s) => s.month === month && matches(s, filter))
      .sort((a, b) => (a.day ?? 0) - (b.day ?? 0));
    if (found.length > 0) months.push({ month, sayings: found });
  }
  return months;
}
