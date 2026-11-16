import { inWindow } from '../catalog/catalog.ts';
import type { CalendarWindow, Crop, Fortnight, ZoneId } from '../catalog/types.ts';
import { addDays, type IsoDate } from '../calendar/dates.ts';

/** What the user did: sowed in trays, sowed directly, transplanted or planted (RF-10). */
export const PLANTING_ACTIONS = ['SV', 'SD', 'TR', 'PL'] as const;
export type PlantingAction = (typeof PLANTING_ACTIONS)[number];

export type PlantingStatus = 'active' | 'harvested';

/** One entry of "A minha horta", stored only on the device (RNF-03). */
export interface Planting {
  id: string;
  cropId: string;
  action: PlantingAction;
  date: IsoDate;
  status: PlantingStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type NewPlanting = Pick<Planting, 'cropId' | 'action' | 'date' | 'notes'>;

/**
 * Expected harvest: the planting date plus the crop's cycle (D-19). Null for perennials, whose
 * harvest follows the season rather than a cycle.
 */
export function expectedHarvest(
  planting: Pick<Planting, 'date'>,
  crop: Pick<Crop, 'cycleDays'>,
): { from: IsoDate; to: IsoDate } | null {
  if (!crop.cycleDays) return null;
  return {
    from: addDays(planting.date, crop.cycleDays.min),
    to: addDays(planting.date, crop.cycleDays.max),
  };
}

export type Stage = 'growing' | 'ready' | 'late' | 'harvested' | 'perennial';

/** Where a planting stands on a given day. */
export function stageOf(
  planting: Pick<Planting, 'date' | 'status'>,
  crop: Pick<Crop, 'cycleDays'>,
  today: IsoDate,
): Stage {
  if (planting.status === 'harvested') return 'harvested';
  const harvest = expectedHarvest(planting, crop);
  if (!harvest) return 'perennial';
  if (today < harvest.from) return 'growing';
  if (today <= harvest.to) return 'ready';
  return 'late';
}

/** Active plantings first, newest first; harvested ones after them. */
export function sortPlantings(plantings: readonly Planting[]): Planting[] {
  return [...plantings].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
    return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
  });
}

/** Whether the crop's calendar in the zone recommends this action in this fortnight. */
export function inSeason(
  windows: readonly CalendarWindow[],
  cropId: string,
  zoneId: ZoneId,
  action: PlantingAction,
  fortnight: Fortnight,
): boolean {
  return windows.some(
    (w) =>
      w.cropId === cropId && w.zoneId === zoneId && w.action === action && inWindow(fortnight, w),
  );
}

/** The actions a crop's calendar uses (e.g. tomatoes are sown in trays and transplanted). */
export function actionsForCrop(
  windows: readonly CalendarWindow[],
  cropId: string,
): PlantingAction[] {
  return PLANTING_ACTIONS.filter((a) => windows.some((w) => w.cropId === cropId && w.action === a));
}
