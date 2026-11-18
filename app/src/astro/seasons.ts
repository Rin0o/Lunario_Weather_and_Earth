import { Seasons } from 'astronomy-engine';
import { dateInZone, startOfDayInZone } from './time.ts';

/**
 * Solstices and equinoxes (astronomy-engine), and the astronomical seasons they begin, as
 * almanacs give them. Northern hemisphere: mainland Portugal only.
 */
export type SeasonEvent =
  'march-equinox' | 'june-solstice' | 'september-equinox' | 'december-solstice';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/** The season each event begins. */
export const SEASON_OF: Record<SeasonEvent, Season> = {
  'march-equinox': 'spring',
  'june-solstice': 'summer',
  'september-equinox': 'autumn',
  'december-solstice': 'winter',
};

export interface SeasonMoment {
  event: SeasonEvent;
  time: Date;
}

/** The four events of a calendar year, in order. */
export function seasonEvents(year: number): SeasonMoment[] {
  const s = Seasons(year);
  return [
    { event: 'march-equinox', time: s.mar_equinox.date },
    { event: 'june-solstice', time: s.jun_solstice.date },
    { event: 'september-equinox', time: s.sep_equinox.date },
    { event: 'december-solstice', time: s.dec_solstice.date },
  ];
}

export interface SeasonsNow {
  /** The season we are in, and when it began. */
  season: Season;
  since: Date;
  /** The solstice or equinox that began the current season. */
  current: SeasonMoment;
  /** The next solstice or equinox. */
  next: SeasonMoment;
  /** Whole days from today to the day of the next event (local days; 0 = today). */
  daysUntil: number;
  /** How far through the current season we are, 0–1. */
  progress: number;
  /** The calendar year (Lisbon) and its four events. */
  calendarYear: number;
  year: SeasonMoment[];
  /**
   * The list to show: the year's four events, preceded by the current one when it belongs to
   * the year before (from 1 January to the March equinox, the December solstice).
   */
  list: SeasonMoment[];
}

const DAY_MS = 86_400_000;

/** Local calendar days between two moments (Lisbon), ignoring the time of day. */
export function localDaysBetween(from: Date, to: Date): number {
  const a = startOfDayInZone(dateInZone(from)).getTime();
  const b = startOfDayInZone(dateInZone(to)).getTime();
  return Math.round((b - a) / DAY_MS);
}

export function seasonsNow(now: Date): SeasonsNow {
  const year = Number(dateInZone(now).slice(0, 4));
  // The events around now: the last one of the year before to the first of the next.
  const around = [
    ...seasonEvents(year - 1).slice(-1),
    ...seasonEvents(year),
    ...seasonEvents(year + 1).slice(0, 1),
  ];
  const nextIndex = around.findIndex((e) => e.time > now);
  const next = around[nextIndex] as SeasonMoment;
  const last = around[nextIndex - 1] as SeasonMoment;
  const span = next.time.getTime() - last.time.getTime();
  const events = seasonEvents(year);
  const inYear = events.some((e) => e.time.getTime() === last.time.getTime());
  return {
    season: SEASON_OF[last.event],
    since: last.time,
    current: last,
    next,
    daysUntil: localDaysBetween(now, next.time),
    progress: (now.getTime() - last.time.getTime()) / span,
    calendarYear: year,
    year: events,
    list: inYear ? events : [last, ...events],
  };
}
