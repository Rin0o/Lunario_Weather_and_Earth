import { useCallback, useState } from 'react';
import type { Location } from '../astro/location.ts';
import { distanceKm, findPort, nearestPort, type Port } from './ports.ts';

/**
 * The port for the sea (D-35): the one nearest the user's location, unless one was chosen in
 * Settings. Only the choice is saved on the device; "automatic" is the absence of one.
 */
export interface SeaPort {
  port: Port;
  /** True when the port follows the user's location. */
  automatic: boolean;
  /** From the user's location to the port, in km. */
  distanceKm: number;
}

const STORAGE_KEY = 'lunario.port';

export function loadPortChoice(): string | null {
  try {
    const id = localStorage.getItem(STORAGE_KEY);
    return id && findPort(id) ? id : null;
  } catch {
    return null;
  }
}

export function savePortChoice(id: string | null): void {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode): the choice lasts for this session only.
  }
}

export function seaPortFor(
  location: Pick<Location, 'latitude' | 'longitude'>,
  choice: string | null,
): SeaPort {
  const chosen = choice ? findPort(choice) : undefined;
  const port = chosen ?? nearestPort(location);
  return { port, automatic: !chosen, distanceKm: distanceKm(location, port) };
}

/** The sea port for a location, and a setter for the choice (null = automatic). */
export function useSeaPort(
  location: Pick<Location, 'latitude' | 'longitude'>,
): [SeaPort, (id: string | null) => void] {
  const [choice, setChoice] = useState(loadPortChoice);
  const update = useCallback((id: string | null) => {
    savePortChoice(id);
    setChoice(id);
  }, []);
  return [seaPortFor(location, choice), update];
}
