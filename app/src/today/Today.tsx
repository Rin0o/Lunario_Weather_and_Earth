import { ChevronRight } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Location } from '../astro/location.ts';
import { moonDay } from '../astro/moon.ts';
import { sunDay } from '../astro/sun.ts';
import { dateInZone } from '../astro/time.ts';
import type { IsoDate } from '../calendar/dates.ts';
import { holidayOn } from '../calendar/holidays.ts';
import { formatLongDate, formatPercent, formatTime } from '../i18n/format.ts';
import { href } from '../navigation/route.ts';
import { meteocon, moonIcon } from '../weather/icons.ts';
import { AlmanacCard } from './AlmanacCard.tsx';

interface TodayProps {
  now: Date;
  location: Location;
  /** Control to change the location, shown under the date. */
  locationControl?: ReactNode;
  /** Frost warning, shown above everything when there is a risk (RF-16). */
  frost?: ReactNode;
  /** Weather card, shown first because it changes most. */
  weather?: ReactNode;
  /** "This fortnight" sowing card, right after the weather. */
  sowing?: ReactNode;
}

/** "Hoje" (RF-01): what matters today; the full Moon and Sun are in "Céu". */
export function Today({ now, location, locationControl, frost, weather, sowing }: TodayProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;

  const moon = useMemo(() => moonDay(now, location), [now, location]);
  const sun = useMemo(() => sunDay(now, location), [now, location]);
  const holiday = holidayOn(dateInZone(now) as IsoDate);
  const time = (d: Date | null) => (d ? formatTime(d, lang) : '—');

  return (
    <section aria-labelledby="today-heading" className="page today">
      <h2 id="today-heading">{t('today.title')}</h2>
      <p className="today-date">{formatLongDate(now, lang)}</p>
      {locationControl}
      {frost}
      {weather}
      {sowing}
      <AlmanacCard now={now} />

      <article className="card sky-summary" aria-labelledby="sky-summary-heading">
        <h3 id="sky-summary-heading">{t('sky.summary')}</h3>
        {holiday && (
          <p className="holiday-today">
            {t('holidays.today', {
              name: holiday.optional
                ? `${t(`holidays.names.${holiday.id}`)} (${t('holidays.optional')})`
                : t(`holidays.names.${holiday.id}`),
            })}
          </p>
        )}
        <div className="sky-summary-row">
          <img className="moon-icon moon-disc" src={moonIcon(moon.phase)} alt="" />
          <p>
            <strong>{t(`moon.phases.${moon.phase}`)}</strong>
            <br />
            <span className="hint">
              {t('moon.illumination')} {formatPercent(moon.illumination, lang)}
            </span>
          </p>
        </div>
        <dl className="facts">
          <dt>
            <img className="inline-icon" src={meteocon('sunrise')} alt="" />
            {t('sun.rise')}
          </dt>
          <dd>{time(sun.sunrise)}</dd>
          <dt>
            <img className="inline-icon" src={meteocon('sunset')} alt="" />
            {t('sun.set')}
          </dt>
          <dd>{time(sun.sunset)}</dd>
        </dl>
        <a className="more-link" href={href.sky}>
          {t('sky.more')}
          <ChevronRight aria-hidden="true" size={18} />
        </a>
      </article>

      {!locationControl && <p className="hint">{t('today.location', { name: location.name })}</p>}
    </section>
  );
}
