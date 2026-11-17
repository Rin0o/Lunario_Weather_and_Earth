import {
  CalendarPlus,
  Check,
  Shovel,
  Sprout,
  Trash2,
  Undo2,
  Wheat,
  type LucideIcon,
} from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { Crop, Text } from '../catalog/types.ts';
import { CropThumb } from '../crops/CropThumb.tsx';
import { isoDateToNoonUtc, type IsoDate } from '../calendar/dates.ts';
import { formatDayMonth, formatFullDate } from '../i18n/format.ts';
import { href } from '../navigation/route.ts';
import { CalendarPanel } from './CalendarPanel.tsx';
import {
  expectedHarvest,
  sproutPlacement,
  stageOf,
  type Planting,
  type PlantingAction,
} from './plantings.ts';
import { expectedTransplant } from './reminders.ts';

const ACTION_ICONS: Record<PlantingAction, LucideIcon> = {
  SV: Sprout,
  SD: Sprout,
  TR: Shovel,
  PL: Shovel,
};

interface PlantingCardProps {
  planting: Planting;
  crop: Crop;
  today: IsoDate;
  onToggleStatus: () => void;
  onRemove: () => void;
}

/** One entry of "A minha horta" (RF-10): short dates and icon buttons, the details on demand. */
export function PlantingCard({
  planting,
  crop,
  today,
  onToggleStatus,
  onRemove,
}: PlantingCardProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const pick = (text: Text) => (lang === 'en' ? text.en : text.pt);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const day = (d: IsoDate) => formatDayMonth(isoDateToNoonUtc(d), lang);
  const full = (d: IsoDate) => formatFullDate(isoDateToNoonUtc(d), lang);
  const range = (r: { from: IsoDate; to: IsoDate }) => `${day(r.from)} – ${day(r.to)}`;

  const stage = stageOf(planting, crop, today);
  const harvest = expectedHarvest(planting, crop);
  const transplant = planting.status === 'active' ? expectedTransplant(planting, crop) : null;
  const active = planting.status === 'active';
  const ActionIcon = ACTION_ICONS[planting.action];
  const sprout = sproutPlacement(planting.id);

  return (
    <li
      className={`card planting stage-${stage}`}
      style={{ '--sprout-left': sprout.left, '--sprout-flip': sprout.flip } as CSSProperties}
    >
      <div className="planting-head">
        <a href={href.crop(crop.id)}>
          <CropThumb cropId={crop.id} />
          <strong>{pick(crop.name)}</strong>
        </a>
        <span className="stage">{t(`garden.stages.${stage}`)}</span>
      </div>

      <ul className="planting-dates">
        <li title={`${t(`garden.did.${planting.action}`)} · ${full(planting.date)}`}>
          <ActionIcon aria-hidden="true" size={16} />
          <span className="visually-hidden">{t(`garden.did.${planting.action}`)}</span>
          {day(planting.date)}
        </li>
        {transplant && (
          <li
            title={t('garden.transplant', { from: full(transplant.from), to: full(transplant.to) })}
          >
            <Shovel aria-hidden="true" size={16} />
            <span className="visually-hidden">{t('garden.transplantShort')}</span>
            {range(transplant)}
          </li>
        )}
        {harvest ? (
          <li
            title={
              t('garden.harvest', { from: full(harvest.from), to: full(harvest.to) }) +
              (planting.action === 'TR' ? ` ${t('garden.transplantHint')}` : '')
            }
          >
            <Wheat aria-hidden="true" size={16} />
            <span className="visually-hidden">{t('garden.harvestShort')}</span>
            {range(harvest)}
          </li>
        ) : (
          <li>
            <Wheat aria-hidden="true" size={16} />
            {t('garden.harvestPerennialShort')}
          </li>
        )}
      </ul>

      {planting.notes && <p className="planting-notes">{planting.notes}</p>}

      <div className="planting-tools">
        {active && !crop.perennial && (
          <button
            type="button"
            className="icon-button"
            aria-label={t('calendar.add')}
            title={t('calendar.add')}
            aria-expanded={calendarOpen}
            onClick={() => setCalendarOpen((open) => !open)}
          >
            <CalendarPlus aria-hidden="true" size={20} />
          </button>
        )}
        <button
          type="button"
          className="icon-button"
          aria-label={active ? t('garden.markHarvested') : t('garden.markActive')}
          title={active ? t('garden.markHarvested') : t('garden.markActive')}
          onClick={onToggleStatus}
        >
          {active ? <Check aria-hidden="true" size={20} /> : <Undo2 aria-hidden="true" size={20} />}
        </button>
        <button
          type="button"
          className="icon-button danger"
          aria-label={t('garden.remove')}
          title={t('garden.remove')}
          onClick={onRemove}
        >
          <Trash2 aria-hidden="true" size={20} />
        </button>
      </div>

      {calendarOpen && active && <CalendarPanel planting={planting} crop={crop} today={today} />}
    </li>
  );
}
