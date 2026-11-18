import { ChevronRight, MapPin, TriangleAlert } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { vignetteFor } from '../assets/vignettes.ts';
import { dateInZone, startOfDayInZone } from '../astro/time.ts';
import { isoDateToNoonUtc } from '../calendar/dates.ts';
import type { SeaPort } from '../coast/useSeaPort.ts';
import {
  formatDayMonth,
  formatLongDate,
  formatTime,
  formatWeekday,
  intlLocale,
} from '../i18n/format.ts';
import { href } from '../navigation/route.ts';
import { DirectionArrow } from './DirectionArrow.tsx';
import { beaufort, formatDecimal, formatRange } from './format.ts';
import { tideDay } from './portTides.ts';
import { compassOf, type SeaDay, type SeaHour, type SeaWarning } from './seaForecast.ts';
import { TideCard } from './TideCard.tsx';
import { useSeaForecast } from './useSeaForecast.ts';

interface SeaPageProps {
  now: Date;
  seaPort: SeaPort;
  /** Injected in tests; defaults to the browser's fetch. */
  fetchImpl?: typeof fetch;
}

/** The hour of `hours` closest to `now` (local `YYYY-MM-DDTHH:00` strings). */
function hourNow(hours: SeaHour[], now: Date): SeaHour | null {
  const stamp = `${dateInZone(now)}T${formatTime(now, 'pt-PT').slice(0, 2)}:00`;
  return hours.find((h) => h.time === stamp) ?? hours[0] ?? null;
}

/** "Mar": tides, waves, water and wind at the user's port (D-34, D-35). */
export function SeaPage({ now, seaPort, fetchImpl = fetch }: SeaPageProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const { port } = seaPort;
  const { days, warnings, fetchedAt, offline, loading } = useSeaForecast(port, now, fetchImpl);
  const vignette = vignetteFor('mar');

  const [today, ...nextDays] = days;
  const isToday = today?.date === dateInZone(now);
  const hour = today && isToday ? hourNow(today.hours, now) : null;
  const direction = (deg: number) => t(`weather.directions.${compassOf(deg)}`);
  const metres = (v: string) => t('sea.metres', { value: v });
  const kmh = (v: number) => t('sea.kmh', { value: Math.round(v) });
  const degrees = (v: number) =>
    `${new Intl.NumberFormat(intlLocale(lang), { maximumFractionDigits: 0 }).format(v)}°`;

  return (
    <section aria-labelledby="sea-heading" className="page">
      <header className="sky-head">
        <div>
          <h2 id="sea-heading">{t('sea.title')}</h2>
          <p className="today-date">
            <span>{formatLongDate(now, lang)}</span>
            <a className="location-inline" href={href.settings} title={t('sea.port.change')}>
              <MapPin aria-hidden="true" size={16} />
              {port.name}
              {seaPort.automatic && seaPort.distanceKm >= 5 && (
                <span className="location-choose">
                  {' '}
                  · {t('sea.port.distance', { km: Math.round(seaPort.distanceKm) })}
                </span>
              )}
              <ChevronRight aria-hidden="true" size={14} />
            </a>
          </p>
        </div>
        {vignette && <img className="sea-vignette" src={vignette} alt="" />}
      </header>

      {warnings.length > 0 && <SeaWarnings warnings={warnings} />}

      <TideCard now={now} portId={port.id} portName={port.name} />

      <article className="card" aria-labelledby="sea-state-heading" aria-busy={loading}>
        <h3 id="sea-state-heading">{t('sea.state.title')}</h3>
        {!today && <p className="hint">{loading ? t('sea.loading') : t('sea.unavailable')}</p>}
        {today && (
          <dl className="facts">
            <dt>{t('sea.state.waves')}</dt>
            <dd className="with-arrow">
              {today.ipma?.waveHeight
                ? metres(formatRange(today.ipma.waveHeight, lang))
                : today.waveHeight && metres(formatRange(today.waveHeight, lang))}
              {hour?.waveDirection != null && (
                <>
                  <DirectionArrow from={hour.waveDirection} />
                  {direction(hour.waveDirection)}
                </>
              )}
            </dd>
            {(today.ipma?.wavePeriod || hour?.wavePeriod != null) && (
              <>
                <dt>{t('sea.state.period')}</dt>
                <dd>
                  {today.ipma?.wavePeriod
                    ? t('sea.seconds', { value: formatRange(today.ipma.wavePeriod, lang, 0) })
                    : t('sea.seconds', { value: formatDecimal(hour?.wavePeriod ?? 0, lang, 0) })}
                </dd>
              </>
            )}
            {today.ipma?.totalSea && (
              <>
                <dt>{t('sea.state.totalSea')}</dt>
                <dd>{metres(formatRange(today.ipma.totalSea, lang))}</dd>
              </>
            )}
            {hour?.swellHeight != null && (
              <>
                <dt>{t('sea.state.swell')}</dt>
                <dd>
                  {metres(formatDecimal(hour.swellHeight, lang))}
                  {hour.swellPeriod != null &&
                    ` · ${t('sea.seconds', { value: formatDecimal(hour.swellPeriod, lang, 0) })}`}
                </dd>
              </>
            )}
            <dt>{t('sea.state.water')}</dt>
            <dd>
              {today.ipma?.water
                ? degrees(today.ipma.water.max)
                : today.water
                  ? degrees(today.water.max)
                  : '—'}
            </dd>
          </dl>
        )}
      </article>

      {today && (hour?.wind != null || today.wind) && (
        <article className="card" aria-labelledby="sea-wind-heading">
          <h3 id="sea-wind-heading">{t('sea.wind.title')}</h3>
          <dl className="facts">
            {hour?.wind != null && (
              <>
                <dt>{t('sea.wind.now')}</dt>
                <dd className="with-arrow">
                  {kmh(hour.wind)}
                  {hour.windDirection != null && (
                    <>
                      <DirectionArrow from={hour.windDirection} />
                      {direction(hour.windDirection)}
                    </>
                  )}
                  <small className="beaufort">
                    {t('sea.wind.beaufort', { force: beaufort(hour.wind) })}
                  </small>
                </dd>
              </>
            )}
            {today.wind && (
              <>
                <dt>{t('sea.wind.today')}</dt>
                <dd>
                  {t('sea.kmhRange', {
                    min: Math.round(today.wind.min),
                    max: Math.round(today.wind.max),
                  })}
                </dd>
              </>
            )}
            {today.gusts != null && (
              <>
                <dt>{t('sea.wind.gusts')}</dt>
                <dd>{t('sea.wind.upTo', { value: kmh(today.gusts) })}</dd>
              </>
            )}
          </dl>
        </article>
      )}

      {nextDays.length > 0 && <SeaDays days={nextDays} portId={port.id} />}

      <p className="hint">
        {offline && days.length > 0 && <strong>{t('sea.offline')} · </strong>}
        {fetchedAt
          ? dateInZone(fetchedAt) === dateInZone(now)
            ? t('sea.source', { time: formatTime(fetchedAt, lang) })
            : t('sea.sourceDated', {
                date: formatDayMonth(fetchedAt, lang),
                time: formatTime(fetchedAt, lang),
              })
          : t('sea.sourceOnly')}
      </p>
    </section>
  );
}

function SeaWarnings({ warnings }: { warnings: SeaWarning[] }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  // IPMA's times are local and zone-less: read them as Lisbon times.
  const at = (stamp: string) => {
    const start = startOfDayInZone(stamp.slice(0, 10));
    const [h = 0, m = 0] = stamp.slice(11, 16).split(':').map(Number);
    return new Date(start.getTime() + (h * 60 + m) * 60_000);
  };
  const span = (w: SeaWarning) =>
    `${formatWeekday(at(w.start), lang)} ${formatTime(at(w.start), lang)} – ${formatWeekday(at(w.end), lang)} ${formatTime(at(w.end), lang)}`;
  return (
    <article className="card sea-warnings" aria-labelledby="sea-warnings-heading">
      <h3 id="sea-warnings-heading">
        <TriangleAlert aria-hidden="true" size={18} /> {t('sea.warnings.title')}
      </h3>
      <ul>
        {warnings.map((w) => (
          <li key={`${w.start}-${w.level}`} className={`warning-${w.level}`}>
            <strong>{t(`sea.warnings.levels.${w.level}`)}</strong> <small>{span(w)}</small>
            {w.text && <p>{w.text}</p>}
          </li>
        ))}
      </ul>
      <p className="hint">{t('sea.warnings.source')}</p>
    </article>
  );
}

/** The next days: waves, wind and the high waters, one row per day. */
function SeaDays({ days, portId }: { days: SeaDay[]; portId: string }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const rows = useMemo(
    () =>
      days.map((d) => {
        const noon = isoDateToNoonUtc(d.date);
        const highs = tideDay(portId, noon)?.extremes.filter((e) => e.kind === 'high') ?? [];
        const midday = d.hours.find((h) => h.time.endsWith('T12:00')) ?? d.hours[0];
        return { d, noon, highs, midday };
      }),
    [days, portId],
  );
  return (
    <article className="card" aria-labelledby="sea-days-heading">
      <h3 id="sea-days-heading">{t('sea.days.title')}</h3>
      <table className="sea-days">
        <thead>
          <tr>
            <th scope="col">
              <span className="visually-hidden">{t('sea.days.day')}</span>
            </th>
            <th scope="col">{t('sea.days.waves')}</th>
            <th scope="col">{t('sea.days.wind')}</th>
            <th scope="col">{t('sea.days.highs')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ d, noon, highs, midday }) => {
            const waves = d.ipma?.waveHeight ?? d.waveHeight;
            return (
              <tr key={d.date}>
                <th scope="row">{formatWeekday(noon, lang)}</th>
                <td>
                  <span className="with-arrow">
                    {waves ? formatRange(waves, lang) : '—'}
                    {midday?.waveDirection != null && (
                      <DirectionArrow
                        from={midday.waveDirection}
                        label={t(`weather.directions.${compassOf(midday.waveDirection)}`)}
                        size={14}
                      />
                    )}
                  </span>
                </td>
                <td>
                  <span className="with-arrow">
                    {d.wind ? Math.round(d.wind.max) : '—'}
                    {midday?.windDirection != null && (
                      <DirectionArrow
                        from={midday.windDirection}
                        label={t(`weather.directions.${compassOf(midday.windDirection)}`)}
                        size={14}
                      />
                    )}
                  </span>
                </td>
                <td className="sea-highs">
                  {highs.map((h) => (
                    <span key={h.time.toISOString()}>{formatTime(h.time, lang)}</span>
                  ))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="hint">{t('sea.days.units')}</p>
    </article>
  );
}
