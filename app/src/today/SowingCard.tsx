import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { dateInZone } from '../astro/time.ts';
import {
  activitiesFor,
  catalog,
  fortnightDates,
  fortnightOf,
  zoneForDistrict,
} from '../catalog/catalog.ts';
import { isoDateToNoonUtc } from '../calendar/dates.ts';
import type { Catalog, Text } from '../catalog/types.ts';
import { formatDateRange, intlLocale } from '../i18n/format.ts';
import { CropThumb } from '../crops/CropThumb.tsx';
import { href } from '../navigation/route.ts';
import { SubscribePanel } from './SubscribePanel.tsx';

interface SowingCardProps {
  now: Date;
  /** IPMA district name of the user's location. */
  district: string;
  /** Injected in tests. */
  source?: Catalog;
}

/** "Esta quinzena pode…": what to sow, transplant, plant and harvest in the user's zone (RF-01). */
export function SowingCard({ now, district, source = catalog }: SowingCardProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const pick = (text: Text) => (lang === 'en' ? text.en : text.pt);

  const zone = zoneForDistrict(district, source);
  const fortnight = fortnightOf(now);
  const groups = useMemo(
    () => (zone ? activitiesFor(zone.id, fortnight, undefined, source) : []),
    [zone, fortnight, source],
  );
  if (!zone) return null;

  const year = Number(dateInZone(now).slice(0, 4));
  const { first, last } = fortnightDates(fortnight, year);
  const collator = new Intl.Collator(intlLocale(lang));
  const notes = [
    ...new Set(groups.flatMap((g) => g.activities.flatMap((a) => (a.note ? [pick(a.note)] : [])))),
  ];

  return (
    <article className="card" aria-labelledby="sowing-heading">
      <h3 id="sowing-heading">{t('sowing.title')}</h3>
      <p className="hint">
        {t('sowing.period', {
          dates: formatDateRange(isoDateToNoonUtc(first), isoDateToNoonUtc(last), lang),
          zone: pick(zone.name),
        })}
      </p>

      {groups.length === 0 && <p>{t('sowing.none')}</p>}

      {groups.map(({ action, activities }) => (
        <section key={action} className="sowing-group" aria-labelledby={`sowing-${action}`}>
          <h4 id={`sowing-${action}`}>{t(`sowing.actions.${action}`)}</h4>
          <ul className="crop-list">
            {[...activities]
              .sort((a, b) => collator.compare(pick(a.crop.name), pick(b.crop.name)))
              .map(({ crop, note, endsNow }) => (
                <li key={crop.id}>
                  <a href={href.crop(crop.id)}>
                    <CropThumb cropId={crop.id} />
                    {pick(crop.name)}
                  </a>
                  {note && (
                    <sup className="crop-mark" aria-label={pick(note)}>
                      *
                    </sup>
                  )}
                  {endsNow && <span className="crop-ends">{t('sowing.endsNow')}</span>}
                </li>
              ))}
          </ul>
        </section>
      ))}

      {notes.map((note) => (
        <p key={note} className="hint">
          * {note}
        </p>
      ))}

      <SubscribePanel zone={zone} />
    </article>
  );
}
