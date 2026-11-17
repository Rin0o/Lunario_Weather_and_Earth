import { Droplet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { dateInZone } from '../astro/time.ts';
import { isoDateToNoonUtc } from '../calendar/dates.ts';
import {
  formatDayMonth,
  formatShortDate,
  formatTime,
  formatWeekday,
  intlLocale,
} from '../i18n/format.ts';
import type { DayForecast } from './ipma.ts';
import { isKnownWeatherType, weatherIcon } from './icons.ts';
import { useForecast } from './useForecast.ts';

interface WeatherCardProps {
  now: Date;
  ipmaId: number;
  /** Injected in tests; defaults to the browser's fetch. */
  fetchImpl?: typeof fetch;
}

export function WeatherCard({ now, ipmaId, fetchImpl = fetch }: WeatherCardProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const { forecast, fetchedAt, offline, loading } = useForecast(ipmaId, now, fetchImpl);

  const degrees = (n: number) =>
    `${new Intl.NumberFormat(intlLocale(lang), { maximumFractionDigits: 0 }).format(n)}°`;
  const description = (d: DayForecast) =>
    t(`weather.types.${isKnownWeatherType(d.weatherType) ? d.weatherType : 0}`);

  const [today, ...nextDays] = forecast?.days ?? [];
  const isToday = today?.date === dateInZone(now);

  return (
    <article className="card" aria-labelledby="weather-heading" aria-busy={loading}>
      <h3 id="weather-heading">{t('weather.title')}</h3>

      {!today && (
        <p className="hint">{loading ? t('weather.loading') : t('weather.unavailable')}</p>
      )}

      {today && (
        <>
          <p className="weather-today">
            <img className="weather-icon" src={weatherIcon(today.weatherType)} alt="" />
            <span>
              {!isToday && (
                <>
                  {formatShortDate(isoDateToNoonUtc(today.date), lang)}
                  <br />
                </>
              )}
              <strong>{description(today)}</strong>
              <br />
              <span className="temps">
                {degrees(today.tMax)} / {degrees(today.tMin)}
              </span>
            </span>
          </p>
          <dl className="facts">
            <dt>{t('weather.rain')}</dt>
            <dd>{today.rainProbability === null ? '—' : `${today.rainProbability}%`}</dd>
            <dt>{t('weather.wind')}</dt>
            <dd>
              {today.windClass === null
                ? '—'
                : [
                    today.windDirection && t(`weather.directions.${today.windDirection}`),
                    t(`weather.windClasses.${today.windClass}`),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
            </dd>
          </dl>

          {nextDays.length > 0 && (
            <ol className="forecast-strip" aria-label={t('weather.nextDays')}>
              {nextDays.map((d) => (
                <li key={d.date}>
                  <span className="strip-day">{formatWeekday(isoDateToNoonUtc(d.date), lang)}</span>
                  <img
                    className="strip-icon"
                    src={weatherIcon(d.weatherType)}
                    alt={description(d)}
                  />
                  <span className="temps">
                    {degrees(d.tMax)}
                    <small> {degrees(d.tMin)}</small>
                  </span>
                  {d.rainProbability !== null && (
                    <small className="strip-rain">
                      <Droplet aria-hidden="true" size={12} /> {d.rainProbability}%
                    </small>
                  )}
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      <p className="hint">
        {offline && forecast && <strong>{t('weather.offline')} · </strong>}
        {!fetchedAt
          ? t('weather.sourceOnly')
          : dateInZone(fetchedAt) === dateInZone(now)
            ? t('weather.source', { time: formatTime(fetchedAt, lang) })
            : t('weather.sourceDated', {
                date: formatDayMonth(fetchedAt, lang),
                time: formatTime(fetchedAt, lang),
              })}
      </p>
    </article>
  );
}
