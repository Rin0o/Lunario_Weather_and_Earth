import { useTranslation } from 'react-i18next';
import { dateInZone } from '../astro/time.ts';
import { catalog, zoneForDistrict } from '../catalog/catalog.ts';
import type { Catalog, Text } from '../catalog/types.ts';
import { isoDateToNoonUtc, type IsoDate } from '../calendar/dates.ts';
import { formatFullDate } from '../i18n/format.ts';
import { href } from '../navigation/route.ts';
import { PlantingForm } from './PlantingForm.tsx';
import { expectedHarvest, sortPlantings, stageOf, type Planting } from './plantings.ts';
import { BackupCard, BackupReminder } from './BackupCard.tsx';
import { useBackup } from './useBackup.ts';
import { useGarden } from './useGarden.ts';

interface GardenPageProps {
  now: Date;
  /** IPMA district name of the user's location, for the season check. */
  district: string;
  source?: Catalog;
  /** Asks before deleting; injected in tests. */
  confirm?: (message: string) => boolean;
}

/** RF-10: "A minha horta", the user's plantings, kept only on this device. */
export function GardenPage({
  now,
  district,
  source = catalog,
  confirm = (message) => window.confirm(message),
}: GardenPageProps) {
  const garden = useGarden();
  const backup = useBackup(garden, now);
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const pick = (text: Text) => (lang === 'en' ? text.en : text.pt);
  const today = dateInZone(now) as IsoDate;
  const zone = zoneForDistrict(district, source);
  const fullDate = (d: IsoDate) => formatFullDate(isoDateToNoonUtc(d), lang);

  const describe = (p: Planting) => {
    const crop = source.crops.find((c) => c.id === p.cropId);
    if (!crop) return null;
    const harvest = expectedHarvest(p, crop);
    return { crop, harvest, stage: stageOf(p, crop, today) };
  };

  return (
    <section aria-labelledby="garden-heading" className="garden">
      <h2 id="garden-heading">{t('garden.title')}</h2>
      <p className="hint">{t('garden.intro')}</p>
      <BackupReminder backup={backup} />

      <article className="card" aria-labelledby="add-heading">
        <h3 id="add-heading">{t('garden.add')}</h3>
        <PlantingForm today={today} zone={zone} onAdd={garden.add} source={source} />
      </article>

      {garden.failed && (
        <p role="alert" className="zone-note">
          {t('garden.storageError')}
        </p>
      )}

      {garden.loading ? (
        <p className="hint">{t('garden.loading')}</p>
      ) : garden.plantings.length === 0 ? (
        <p>{t('garden.empty')}</p>
      ) : (
        <ul className="plantings">
          {sortPlantings(garden.plantings).map((p) => {
            const info = describe(p);
            if (!info) return null;
            const { crop, harvest, stage } = info;
            return (
              <li key={p.id} className={`card planting stage-${stage}`}>
                <div className="planting-head">
                  <a href={href.crop(crop.id)}>
                    <strong>{pick(crop.name)}</strong>
                  </a>
                  <span className="stage">{t(`garden.stages.${stage}`)}</span>
                </div>
                <p>
                  {t(`garden.did.${p.action}`)} · {fullDate(p.date)}
                </p>
                {harvest ? (
                  <p className="hint">
                    {t('garden.harvest', {
                      from: fullDate(harvest.from),
                      to: fullDate(harvest.to),
                    })}
                    {p.action === 'TR' && ` ${t('garden.transplantHint')}`}
                  </p>
                ) : (
                  <p className="hint">{t('garden.harvestPerennial')}</p>
                )}
                {p.notes && <p className="planting-notes">{p.notes}</p>}
                <div className="planting-actions">
                  <button
                    type="button"
                    onClick={() =>
                      void garden.setStatus(p.id, p.status === 'active' ? 'harvested' : 'active')
                    }
                  >
                    {p.status === 'active' ? t('garden.markHarvested') : t('garden.markActive')}
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => {
                      const message = t('garden.confirmRemove', {
                        crop: pick(crop.name),
                        date: fullDate(p.date),
                      });
                      if (confirm(message)) void garden.remove(p.id);
                    }}
                  >
                    {t('garden.remove')}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <BackupCard backup={backup} />
    </section>
  );
}
