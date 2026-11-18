import { MoonPhase } from 'astronomy-engine';
import { localDayBounds } from '../astro/time.ts';
import tideData from './tideConstants.json';
import {
  CONSTITUENTS,
  seaLevel,
  tideExtremes,
  type HarmonicConstants,
  type TideExtreme,
} from './tides.ts';

/**
 * A port's tides for a local day (D-34). Heights are given above the chart datum, taken as
 * the lowest astronomical tide of the port (`datum`, metres below the mean level), as tide
 * tables do; so they never go below zero except in a storm.
 */
interface PortTideData {
  method: 'gauge' | 'model';
  datum: number;
  constituents: [number, number][];
}

const ports = tideData.ports as unknown as Record<string, PortTideData>;

if (tideData.constituents.join() !== CONSTITUENTS.map((k) => k.name).join()) {
  throw new Error('tideConstants.json was fitted with other constituents: run `npm run tides`.');
}

function constantsOf(
  portId: string,
): (HarmonicConstants & { method: PortTideData['method'] }) | null {
  const port = ports[portId];
  if (!port) return null;
  return { z0: port.datum, constituents: port.constituents, method: port.method };
}

/** Marés vivas (spring), mortas (neap), or in between. */
export type TideStrength = 'spring' | 'neap' | 'mean';

export interface TideDay {
  /** High and low waters of the day, in time order. */
  extremes: TideExtreme[];
  /** The level every 20 minutes from local midnight to midnight, for the curve. */
  curve: { time: Date; height: number }[];
  /** The day's largest rise or fall between a high and a low water (m). */
  range: number;
  strength: TideStrength;
  /** Whether the constants come from a tide gauge at the port or the corrected model. */
  method: PortTideData['method'];
}

const STEP = 20 * 60_000;

/** The tides of the local day containing `moment`. */
export function tideDay(portId: string, moment: Date): TideDay | null {
  const constants = constantsOf(portId);
  if (!constants) return null;
  const { start, end } = localDayBounds(moment);
  // Look a little beyond the day so the ranges at either end have both their waters.
  const around = tideExtremes(
    constants,
    new Date(start.getTime() - 7 * 3_600_000),
    new Date(end.getTime() + 7 * 3_600_000),
  );
  const extremes = around.filter((e) => e.time >= start && e.time < end);

  const curve: TideDay['curve'] = [];
  for (let t = start.getTime(); t <= end.getTime(); t += STEP) {
    const time = new Date(t);
    curve.push({ time, height: seaLevel(constants, time) });
  }

  let range = 0;
  for (let i = 1; i < around.length; i++) {
    const a = around[i - 1] as TideExtreme;
    const b = around[i] as TideExtreme;
    const touches = b.time >= start && a.time < end;
    if (touches) range = Math.max(range, Math.abs(b.height - a.height));
  }
  const noon = new Date((start.getTime() + end.getTime()) / 2);
  return { extremes, curve, range, strength: tideStrength(noon), method: constants.method };
}

/** The age of the tide: spring tides come about a day and a half after new and full moon. */
const TIDE_AGE_MS = 36 * 3_600_000;
/** Half the width of the spring and neap bands, in degrees of Moon–Sun angle (~2.4 days). */
const BAND = 30;

/**
 * Marés vivas or mortas as almanacs give them, by the Moon: spring tides around new and full
 * moon, neap tides around the quarters, each a day and a half late. How big they really are
 * also depends on the Moon's distance and declination, which `range` shows.
 */
export function tideStrength(moment: Date): TideStrength {
  const angle = MoonPhase(new Date(moment.getTime() - TIDE_AGE_MS)) % 180;
  if (Math.min(angle, 180 - angle) < BAND) return 'spring';
  if (Math.abs(angle - 90) < BAND) return 'neap';
  return 'mean';
}

/** The sea level now, above the chart datum, and whether it is rising. */
export function tideNow(portId: string, now: Date): { height: number; rising: boolean } | null {
  const constants = constantsOf(portId);
  if (!constants) return null;
  const height = seaLevel(constants, now);
  return { height, rising: seaLevel(constants, new Date(now.getTime() + 10 * 60_000)) > height };
}
