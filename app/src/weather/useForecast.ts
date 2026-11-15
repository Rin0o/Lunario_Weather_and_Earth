import { useEffect, useState } from 'react';
import { dateInZone } from '../astro/time.ts';
import { parseForecast, requestForecastJson, type Forecast } from './ipma.ts';

export interface ForecastState {
  /** Days from today onwards, or null if nothing usable is available. */
  forecast: Forecast | null;
  /** When the shown forecast was downloaded. */
  fetchedAt: Date | null;
  /** True when the last download failed and a saved forecast (if any) is shown. */
  offline: boolean;
  loading: boolean;
}

interface State {
  locationId: number;
  forecast: Forecast | null;
  fetchedAt: Date | null;
  offline: boolean;
  /** Key of the last request that finished; loading is derived from it. */
  completed: string | null;
}

interface Cached {
  fetchedAt: string;
  json: unknown;
}

/** At most one network refresh per hour while the app stays open. */
const REFRESH_MS = 60 * 60_000;
const cacheKey = (locationId: number) => `lunario.forecast.${locationId}`;

function readCache(locationId: number): Pick<State, 'forecast' | 'fetchedAt'> {
  try {
    const raw = localStorage.getItem(cacheKey(locationId));
    if (raw) {
      const cached = JSON.parse(raw) as Cached;
      const fetchedAt = new Date(cached.fetchedAt);
      if (!Number.isNaN(fetchedAt.getTime())) {
        return { forecast: parseForecast(cached.json, locationId), fetchedAt };
      }
    }
  } catch {
    // Corrupt or unreadable cache: behave as if there were none.
  }
  return { forecast: null, fetchedAt: null };
}

function writeCache(locationId: number, json: unknown, fetchedAt: Date) {
  try {
    const cached: Cached = { fetchedAt: fetchedAt.toISOString(), json };
    localStorage.setItem(cacheKey(locationId), JSON.stringify(cached));
  } catch {
    // Storage full or unavailable: the forecast just won't survive going offline.
  }
}

const initialState = (locationId: number): State => ({
  locationId,
  ...readCache(locationId),
  offline: false,
  completed: null,
});

/** Drops days before today (Lisbon); null if none are left. */
function fromToday(forecast: Forecast | null, now: Date): Forecast | null {
  if (!forecast) return null;
  const today = dateInZone(now);
  const days = forecast.days.filter((d) => d.date >= today);
  return days.length ? { ...forecast, days } : null;
}

/**
 * The IPMA forecast for a location: shows the saved forecast at once, then refreshes it from
 * the network (on location change and at most hourly). If the network fails, the saved
 * forecast stays visible and is flagged as offline.
 */
export function useForecast(
  locationId: number,
  now: Date,
  fetchImpl: typeof fetch = fetch,
): ForecastState {
  const [state, setState] = useState(() => initialState(locationId));
  const refreshSlot = Math.floor(now.getTime() / REFRESH_MS);
  const requestKey = `${locationId}:${refreshSlot}`;

  useEffect(() => {
    let cancelled = false;
    const fetchedAt = new Date();
    requestForecastJson(locationId, fetchImpl)
      .then((json) => {
        const forecast = parseForecast(json, locationId);
        writeCache(locationId, json, fetchedAt);
        if (!cancelled) {
          setState({ locationId, forecast, fetchedAt, offline: false, completed: requestKey });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState((s) => ({
            ...(s.locationId === locationId ? s : initialState(locationId)),
            offline: true,
            completed: requestKey,
          }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [locationId, requestKey, fetchImpl]);

  // Until a request for a new location finishes, show that location's saved forecast (if any),
  // never the previous location's.
  const current = state.locationId === locationId ? state : initialState(locationId);
  const forecast = fromToday(current.forecast, now);
  return {
    forecast,
    fetchedAt: forecast ? current.fetchedAt : null,
    offline: current.offline,
    loading: current.completed !== requestKey,
  };
}
