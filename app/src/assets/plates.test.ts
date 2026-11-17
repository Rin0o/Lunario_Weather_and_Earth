import { describe, expect, it } from 'vitest';
import { catalog } from '../catalog/catalog.ts';
import { plateFor } from './plates.ts';

describe('botanical plates (RF-06)', () => {
  it('has a plate, small and large, for every crop in the catalogue', () => {
    const missing = catalog.crops.filter((crop) => !plateFor(crop.id)).map((crop) => crop.id);
    expect(missing).toEqual([]);
  });

  it('has no plate for an unknown crop', () => {
    expect(plateFor('mandrágora')).toBeNull();
  });
});
