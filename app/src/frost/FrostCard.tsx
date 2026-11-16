import { useTranslation } from 'react-i18next';
import type { Location } from '../astro/location.ts';
import { dateInZone } from '../astro/time.ts';
import { catalog } from '../catalog/catalog.ts';
import type { Catalog } from '../catalog/types.ts';
import { daysBetween, isoDateToNoonUtc, type IsoDate } from '../calendar/dates.ts';
import { useGarden } from '../garden/useGarden.ts';
import { formatRelativeDays, formatShortDate, intlLocale } from '../i18n/format.ts';
import { sensitiveCropsInGarden, type FrostDay } from './frost.ts';
import { useFrostForecast } from './useFrostForecast.ts';

interface FrostCardProps {
  now: Date;
  location: Location;
  /** Injected in tests; default to the browser's fetch and the bundled catalogue. */
  fetchImpl?: typeof fetch;
  source?: Catalog;
}

/** RF-16: on opening the app, warn of frost in the coming days, naming the crops at risk. */
export function FrostCard({ now, location, fetchImpl = fetch, source = catalog }: FrostCardProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const { days, offline } = useFrostForecast(location.latitude, location.longitude, now, fetchImpl);
  const { plantings } = useGarden();

  const atRisk = days.filter((d) => d.risk !== 'none');
  if (atRisk.length === 0) return null;

  const today = dateInZone(now) as IsoDate;
  const degrees = (n: number) =>
    `${new Intl.NumberFormat(intlLocale(lang), { maximumFractionDigits: 0 }).format(Math.round(n) || 0)} °C`;
  const when = (d: FrostDay) => {
    const ahead = daysBetween(today, d.date);
    return ahead <= 1
      ? formatRelativeDays(ahead, lang)
      : formatShortDate(isoDateToNoonUtc(d.date), lang);
  };
  const crops = sensitiveCropsInGarden(
    plantings,
    source,
    (crop) => (lang === 'en' ? crop.name.en : crop.name.pt),
    intlLocale(lang),
  );

  return (
    <article className="card frost-card" aria-labelledby="frost-heading">
      <h3 id="frost-heading">
        <span aria-hidden="true">❄️ </span>
        {t('frost.title')}
      </h3>
      <ul className="frost-days">
        {atRisk.map((d) => (
          <li key={d.date}>
            <strong>{when(d)}</strong>:{' '}
            {d.risk === 'frost' && d.minSurface !== null
              ? t('frost.frost', { surface: degrees(d.minSurface), air: degrees(d.minAir) })
              : t('frost.possible', { air: degrees(d.minAir) })}
          </li>
        ))}
      </ul>
      {crops.length > 0 && (
        <p className="frost-crops">{t('frost.protect', { crops: crops.join(', ') })}</p>
      )}
      <p className="hint">{t('frost.caveat')}</p>
      <p className="hint">
        {offline && <>{t('weather.offline')} · </>}
        {t('frost.source', { place: location.name })}
      </p>
    </article>
  );
}
