import { describe, expect, it } from 'vitest';
import { catalog } from '../catalog/catalog.ts';
import { plateFor, plateTilt } from './plates.ts';

describe('botanical plates (RF-06)', () => {
  it('has a plate, small and large, for every crop in the catalogue', () => {
    const missing = catalog.crops.filter((crop) => !plateFor(crop.id)).map((crop) => crop.id);
    expect(missing).toEqual([]);
  });

  it('has no plate for an unknown crop', () => {
    expect(plateFor('mandrágora')).toBeNull();
  });

  it('tilts each plate a little, either way, always the same for the same crop', () => {
    const tilts = catalog.crops.map((crop) => plateTilt(crop.id));
    expect(catalog.crops.map((crop) => plateTilt(crop.id))).toEqual(tilts);
    for (const tilt of tilts) {
      expect(Math.abs(tilt)).toBeGreaterThanOrEqual(1.5);
      expect(Math.abs(tilt)).toBeLessThanOrEqual(4.5);
    }
    expect(tilts.some((tilt) => tilt > 0)).toBe(true);
    expect(tilts.some((tilt) => tilt < 0)).toBe(true);
  });
});
