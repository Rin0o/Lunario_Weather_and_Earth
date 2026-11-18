import { beforeEach, describe, expect, it } from 'vitest';
import { distanceKm, findPort, nearestPort, PORTS } from './ports.ts';
import { loadPortChoice, savePortChoice, seaPortFor } from './useSeaPort.ts';

describe('ports', () => {
  it('have unique ids, run north to south along the coast and stay in mainland Portugal', () => {
    expect(new Set(PORTS.map((p) => p.id)).size).toBe(PORTS.length);
    for (const p of PORTS) {
      expect(p.latitude).toBeGreaterThan(36.9);
      expect(p.latitude).toBeLessThan(42.2);
      expect(p.longitude).toBeGreaterThan(-9.6);
      expect(p.longitude).toBeLessThan(-7.3);
    }
  });

  it('picks the nearest port, however far inland', () => {
    expect(nearestPort({ latitude: 41.15, longitude: -8.61 }).id).toBe('leixoes'); // Porto
    expect(nearestPort({ latitude: 38.72, longitude: -9.14 }).id).toBe('cascais'); // Lisboa
    expect(nearestPort({ latitude: 40.2, longitude: -8.41 }).id).toBe('figueira'); // Coimbra
    expect(nearestPort({ latitude: 37.02, longitude: -7.93 }).id).toBe('faro'); // Faro
    const braganca = { latitude: 41.81, longitude: -6.76 };
    expect(nearestPort(braganca).id).toBe('povoa');
    expect(distanceKm(braganca, nearestPort(braganca))).toBeGreaterThan(150);
  });

  it('finds a port by id', () => {
    expect(findPort('sines')?.name).toBe('Sines');
    expect(findPort('nowhere')).toBeUndefined();
  });
});

describe('sea port choice', () => {
  beforeEach(() => localStorage.clear());
  const coimbra = { latitude: 40.2, longitude: -8.41 };

  it('follows the location until a port is chosen', () => {
    expect(seaPortFor(coimbra, null)).toMatchObject({ automatic: true, port: { id: 'figueira' } });
    expect(seaPortFor(coimbra, 'lagos')).toMatchObject({ automatic: false, port: { id: 'lagos' } });
  });

  it('saves the choice on the device and forgets it when set back to automatic', () => {
    savePortChoice('peniche');
    expect(loadPortChoice()).toBe('peniche');
    savePortChoice(null);
    expect(loadPortChoice()).toBeNull();
  });

  it('ignores a saved port that no longer exists', () => {
    localStorage.setItem('lunario.port', 'gone');
    expect(loadPortChoice()).toBeNull();
  });
});
