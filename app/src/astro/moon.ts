import {
  Body,
  Illumination,
  MoonPhase,
  NextLunarEclipse,
  NextMoonQuarter,
  Observer,
  SearchLunarEclipse,
  SearchMoonQuarter,
  SearchRiseSet,
} from 'astronomy-engine';
import type { Location } from './location.ts';
import { dateInZone, localDayBounds, TIME_ZONE } from './time.ts';

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

export type LunarEclipseKind = 'penumbral' | 'partial' | 'total';

export interface YearPhase extends QuarterEvent {
  /** Local calendar date (`YYYY-MM-DD`, Portugal time). */
  date: string;
  /** The second full moon in one calendar month, the popular "lua azul". */
  blueMoon: boolean;
  /** The kind of lunar eclipse at this full moon, if any (seen from somewhere on Earth). */
  eclipse: LunarEclipseKind | null;
}

/**
 * Every principal phase whose local date falls in `year`, in order, with the blue moons and
 * the lunar eclipses marked. All computed on the device.
 */
export function moonPhasesOfYear(year: number, timeZone = TIME_ZONE): YearPhase[] {
  const prefix = String(year);
  // Starting two days early covers a phase just after midnight on 1 January in Lisbon.
  const from = new Date(Date.UTC(year - 1, 11, 30));
  const events = nextMoonQuarters(from, 54)
    .map((q) => ({ ...q, date: dateInZone(q.time, timeZone) }))
    .filter((q) => q.date.startsWith(prefix));

  const eclipses: { time: Date; kind: LunarEclipseKind }[] = [];
  for (let e = SearchLunarEclipse(from); e.peak.date.getUTCFullYear() <= year;) {
    eclipses.push({ time: e.peak.date, kind: e.kind as LunarEclipseKind });
    e = NextLunarEclipse(e.peak);
  }

  const fullsByMonth = new Map<string, number>();
  return events.map((q) => {
    let blueMoon = false;
    let eclipse: LunarEclipseKind | null = null;
    if (q.phase === 'full') {
      const month = q.date.slice(0, 7);
      const seen = (fullsByMonth.get(month) ?? 0) + 1;
      fullsByMonth.set(month, seen);
      blueMoon = seen === 2;
      eclipse =
        eclipses.find((e) => Math.abs(e.time.getTime() - q.time.getTime()) < 86_400_000)?.kind ??
        null;
    }
    return { ...q, blueMoon, eclipse };
  });
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
