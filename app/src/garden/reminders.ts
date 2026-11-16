import type { Crop } from '../catalog/types.ts';
import { addDays, type IsoDate } from '../calendar/dates.ts';
import { buildIcs, type Alarm, type IcsEvent } from '../calendar/ics.ts';
import type { Planting } from './plantings.ts';

/** Calendar reminders for a planting (RF-13, D-20): transplant and start of harvest. */
export type ReminderKind = 'transplant' | 'harvest';

export interface PlantingEvent {
  kind: ReminderKind;
  /** The event day: the earliest expected date. */
  date: IsoDate;
  /** The latest expected date, mentioned in the description. */
  until: IsoDate;
}

export const DEFAULT_ALARM: Alarm = { daysBefore: 5, time: '13:00' };

/** Expected transplant of a nursery sowing: sowing date + days in the nursery (D-20). */
export function expectedTransplant(
  planting: Pick<Planting, 'action' | 'date'>,
  crop: Pick<Crop, 'transplantDays'>,
): { from: IsoDate; to: IsoDate } | null {
  if (planting.action !== 'SV' || !crop.transplantDays) return null;
  return {
    from: addDays(planting.date, crop.transplantDays.min),
    to: addDays(planting.date, crop.transplantDays.max),
  };
}

/** The reminders a planting can have, from today on (past dates are of no use in a calendar). */
export function plantingEvents(
  planting: Pick<Planting, 'action' | 'date'>,
  crop: Pick<Crop, 'transplantDays' | 'cycleDays'>,
  today: IsoDate,
): PlantingEvent[] {
  const events: PlantingEvent[] = [];
  const transplant = expectedTransplant(planting, crop);
  if (transplant) events.push({ kind: 'transplant', date: transplant.from, until: transplant.to });
  if (crop.cycleDays) {
    events.push({
      kind: 'harvest',
      date: addDays(planting.date, crop.cycleDays.min),
      until: addDays(planting.date, crop.cycleDays.max),
    });
  }
  return events.filter((e) => e.date >= today);
}

/** Validates a reminder setting, falling back to the default for anything odd. */
export function normaliseAlarm(daysBefore: unknown, time: unknown): Alarm {
  const days = daysBefore === null || daysBefore === '' ? NaN : Number(daysBefore);
  const validDays = Number.isInteger(days) && days >= 0 && days <= 30;
  const validTime = typeof time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
  return {
    daysBefore: validDays ? days : DEFAULT_ALARM.daysBefore,
    time: validTime ? (time as Alarm['time']) : DEFAULT_ALARM.time,
  };
}

/** One `.ics` file with the planting's reminders. UIDs are stable, so re-adding replaces. */
export function plantingIcs(
  planting: Pick<Planting, 'id'>,
  events: readonly PlantingEvent[],
  alarm: Alarm,
  text: (event: PlantingEvent) => { title: string; description: string },
  now = new Date(),
): string {
  const icsEvents: IcsEvent[] = events.map((event) => ({
    uid: `${planting.id}-${event.kind}@lunario`,
    date: event.date,
    alarm,
    ...text(event),
  }));
  return buildIcs({ events: icsEvents, now });
}
