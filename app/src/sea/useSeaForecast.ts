import { useEffect, useState } from 'react';
import { dateInZone } from '../astro/time.ts';
import type { Port } from '../coast/ports.ts';
import {
  parseSea,
  parseSeaWarnings,
  requestSeaJson,
  type SeaDay,
  type SeaJson,
  type SeaWarning,
} from './seaForecast.ts';

export interface SeaForecastState {
  /** Days from today onwards (empty if nothing usable is available). */
  days: SeaDay[];
  warnings: SeaWarning[];
  /** When the shown forecast was downloaded. */
  fetchedAt: Date | null;
  /** True when the last download failed and a saved forecast (if any) is shown. */
  offline: boolean;
  loading: boolean;
}

interface Cached {
  fetchedAt: string;
  json: SeaJson;
}

interface State {
  portId: string;
  cached: Cached | null;
  offline: boolean;
  completed: string | null;
}

/** At most one network refresh per hour while the app stays open, as for the weather (D-24). */
const REFRESH_MS = 60 * 60_000;
const cacheKey = (portId: string) => `lunario.sea.${portId}`;

function readCache(portId: string): Cached | null {
  try {
    const raw = localStorage.getItem(cacheKey(portId));
    if (!raw) return null;
    const cached = JSON.parse(raw) as Cached;
    return Number.isNaN(new Date(cached.fetchedAt).getTime()) ? null : cached;
  } catch {
    return null;
  }
}

function writeCache(portId: string, cached: Cached) {
  try {
    localStorage.setItem(cacheKey(portId), JSON.stringify(cached));
  } catch {
    // Storage full or unavailable: the forecast just won't survive going offline.
  }
}

const initialState = (portId: string): State => ({
  portId,
  cached: readCache(portId),
  offline: false,
  completed: null,
});

/** `2026-11-18T14:05`, local time in Portugal, to compare with IPMA's zone-less times. */
const localStamp = (now: Date) =>
  `${dateInZone(now)}T${new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Europe/Lisbon',
  }).format(now)}`;

/**
 * The sea forecast for a port: the saved one at once, then a refresh from the network (on
 * port change and at most hourly). If the network fails, the saved forecast stays, flagged.
 */
export function useSeaForecast(
  port: Port,
  now: Date,
  fetchImpl: typeof fetch = fetch,
): SeaForecastState {
  const [state, setState] = useState(() => initialState(port.id));
  const requestKey = `${port.id}:${Math.floor(now.getTime() / REFRESH_MS)}`;
  const { id, latitude, longitude } = port;

  useEffect(() => {
    let cancelled = false;
    const fetchedAt = new Date();
    requestSeaJson(latitude, longitude, fetchImpl)
      .then((json) => {
        const cached = { fetchedAt: fetchedAt.toISOString(), json };
        writeCache(id, cached);
        if (!cancelled) setState({ portId: id, cached, offline: false, completed: requestKey });
      })
      .catch(() => {
        if (!cancelled) {
          setState((s) => ({
            ...(s.portId === id ? s : initialState(id)),
            offline: true,
            completed: requestKey,
          }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, latitude, longitude, requestKey, fetchImpl]);

  const current = state.portId === port.id ? state : initialState(port.id);
  const today = dateInZone(now);
  const days = current.cached
    ? parseSea(current.cached.json, port.ipmaSeaId).filter((d) => d.date >= today)
    : [];
  const warnings = current.cached
    ? parseSeaWarnings(current.cached.json.warnings, port.warningArea, localStamp(now))
    : [];
  return {
    days,
    warnings,
    fetchedAt: days.length && current.cached ? new Date(current.cached.fetchedAt) : null,
    offline: current.offline,
    loading: current.completed !== requestKey,
  };
}
