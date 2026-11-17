import { useTranslation } from 'react-i18next';
import { plateFor } from '../assets/plates.ts';
import { dateInZone } from '../astro/time.ts';
import { catalog, fortnightOf, zoneForDistrict } from '../catalog/catalog.ts';
import type { Catalog, Text } from '../catalog/types.ts';
import { BackButton } from '../navigation/BackButton.tsx';
import { href } from '../navigation/route.ts';
import { traditionForCrop } from '../astro/lunarTradition.ts';
import { useMoonMode } from '../today/useMoonMode.ts';
import { CropCalendar } from './CropCalendar.tsx';

interface CropSheetProps {
  cropId: string;
  now: Date;
  /** IPMA district name of the user's location, for the zone's calendar. */
  district: string;
  source?: Catalog;
}

/** RF-06: everything about one crop, with its calendar for the user's zone. */
export function CropSheet({ cropId, now, district, source = catalog }: CropSheetProps) {
  const { t, i18n } = useTranslation();
  const pick = (text: Text) => (i18n.resolvedLanguage === 'en' ? text.en : text.pt);
  const [moonMode] = useMoonMode();
  const crop = source.crops.find((c) => c.id === cropId);
  const zone = zoneForDistrict(district, source);

  if (!crop) {
    return (
      <section className="crop-sheet">
        <p>{t('crops.notFound')}</p>
        <a href={href.crops}>{t('crops.all')}</a>
      </section>
    );
  }

  const windows = zone
    ? source.windows.filter((w) => w.cropId === crop.id && w.zoneId === zone.id)
    : [];
  const zoneNote = windows.find((w) => w.note)?.note;
  const plate = plateFor(crop.id);

  return (
    <section className="crop-sheet" aria-labelledby="crop-heading">
      <BackButton fallback={{ name: 'crops' }} source={source} />
      <h2 id="crop-heading">{pick(crop.name)}</h2>
      <p className="scientific-name">{crop.scientificName}</p>
      {plate && (
        <figure className="crop-plate">
          <img
            src={plate.sheet}
            alt={t('crops.plateAlt', { crop: pick(crop.name) })}
            loading="lazy"
            decoding="async"
          />
        </figure>
      )}

      <article className="card">
        <dl className="facts">
          <dt>{t('crops.family')}</dt>
          <dd>{crop.family}</dd>
          <dt>{t('crops.ediblePart')}</dt>
          <dd>{t(`crops.parts.${crop.ediblePart}`)}</dd>
          <dt>{t('crops.climateClass')}</dt>
          <dd>{t(`crops.classes.${crop.climateClass}`)}</dd>
          <dt>{t('crops.cycle')}</dt>
          <dd>
            {crop.cycleDays
              ? t('crops.cycleDays', { min: crop.cycleDays.min, max: crop.cycleDays.max })
              : t('crops.perennial')}
          </dd>
          <dt>{t('crops.spacing')}</dt>
          <dd>{t('crops.spacingValue', { value: crop.spacingCm })}</dd>
        </dl>
        <p className="crop-notes">{pick(crop.notes)}</p>
      </article>

      {zone && (
        <article className="card" aria-labelledby="calendar-heading">
          <h3 id="calendar-heading">{t('crops.calendar', { zone: pick(zone.name) })}</h3>
          {zoneNote && <p className="zone-note">{pick(zoneNote)}</p>}
          <CropCalendar
            windows={windows}
            currentFortnight={fortnightOf(now)}
            year={Number(dateInZone(now).slice(0, 4))}
          />
        </article>
      )}

      {moonMode && (
        <article className="card tradition" aria-labelledby="crop-tradition-heading">
          <h3 id="crop-tradition-heading">{t('moonMode.title')}</h3>
          <ul>
            {traditionForCrop(source.lunarRules, crop.ediblePart).map((rule) => (
              <li key={pick(rule.advice)}>
                {pick(rule.advice)}: <strong>{pick(rule.phase).toLowerCase()}</strong>
              </li>
            ))}
          </ul>
          <p className="hint">{t('moonMode.disclaimer')}</p>
        </article>
      )}
    </section>
  );
}
