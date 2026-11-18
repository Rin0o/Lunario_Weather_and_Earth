import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dateInZone } from '../astro/time.ts';
import { daysBetween, isoDateToNoonUtc, type IsoDate } from '../calendar/dates.ts';
import { easterSunday, holidaysOfYear, isMoveable } from '../calendar/holidays.ts';
import { formatRelativeDays, intlLocale } from '../i18n/format.ts';
import { LibraryNav } from './LibraryNav.tsx';

/** The years the switcher reaches: enough to plan ahead or look back, all computed locally. */
const YEARS_AROUND = 10;

/**
 * The national holidays of a year (RF-07), with the moveable ones counted from Easter. Opens
 * on the current year with today's or the next holiday marked; arrows go to other years.
 */
export function HolidaysLibrary({ now }: { now: Date }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const locale = intlLocale(lang);
  const today = dateInZone(now) as IsoDate;
  const thisYear = Number(today.slice(0, 4));
  const [year, setYear] = useState(thisYear);

  const holidays = useMemo(() => holidaysOfYear(year), [year]);
  // The next holiday from today, which after Christmas is next year's New Year.
  const nextDate = useMemo(
    () =>
      [...holidaysOfYear(thisYear), ...holidaysOfYear(thisYear + 1)].find((h) => h.date >= today)
        ?.date,
    [thisYear, today],
  );
  const weekends = holidays.filter((h) => {
    const weekday = isoDateToNoonUtc(h.date).getUTCDay();
    return weekday === 0 || weekday === 6;
  }).length;

  const format = (date: IsoDate, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(isoDateToNoonUtc(date));

  const yearButton = (to: number, label: string, Icon: typeof ChevronLeft) => (
    <button
      type="button"
      className="year-step"
      onClick={() => setYear(to)}
      disabled={Math.abs(to - thisYear) > YEARS_AROUND}
      aria-label={label}
    >
      <Icon aria-hidden="true" size={22} />
    </button>
  );

  return (
    <section aria-labelledby="holidays-library-heading" className="page">
      <LibraryNav current="holidays" />
      <h2 id="holidays-library-heading">{t('holidays.title')}</h2>
      <div className="year-switcher">
        {yearButton(year - 1, t('holidays.previousYear'), ChevronLeft)}
        <p className="year-label" aria-live="polite">
          {year}
        </p>
        {yearButton(year + 1, t('holidays.nextYear'), ChevronRight)}
      </div>
      {year !== thisYear && (
        <p className="year-back">
          <button type="button" className="theme-chip" onClick={() => setYear(thisYear)}>
            {t('holidays.backToThisYear', { year: thisYear })}
          </button>
        </p>
      )}
      <p className="hint sayings-count">
        {t('holidays.count', { count: holidays.length })} ·{' '}
        {t('holidays.onWeekends', { count: weekends })}
      </p>
      <ul className="holiday-list">
        {holidays.map((h) => {
          const isToday = h.date === today;
          const isNext = !isToday && h.date === nextDate;
          const mark = isToday ? 'today' : isNext ? 'next' : h.date < today ? 'past' : undefined;
          const tags = [
            isMoveable(h.id) ? t('holidays.moveable') : null,
            h.optional ? t('holidays.optional') : null,
          ].filter(Boolean);
          return (
            <li key={h.id} data-mark={mark}>
              <span className="holiday-date" aria-hidden="true">
                <strong>{format(h.date, { day: 'numeric' })}</strong>
                {format(h.date, { month: 'short' }).replace('.', '')}
              </span>
              <div>
                {isToday && <p className="saying-today">{t('holidays.todayMark')}</p>}
                {isNext && (
                  <p className="saying-today">
                    {t('holidays.nextMark', {
                      when: formatRelativeDays(daysBetween(today, h.date), lang),
                    })}
                  </p>
                )}
                <p className="holiday-name">{t(`holidays.names.${h.id}`)}</p>
                <p className="saying-meta">
                  <span className="visually-hidden">
                    {format(h.date, { day: 'numeric', month: 'long' })},{' '}
                  </span>
                  {format(h.date, { weekday: 'long' })}
                  {tags.length > 0 && ` — ${tags.join(' · ')}`}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="hint holiday-note">
        {t('holidays.easterNote', {
          year,
          date: format(easterSunday(year), { day: 'numeric', month: 'long' }),
        })}{' '}
        {t('holidays.municipalNote')}
      </p>
    </section>
  );
}
