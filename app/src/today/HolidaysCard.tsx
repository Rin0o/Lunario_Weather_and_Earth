import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { dateInZone } from '../astro/time.ts';
import { daysBetween, isoDateToNoonUtc, type IsoDate } from '../calendar/dates.ts';
import { holidayOn, upcomingHolidays, type Holiday } from '../calendar/holidays.ts';
import { formatRelativeDays, formatShortDate } from '../i18n/format.ts';

export function HolidaysCard({ now }: { now: Date }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const today = dateInZone(now) as IsoDate;

  const todays = useMemo(() => holidayOn(today), [today]);
  const upcoming = useMemo(() => upcomingHolidays(today, 3), [today]);

  const name = (h: Holiday) =>
    h.optional
      ? `${t(`holidays.names.${h.id}`)} (${t('holidays.optional')})`
      : t(`holidays.names.${h.id}`);

  return (
    <article className="card" aria-labelledby="holidays-heading">
      <h3 id="holidays-heading">{t('holidays.title')}</h3>
      {todays && <p className="holiday-today">{t('holidays.today', { name: name(todays) })}</p>}
      <h4>{t('holidays.next')}</h4>
      <ul className="quarters">
        {upcoming.map((h) => (
          <li key={h.date}>
            {name(h)}
            <span className="quarter-date">
              {formatShortDate(isoDateToNoonUtc(h.date), lang)} ·{' '}
              {formatRelativeDays(daysBetween(today, h.date), lang)}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
