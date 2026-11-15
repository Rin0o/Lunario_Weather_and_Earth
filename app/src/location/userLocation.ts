import { useCallback, useState } from 'react';
import type { Location } from '../astro/location.ts';
import { COIMBRA, findLocation, type IpmaLocation } from './locations.ts';

/**
 * Where the user is. Sun and moon times use the exact coordinates (from GPS when available);
 * the forecast and the district use the nearest IPMA location.
 */
export interface UserLocation extends Location {
  ipmaId: number;
  district: number;
  source: 'default' | 'manual' | 'gps';
}

const STORAGE_KEY = 'lunario.location';

export function fromIpma(location: IpmaLocation, source: UserLocation['source']): UserLocation {
  return {
    name: location.name,
    latitude: location.latitude,
    longitude: location.longitude,
    ipmaId: location.id,
    district: location.district,
    source,
  };
}

/** Coimbra, in the base zone (Litoral Centro), until the user chooses. */
export const DEFAULT_USER_LOCATION = fromIpma(COIMBRA, 'default');

interface Stored {
  ipmaId: number;
  latitude: number;
  longitude: number;
  source: 'manual' | 'gps';
}

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function loadUserLocation(): UserLocation {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_USER_LOCATION;
    const stored = JSON.parse(raw) as Partial<Stored>;
    const ipma = isFiniteNumber(stored.ipmaId) ? findLocation(stored.ipmaId) : undefined;
    if (
      !ipma ||
      !isFiniteNumber(stored.latitude) ||
      !isFiniteNumber(stored.longitude) ||
      (stored.source !== 'manual' && stored.source !== 'gps')
    ) {
      return DEFAULT_USER_LOCATION;
    }
    return {
      ...fromIpma(ipma, stored.source),
      latitude: stored.latitude,
      longitude: stored.longitude,
    };
  } catch {
    return DEFAULT_USER_LOCATION;
  }
}

/**
 * Saves the location on the device. With GPS this includes the exact coordinates, in clear
 * text. This is an accepted risk (D-23, CodeQL js/clear-text-storage-of-sensitive-data
 * dismissed): the data never leaves the device (RNF-03), the CSP blocks third-party scripts,
 * and encrypting it would not help because the key would live in the same origin.
 */
export function saveUserLocation(location: UserLocation): void {
  if (location.source === 'default') return;
  const stored: Stored = {
    ipmaId: location.ipmaId,
    latitude: location.latitude,
    longitude: location.longitude,
    source: location.source,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Storage unavailable (private mode): the choice lasts for this session only.
  }
}

/** The user's location, persisted on the device. */
export function useUserLocation(): [UserLocation, (next: UserLocation) => void] {
  const [location, setLocation] = useState(loadUserLocation);
  const update = useCallback((next: UserLocation) => {
    saveUserLocation(next);
    setLocation(next);
  }, []);
  return [location, update];
}
