import {
  Body,
  Illumination,
  MoonPhase,
  NextMoonQuarter,
  Observer,
  SearchMoonQuarter,
  SearchRiseSet,
} from 'astronomy-engine';
import type { Location } from './location.ts';
import { localDayBounds, TIME_ZONE } from './time.ts';

export const PRINCIPAL_PHASES = ['new', 'first-quarter', 'full', 'last-quarter'] as const;
export type PrincipalPhase = (typeof PRINCIPAL_PHASES)[number];

export type MoonPhaseName =
  PrincipalPhase | 'waxing-crescent' | 'waxing-gibbous' | 'waning-gibbous' | 'waning-crescent';

export interface QuarterEvent {
  phase: PrincipalPhase;
  time: Date;
}

export interface MoonDay {
  /** Phase name for the whole local day, as an almanac prints it. */
  phase: MoonPhaseName;
  /** Exact time of the principal phase, when one falls on this day. */
  phaseTime: Date | null;
  /** Illuminated fraction of the disc at local noon, 0–1. */
  illumination: number;
  /** Moon–Sun ecliptic longitude difference at local noon, 0–360° (0 = new, 180 = full). */
  angle: number;
  rise: Date | null;
  set: Date | null;
}

const toPhase = (quarter: number): PrincipalPhase => {
  const phase = PRINCIPAL_PHASES[quarter];
  if (!phase) throw new Error(`Unexpected moon quarter: ${quarter}`);
  return phase;
};

/** The next `count` principal phases (new, first quarter, full, last quarter) after `from`. */
export function nextMoonQuarters(from: Date, count: number): QuarterEvent[] {
  const events: QuarterEvent[] = [];
  let quarter = SearchMoonQuarter(from);
  for (let i = 0; i < count; i++) {
    events.push({ phase: toPhase(quarter.quarter), time: quarter.time.date });
    quarter = NextMoonQuarter(quarter);
  }
  return events;
}

function intermediatePhase(angle: number): MoonPhaseName {
  if (angle < 90) return 'waxing-crescent';
  if (angle < 180) return 'waxing-gibbous';
  if (angle < 270) return 'waning-gibbous';
  return 'waning-crescent';
}

/**
 * The Moon on the local day containing `moment`. A principal phase that happens at any time
 * during that day names the day; otherwise the intermediate phase at local noon does.
 */
export function moonDay(moment: Date, location: Location, timeZone = TIME_ZONE): MoonDay {
  const { start, end } = localDayBounds(moment, timeZone);
  const noon = new Date((start.getTime() + end.getTime()) / 2);
  const angle = MoonPhase(noon);

  const [quarter] = nextMoonQuarters(start, 1);
  const quarterToday = quarter && quarter.time < end ? quarter : null;

  const observer = new Observer(location.latitude, location.longitude, 0);
  const within = (t: { date: Date } | null) => (t && t.date < end ? t.date : null);

  return {
    phase: quarterToday?.phase ?? intermediatePhase(angle),
    phaseTime: quarterToday?.time ?? null,
    illumination: Illumination(Body.Moon, noon).phase_fraction,
    angle,
    // The Moon rises/sets about 50 min later each day, so some days have no rise or no set.
    rise: within(SearchRiseSet(Body.Moon, observer, +1, start, 1)),
    set: within(SearchRiseSet(Body.Moon, observer, -1, start, 1)),
  };
}
