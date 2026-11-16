import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { catalog, fortnightOf } from '../catalog/catalog.ts';
import type { Catalog, Text, Zone } from '../catalog/types.ts';
import { isoDateToNoonUtc, type IsoDate } from '../calendar/dates.ts';
import { intlLocale } from '../i18n/format.ts';
import { actionsForCrop, inSeason, type NewPlanting, type PlantingAction } from './plantings.ts';

interface PlantingFormProps {
  today: IsoDate;
  zone: Zone | undefined;
  onAdd: (planting: NewPlanting) => Promise<void>;
  source?: Catalog;
}

/** Logs a sowing, transplant or planting (RF-10). Out-of-season entries are allowed but flagged. */
export function PlantingForm({ today, zone, onAdd, source = catalog }: PlantingFormProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const pick = (text: Text) => (lang === 'en' ? text.en : text.pt);
  const collator = new Intl.Collator(intlLocale(lang));
  const crops = [...source.crops].sort((a, b) => collator.compare(pick(a.name), pick(b.name)));

  const [cropId, setCropId] = useState('');
  const [action, setAction] = useState<PlantingAction | ''>('');
  const [date, setDate] = useState<string>(today);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  const actions = cropId ? actionsForCrop(source.windows, cropId) : [];
  const chosenAction = action && actions.includes(action) ? action : (actions[0] ?? '');
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const outOfSeason =
    zone &&
    cropId &&
    chosenAction &&
    validDate &&
    !inSeason(
      source.windows,
      cropId,
      zone.id,
      chosenAction,
      fortnightOf(isoDateToNoonUtc(date as IsoDate)),
    );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!cropId || !chosenAction || !validDate) return;
    await onAdd({ cropId, action: chosenAction, date: date as IsoDate, notes });
    setCropId('');
    setAction('');
    setNotes('');
    setSaved(true);
  };

  return (
    <form className="planting-form" onSubmit={(e) => void submit(e)}>
      <label>
        {t('garden.crop')}
        <select
          required
          value={cropId}
          onChange={(e) => {
            setCropId(e.target.value);
            setSaved(false);
          }}
        >
          <option value="" disabled>
            {t('garden.chooseCrop')}
          </option>
          {crops.map((c) => (
            <option key={c.id} value={c.id}>
              {pick(c.name)}
            </option>
          ))}
        </select>
      </label>

      <label>
        {t('garden.action')}
        <select
          required
          disabled={!cropId}
          value={chosenAction}
          onChange={(e) => setAction(e.target.value as PlantingAction)}
        >
          {actions.map((a) => (
            <option key={a} value={a}>
              {t(`sowing.actions.${a}`)}
            </option>
          ))}
        </select>
      </label>

      <label>
        {t('garden.date')}
        <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
      </label>

      <label>
        {t('garden.notes')}
        <input
          type="text"
          value={notes}
          maxLength={200}
          placeholder={t('garden.notesPlaceholder')}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      {outOfSeason && zone && (
        <p className="hint" role="note">
          {t('garden.outOfSeason', {
            action: t(`sowing.actions.${chosenAction}`).toLowerCase(),
            zone: pick(zone.name),
          })}
        </p>
      )}

      <button type="submit" disabled={!cropId || !chosenAction || !validDate}>
        {t('garden.save')}
      </button>
      <p role="status" className="hint">
        {saved && t('garden.saved')}
      </p>
    </form>
  );
}
