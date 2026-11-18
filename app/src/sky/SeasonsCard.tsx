import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Location } from '../astro/location.ts';
import { seasonsNow, SEASON_OF } from '../astro/seasons.ts';
import { sunDay } from '../astro/sun.ts';
import { dateInZone } from '../astro/time.ts';
import {
  formatDayMonthLong,
  formatLongDate,
  formatRelativeDays,
  formatShortDate,
  formatShortDateWithYear,
  formatTime,
} from '../i18n/format.ts';

interface SeasonsCardProps {
  now: Date;
  location: Location;
}

/**
 * "Estações": the season we are in, the next solstice or equinox (date, time, days to go
 * and the length of that day here), and the four of the year. All computed on the phone.
 */
export function SeasonsCard({ now, location }: SeasonsCardProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const seasons = useMemo(() => seasonsNow(now), [now]);
  const { next } = seasons;
  const nextDay = useMemo(() => sunDay(next.time, location), [next.time, location]);
  const today = useMemo(() => sunDay(now, location), [now, location]);

  const duration = (minutes: number) =>
    minutes < 60
      ? t('seasons.minutes', { minutes })
      : t('sun.duration', { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
  const difference =
    nextDay.dayLengthMinutes !== null && today.dayLengthMinutes !== null
      ? nextDay.dayLengthMinutes - today.dayLengthMinutes
      : null;

  return (
    <article className="card seasons-card" aria-labelledby="seasons-heading">
      <h3 id="seasons-heading">{t('seasons.title')}</h3>

      <p className="season-now">
        <strong>{t(`seasons.names.${seasons.season}`)}</strong>
        <span className="hint">
          {' '}
          {t('seasons.since', { date: formatDayMonthLong(seasons.since, lang) })}
        </span>
      </p>
      <div
        className="season-progress"
        role="progressbar"
        aria-label={t('seasons.progress', { season: t(`seasons.names.${seasons.season}`) })}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(seasons.progress * 100)}
      >
        <span style={{ width: `${(seasons.progress * 100).toFixed(1)}%` }} />
      </div>

      <h4>{t(`seasons.events.${next.event}`)}</h4>
      <p className="season-next">
        <span>
          {formatLongDate(next.time, lang)}, {formatTime(next.time, lang)}
        </span>
        <strong className="season-countdown">
          {seasons.daysUntil === 0
            ? t('seasons.today')
            : formatRelativeDays(seasons.daysUntil, lang)}
        </strong>
      </p>
      {nextDay.dayLengthMinutes !== null && (
        <p className="season-daylight">
          {t(`seasons.daylight.${next.event}`, { length: duration(nextDay.dayLengthMinutes) })}
          {difference !== null && difference !== 0 && (
            <span className="hint">
              {' '}
              {t(difference > 0 ? 'seasons.longer' : 'seasons.shorter', {
                length: duration(Math.abs(difference)),
              })}
            </span>
          )}
        </p>
      )}

      <h4>{t('seasons.year', { year: seasons.calendarYear })}</h4>
      <ul className="season-year">
        {seasons.list.map((e) => {
          const same = (m: { time: Date }) => m.time.getTime() === e.time.getTime();
          const mark = same(seasons.current) ? 'current' : same(next) ? 'next' : null;
          // The December solstice of the year before, shown until the March equinox.
          const yearBefore = Number(dateInZone(e.time).slice(0, 4)) !== seasons.calendarYear;
          return (
            <li
              key={e.time.toISOString()}
              data-past={(e.time < now && !mark) || undefined}
              data-mark={mark ?? undefined}
            >
              <span className="season-event">
                <strong>{t(`seasons.events.${e.event}`)}</strong>
                <small>
                  {t(`seasons.starts.${SEASON_OF[e.event]}`)}
                  {mark && <span className="season-mark"> · {t(`seasons.marks.${mark}`)}</span>}
                </small>
              </span>
              <span className="quarter-date">
                {yearBefore ? formatShortDateWithYear(e.time, lang) : formatShortDate(e.time, lang)}
                , {formatTime(e.time, lang)}
              </span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
