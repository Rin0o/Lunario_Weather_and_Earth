import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Location } from '../astro/location.ts';
import { moonDay, nextMoonQuarters, type MoonPhaseName } from '../astro/moon.ts';
import { sunDay } from '../astro/sun.ts';
import { formatLongDate, formatPercent, formatShortDate, formatTime } from '../i18n/format.ts';
import { HolidaysCard } from './HolidaysCard.tsx';

const PHASE_ICONS: Record<MoonPhaseName, string> = {
  new: '🌑',
  'waxing-crescent': '🌒',
  'first-quarter': '🌓',
  'waxing-gibbous': '🌔',
  full: '🌕',
  'waning-gibbous': '🌖',
  'last-quarter': '🌗',
  'waning-crescent': '🌘',
};

interface TodayProps {
  now: Date;
  location: Location;
  /** Control to change the location, shown under the date. */
  locationControl?: ReactNode;
  /** Weather card, shown first because it changes most. */
  weather?: ReactNode;
  /** "This fortnight" sowing card, right after the weather. */
  sowing?: ReactNode;
}

export function Today({ now, location, locationControl, weather, sowing }: TodayProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;

  const moon = useMemo(() => moonDay(now, location), [now, location]);
  const sun = useMemo(() => sunDay(now, location), [now, location]);
  const quarters = useMemo(() => nextMoonQuarters(now, 4), [now]);

  const time = (d: Date | null, missing: string) => (d ? formatTime(d, lang) : missing);

  return (
    <section aria-labelledby="today-heading" className="today">
      <h2 id="today-heading">{t('today.title')}</h2>
      <p className="today-date">{formatLongDate(now, lang)}</p>
      {locationControl}
      {weather}
      {sowing}

      <article className="card" aria-labelledby="moon-heading">
        <h3 id="moon-heading">{t('moon.title')}</h3>
        <p className="moon-phase">
          <span className="moon-icon" aria-hidden="true">
            {PHASE_ICONS[moon.phase]}
          </span>
          <span>
            <strong>{t(`moon.phases.${moon.phase}`)}</strong>
            {moon.phaseTime && (
              <> {t('moon.phaseAt', { time: formatTime(moon.phaseTime, lang) })}</>
            )}
          </span>
        </p>
        <dl className="facts">
          <dt>{t('moon.illumination')}</dt>
          <dd>{formatPercent(moon.illumination, lang)}</dd>
          <dt>{t('moon.rise')}</dt>
          <dd>{time(moon.rise, t('moon.none'))}</dd>
          <dt>{t('moon.set')}</dt>
          <dd>{time(moon.set, t('moon.noneSet'))}</dd>
        </dl>
        <h4>{t('moon.next')}</h4>
        <ul className="quarters">
          {quarters.map((q) => (
            <li key={q.time.toISOString()}>
              <span aria-hidden="true">{PHASE_ICONS[q.phase]}</span> {t(`moon.phases.${q.phase}`)}
              <span className="quarter-date">
                {formatShortDate(q.time, lang)}, {formatTime(q.time, lang)}
              </span>
            </li>
          ))}
        </ul>
      </article>

      <article className="card" aria-labelledby="sun-heading">
        <h3 id="sun-heading">{t('sun.title')}</h3>
        <dl className="facts">
          <dt>{t('sun.rise')}</dt>
          <dd>{time(sun.sunrise, '—')}</dd>
          <dt>{t('sun.set')}</dt>
          <dd>{time(sun.sunset, '—')}</dd>
          <dt>{t('sun.dayLength')}</dt>
          <dd>
            {sun.dayLengthMinutes === null
              ? '—'
              : t('sun.duration', {
                  hours: Math.floor(sun.dayLengthMinutes / 60),
                  minutes: sun.dayLengthMinutes % 60,
                })}
          </dd>
        </dl>
      </article>

      <HolidaysCard now={now} />

      {!locationControl && <p className="hint">{t('today.location', { name: location.name })}</p>}
    </section>
  );
}
