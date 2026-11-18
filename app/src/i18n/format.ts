import { roundToMinute, TIME_ZONE } from '../astro/time.ts';

/** Intl locale for a UI language. English uses en-GB for the 24-hour clock and day-month order. */
export function intlLocale(language: string | undefined): string {
  return language === 'en' ? 'en-GB' : 'pt-PT';
}

/** `06:12`, in Portugal's time zone, rounded to the nearest minute. */
export function formatTime(moment: Date, language: string | undefined): string {
  return new Intl.DateTimeFormat(intlLocale(language), {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: TIME_ZONE,
  }).format(roundToMinute(moment));
}

/** `sábado, 15 de novembro` / `Saturday 15 November`. */
export function formatLongDate(moment: Date, language: string | undefined): string {
  return new Intl.DateTimeFormat(intlLocale(language), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: TIME_ZONE,
  }).format(moment);
}

/** Short date for lists: `sáb., 22/11` style in Portuguese, `Sat 22 Nov` in English. */
export function formatShortDate(moment: Date, language: string | undefined): string {
  return new Intl.DateTimeFormat(intlLocale(language), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: TIME_ZONE,
  }).format(moment);
}

/** `1–15 de novembro` / `1–15 November`. */
export function formatDateRange(from: Date, to: Date, language: string | undefined): string {
  return new Intl.DateTimeFormat(intlLocale(language), {
    day: 'numeric',
    month: 'long',
    timeZone: TIME_ZONE,
  }).formatRange(from, to);
}

/** `3 de novembro de 2026` / `3 November 2026`. */
export function formatFullDate(moment: Date, language: string | undefined): string {
  return new Intl.DateTimeFormat(intlLocale(language), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TIME_ZONE,
  }).format(moment);
}

/** `16 de janeiro` / `16 January`. */
export function formatDayMonthLong(moment: Date, language: string | undefined): string {
  return new Intl.DateTimeFormat(intlLocale(language), {
    day: 'numeric',
    month: 'long',
    timeZone: TIME_ZONE,
  }).format(moment);
}

/** Short month name for calendar headers, without the trailing dot: `jan`, `fev` / `Jan`, `Feb`. */
export function formatMonthShort(month: number, language: string | undefined): string {
  return new Intl.DateTimeFormat(intlLocale(language), { month: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(2026, month - 1, 15)))
    .replace(/\.$/, '');
}

/** Day and month: `15/11` / `15 Nov`. */
export function formatDayMonth(moment: Date, language: string | undefined): string {
  return new Intl.DateTimeFormat(intlLocale(language), {
    day: 'numeric',
    month: 'short',
    timeZone: TIME_ZONE,
  }).format(moment);
}

/** Short weekday: `seg.` / `Mon`. */
export function formatWeekday(moment: Date, language: string | undefined): string {
  return new Intl.DateTimeFormat(intlLocale(language), {
    weekday: 'short',
    timeZone: TIME_ZONE,
  }).format(moment);
}

/** `amanhã`, `dentro de 5 dias` / `tomorrow`, `in 5 days`. */
export function formatRelativeDays(days: number, language: string | undefined): string {
  return new Intl.RelativeTimeFormat(intlLocale(language), { numeric: 'auto' }).format(days, 'day');
}

/** Whole percent, e.g. `63 %` in Portuguese and `63%` in English. */
export function formatPercent(fraction: number, language: string | undefined): string {
  return new Intl.NumberFormat(intlLocale(language), {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(fraction);
}

/** Short date with the year, for a date of another year: `segunda, 21/12/2026` / `Mon, 21 Dec 2026`. */
export function formatShortDateWithYear(moment: Date, language: string | undefined): string {
  return new Intl.DateTimeFormat(intlLocale(language), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: TIME_ZONE,
  }).format(moment);
}
