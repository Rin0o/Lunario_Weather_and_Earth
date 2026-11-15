import { Body, Observer, SearchRiseSet } from 'astronomy-engine';
import type { Location } from './location.ts';
import { localDayBounds, TIME_ZONE } from './time.ts';

export interface SunDay {
  sunrise: Date | null;
  sunset: Date | null;
  /** Minutes between sunrise and sunset, or null if either is missing. */
  dayLengthMinutes: number | null;
}

/** Sunrise and sunset on the local day containing `moment`. */
export function sunDay(moment: Date, location: Location, timeZone = TIME_ZONE): SunDay {
  const { start, end } = localDayBounds(moment, timeZone);
  const observer = new Observer(location.latitude, location.longitude, 0);
  const find = (direction: 1 | -1) => {
    const t = SearchRiseSet(Body.Sun, observer, direction, start, 1);
    return t && t.date < end ? t.date : null;
  };
  const sunrise = find(+1);
  const sunset = find(-1);
  return {
    sunrise,
    sunset,
    dayLengthMinutes:
      sunrise && sunset ? Math.round((sunset.getTime() - sunrise.getTime()) / 60_000) : null,
  };
}
