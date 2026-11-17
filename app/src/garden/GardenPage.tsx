import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dateInZone } from '../astro/time.ts';
import { catalog, zoneForDistrict } from '../catalog/catalog.ts';
import type { Catalog, Text } from '../catalog/types.ts';
import { isoDateToNoonUtc, type IsoDate } from '../calendar/dates.ts';
import { formatFullDate } from '../i18n/format.ts';
import { BackupCard, BackupReminder } from './BackupCard.tsx';
import { PlantingCard } from './PlantingCard.tsx';
import { PlantingForm } from './PlantingForm.tsx';
import { sortPlantings, type NewPlanting } from './plantings.ts';
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
  // The form starts open only while the garden is empty; then it is the user's choice.
  const [formOpen, setFormOpen] = useState<boolean | null>(null);
  const showForm = formOpen ?? (!garden.loading && garden.plantings.length === 0);

  const add = async (input: NewPlanting) => {
    setFormOpen(true);
    await garden.add(input);
  };

  return (
    <section aria-labelledby="garden-heading" className="page garden">
      <h2 id="garden-heading">{t('garden.title')}</h2>
      <p className="hint">{t('garden.intro')}</p>
      <BackupReminder backup={backup} />

      <details
        className="add-planting"
        open={showForm}
        onToggle={(e) => setFormOpen(e.currentTarget.open)}
      >
        <summary>
          <Plus aria-hidden="true" size={20} />
          {t('garden.add')}
        </summary>
        <div className="card">
          <PlantingForm today={today} zone={zone} onAdd={add} source={source} />
        </div>
      </details>

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
        <ul className="plantings" aria-label={t('garden.listLabel')}>
          {sortPlantings(garden.plantings).map((p) => {
            const crop = source.crops.find((c) => c.id === p.cropId);
            if (!crop) return null;
            return (
              <PlantingCard
                key={p.id}
                planting={p}
                crop={crop}
                today={today}
                onToggleStatus={() =>
                  void garden.setStatus(p.id, p.status === 'active' ? 'harvested' : 'active')
                }
                onRemove={() => {
                  const message = t('garden.confirmRemove', {
                    crop: pick(crop.name),
                    date: formatFullDate(isoDateToNoonUtc(p.date), lang),
                  });
                  if (confirm(message)) void garden.remove(p.id);
                }}
              />
            );
          })}
        </ul>
      )}

      <BackupCard backup={backup} />
    </section>
  );
}
