import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { vignetteFor } from '../assets/vignettes.ts';
import type { Location } from '../astro/location.ts';
import { moonDay, nextMoonQuarters } from '../astro/moon.ts';
import { sunDay } from '../astro/sun.ts';
import { formatLongDate, formatPercent, formatShortDate, formatTime } from '../i18n/format.ts';
import { SeasonsCard } from './SeasonsCard.tsx';
import { HolidaysCard } from '../today/HolidaysCard.tsx';
import { MoonTradition } from '../today/MoonTradition.tsx';
import { useMoonMode } from '../today/useMoonMode.ts';
import { meteocon, moonIcon } from '../weather/icons.ts';

interface SkyPageProps {
  now: Date;
  location: Location;
  /** Control to change the location, shown under the date. */
  locationControl?: ReactNode;
}

/**
 * "Céu": the Moon (with the optional Moon mode), the Sun, the seasons and the holidays
 * (RF-02, RF-07, RF-09, RF-19).
 */
export function SkyPage({ now, location, locationControl }: SkyPageProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;

  const moon = useMemo(() => moonDay(now, location), [now, location]);
  const sun = useMemo(() => sunDay(now, location), [now, location]);
  const quarters = useMemo(() => nextMoonQuarters(now, 4), [now]);
  const [moonMode, setMoonMode] = useMoonMode();
  const moonVignette = vignetteFor('lua');

  const time = (d: Date | null, missing: string) => (d ? formatTime(d, lang) : missing);

  return (
    <section aria-labelledby="sky-heading" className="page">
      <header className="sky-head">
        <div>
          <h2 id="sky-heading">{t('sky.title')}</h2>
          <p className="today-date">
            <span>{formatLongDate(now, lang)}</span>
            {locationControl}
          </p>
        </div>
        {moonVignette && <img className="sky-vignette" src={moonVignette} alt="" />}
      </header>

      <article className="card" aria-labelledby="moon-heading">
        <h3 id="moon-heading">{t('moon.title')}</h3>
        <p className="moon-phase">
          <img className="moon-icon moon-disc" src={moonIcon(moon.phase)} alt="" />
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
              <img className="inline-icon moon-disc" src={moonIcon(q.phase)} alt="" />
              {t(`moon.phases.${q.phase}`)}
              <span className="quarter-date">
                {formatShortDate(q.time, lang)}, {formatTime(q.time, lang)}
              </span>
            </li>
          ))}
        </ul>
        <label className="toggle">
          <input
            type="checkbox"
            checked={moonMode}
            onChange={(e) => setMoonMode(e.target.checked)}
          />
          {t('moonMode.toggle')}
        </label>
        {moonMode && <MoonTradition phase={moon.phase} />}
      </article>

      <article className="card" aria-labelledby="sun-heading">
        <h3 id="sun-heading">{t('sun.title')}</h3>
        <dl className="facts">
          <dt>
            <img className="inline-icon" src={meteocon('sunrise')} alt="" />
            {t('sun.rise')}
          </dt>
          <dd>{time(sun.sunrise, '—')}</dd>
          <dt>
            <img className="inline-icon" src={meteocon('sunset')} alt="" />
            {t('sun.set')}
          </dt>
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

      <SeasonsCard now={now} location={location} />

      <HolidaysCard now={now} />

      {!locationControl && <p className="hint">{t('today.location', { name: location.name })}</p>}
    </section>
  );
}
