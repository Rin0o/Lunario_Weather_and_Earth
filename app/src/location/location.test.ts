import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { distanceKm, findLocation, MAINLAND_LOCATIONS, nearestLocation } from './locations.ts';
import {
  DEFAULT_USER_LOCATION,
  fromIpma,
  loadUserLocation,
  saveUserLocation,
  useUserLocation,
} from './userLocation.ts';

describe('locations', () => {
  it('covers all 18 mainland districts with unique IPMA ids', () => {
    expect(new Set(MAINLAND_LOCATIONS.map((l) => l.district)).size).toBe(18);
    expect(new Set(MAINLAND_LOCATIONS.map((l) => l.id)).size).toBe(MAINLAND_LOCATIONS.length);
  });

  it('measures distances', () => {
    const lisboa = findLocation(1110600);
    const porto = findLocation(1131200);
    if (!lisboa || !porto) throw new Error('missing fixtures');
    // Straight line between the two IPMA points (Lisboa's is north of the centre).
    expect(distanceKm(lisboa, porto)).toBeGreaterThan(265);
    expect(distanceKm(lisboa, porto)).toBeLessThan(275);
    expect(distanceKm(lisboa, lisboa)).toBe(0);
  });

  it.each([
    [40.54, -7.27, 'Guarda'], // Guarda city
    [40.21, -8.43, 'Coimbra'],
    [41.45, -8.3, 'Guimarães'], // nearer Guimarães than Braga
    [37.1, -8.67, 'Portimão'], // Lagos area
    [38.72, -9.14, 'Lisboa'],
  ])('maps %f, %f to %s', (latitude, longitude, name) => {
    expect(nearestLocation({ latitude, longitude }).location.name).toBe(name);
  });

  it('reports a large distance for points outside mainland Portugal', () => {
    expect(nearestLocation({ latitude: 48.85, longitude: 2.35 }).distanceKm).toBeGreaterThan(900);
  });
});

describe('user location storage', () => {
  const guarda = findLocation(1090700);
  if (!guarda) throw new Error('missing fixture');

  it('defaults to Coimbra', () => {
    expect(loadUserLocation()).toEqual(DEFAULT_USER_LOCATION);
    expect(DEFAULT_USER_LOCATION).toMatchObject({ name: 'Coimbra', ipmaId: 1060300, district: 6 });
  });

  it('round-trips a GPS location, keeping the exact coordinates', () => {
    saveUserLocation({ ...fromIpma(guarda, 'gps'), latitude: 40.6, longitude: -7.3 });
    expect(loadUserLocation()).toEqual({
      name: 'Guarda',
      ipmaId: 1090700,
      district: 9,
      latitude: 40.6,
      longitude: -7.3,
      source: 'gps',
    });
  });

  it('does not store the default', () => {
    saveUserLocation(DEFAULT_USER_LOCATION);
    expect(localStorage.getItem('lunario.location')).toBeNull();
  });

  it.each([
    'not json',
    JSON.stringify({ ipmaId: 999, latitude: 1, longitude: 1, source: 'gps' }),
    JSON.stringify({ ipmaId: 1090700, latitude: 'x', longitude: 1, source: 'gps' }),
    JSON.stringify({ ipmaId: 1090700, latitude: 1, longitude: 1, source: 'other' }),
  ])('falls back to the default for invalid stored data: %s', (raw) => {
    localStorage.setItem('lunario.location', raw);
    expect(loadUserLocation()).toEqual(DEFAULT_USER_LOCATION);
  });

  it('useUserLocation updates and persists', () => {
    const { result } = renderHook(() => useUserLocation());
    act(() => result.current[1](fromIpma(guarda, 'manual')));
    expect(result.current[0].name).toBe('Guarda');
    expect(loadUserLocation().name).toBe('Guarda');
  });
});
