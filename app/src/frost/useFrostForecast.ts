import { useEffect, useState } from 'react';
import { dateInZone } from '../astro/time.ts';
import { parseFrostForecast, requestFrostJson, roundCoordinate, type FrostDay } from './frost.ts';

export interface FrostForecastState {
  /** Days from today onwards; empty while loading or when nothing usable is available. */
  days: FrostDay[];
  /** True when the last download failed and a saved forecast (if any) is shown. */
  offline: boolean;
}

interface Cached {
  fetchedAt: string;
  json: unknown;
}

interface State {
  key: string;
  days: FrostDay[];
  offline: boolean;
}

/** At most one network refresh per hour while the app stays open, as for the weather. */
const REFRESH_MS = 60 * 60_000;
const placeKey = (latitude: number, longitude: number) =>
  `${roundCoordinate(latitude).toFixed(2)},${roundCoordinate(longitude).toFixed(2)}`;
const cacheKey = (place: string) => `lunario.frost.${place}`;

function readCache(place: string): FrostDay[] {
  try {
    const raw = localStorage.getItem(cacheKey(place));
    if (raw) return parseFrostForecast((JSON.parse(raw) as Cached).json);
  } catch {
    // Corrupt or unreadable cache: behave as if there were none.
  }
  return [];
}

function writeCache(place: string, json: unknown) {
  try {
    const cached: Cached = { fetchedAt: new Date().toISOString(), json };
    localStorage.setItem(cacheKey(place), JSON.stringify(cached));
  } catch {
    // Storage full or unavailable: the forecast just won't survive going offline.
  }
}

/**
 * Open-Meteo frost forecast for a place (RF-16): the saved forecast at once, then a refresh
 * from the network on place change and at most hourly. Offline, the saved one stays.
 */
export function useFrostForecast(
  latitude: number,
  longitude: number,
  now: Date,
  fetchImpl: typeof fetch = fetch,
): FrostForecastState {
  const place = placeKey(latitude, longitude);
  const [state, setState] = useState<State>(() => ({
    key: place,
    days: readCache(place),
    offline: false,
  }));
  const refreshSlot = Math.floor(now.getTime() / REFRESH_MS);

  useEffect(() => {
    let cancelled = false;
    requestFrostJson(latitude, longitude, fetchImpl)
      .then((json) => {
        writeCache(place, json);
        if (!cancelled) setState({ key: place, days: parseFrostForecast(json), offline: false });
      })
      .catch(() => {
        if (!cancelled) setState({ key: place, days: readCache(place), offline: true });
      });
    return () => {
      cancelled = true;
    };
    // The place key stands for the rounded coordinates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place, refreshSlot, fetchImpl]);

  // Until a request for a new place finishes, show that place's saved forecast, never the
  // previous place's.
  const current = state.key === place ? state : { days: readCache(place), offline: false };
  const today = dateInZone(now);
  return { days: current.days.filter((d) => d.date >= today), offline: current.offline };
}
