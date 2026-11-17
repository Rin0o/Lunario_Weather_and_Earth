import { IDBFactory } from 'fake-indexeddb';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CalendarWindow } from '../catalog/types.ts';
import {
  addPlanting,
  deletePlanting,
  listPlantings,
  requestPersistentStorage,
  updatePlanting,
} from './db.ts';
import {
  actionsForCrop,
  expectedHarvest,
  inSeason,
  sortPlantings,
  sproutPlacement,
  stageOf,
  type Planting,
} from './plantings.ts';
import { useGarden } from './useGarden.ts';

const lettuce = { cycleDays: { min: 60, max: 90 } };
const strawberry = { cycleDays: null };

const planting = (over: Partial<Planting> = {}): Planting => ({
  id: 'p1',
  cropId: 'alface',
  action: 'SV',
  date: '2026-11-03',
  status: 'active',
  notes: '',
  createdAt: '2026-11-03T10:00:00.000Z',
  updatedAt: '2026-11-03T10:00:00.000Z',
  ...over,
});

describe('plantings', () => {
  it('expects the harvest at the planting date plus the cycle (D-19)', () => {
    expect(expectedHarvest({ date: '2026-11-03' }, lettuce)).toEqual({
      from: '2027-01-02',
      to: '2027-02-01',
    });
    expect(expectedHarvest({ date: '2026-11-03' }, strawberry)).toBeNull();
  });

  it.each([
    ['2026-12-01', 'growing'],
    ['2027-01-02', 'ready'],
    ['2027-02-01', 'ready'],
    ['2027-02-02', 'late'],
  ] as const)('on %s an active lettuce is %s', (today, stage) => {
    expect(stageOf(planting(), lettuce, today)).toBe(stage);
  });

  it('knows harvested and perennial plantings', () => {
    expect(stageOf(planting({ status: 'harvested' }), lettuce, '2026-12-01')).toBe('harvested');
    expect(stageOf(planting(), strawberry, '2026-12-01')).toBe('perennial');
  });

  it('sorts active first, newest first', () => {
    const sorted = sortPlantings([
      planting({ id: 'old', date: '2026-03-01' }),
      planting({ id: 'done', date: '2026-11-10', status: 'harvested' }),
      planting({ id: 'new', date: '2026-11-05' }),
      planting({ id: 'new-later', date: '2026-11-05', createdAt: '2026-11-05T12:00:00.000Z' }),
    ]);
    expect(sorted.map((p) => p.id)).toEqual(['new-later', 'new', 'old', 'done']);
  });

  it('checks the season and the actions a crop uses', () => {
    const windows: CalendarWindow[] = [
      { cropId: 'tomate', zoneId: 'LC', action: 'SV', start: 3, end: 7, origin: 'base' },
      { cropId: 'tomate', zoneId: 'LC', action: 'TR', start: 7, end: 11, origin: 'base' },
      { cropId: 'fava', zoneId: 'LC', action: 'SD', start: 19, end: 1, origin: 'base' },
    ];
    expect(inSeason(windows, 'tomate', 'LC', 'SV', 4)).toBe(true);
    expect(inSeason(windows, 'tomate', 'LC', 'SV', 12)).toBe(false);
    expect(inSeason(windows, 'tomate', 'IN', 'SV', 4)).toBe(false);
    expect(inSeason(windows, 'fava', 'LC', 'SD', 24)).toBe(true);
    expect(actionsForCrop(windows, 'tomate')).toEqual(['SV', 'TR']);
    expect(actionsForCrop(windows, 'fava')).toEqual(['SD']);
  });
});

describe('device storage (IndexedDB)', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  it('adds, lists, updates and deletes plantings', async () => {
    const now = new Date('2026-11-16T10:00:00Z');
    const added = await addPlanting(
      { cropId: 'fava', action: 'SD', date: '2026-11-16', notes: '  canteiro 2 ' },
      now,
    );
    expect(added).toMatchObject({ cropId: 'fava', status: 'active', notes: 'canteiro 2' });
    expect(added.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(await listPlantings()).toEqual([added]);

    const later = new Date('2026-11-20T10:00:00Z');
    const updated = await updatePlanting(added.id, { status: 'harvested' }, later);
    expect(updated).toMatchObject({ status: 'harvested', updatedAt: later.toISOString() });
    expect((await listPlantings())[0]?.status).toBe('harvested');

    await deletePlanting(added.id);
    expect(await listPlantings()).toEqual([]);
    await expect(updatePlanting(added.id, { status: 'active' })).rejects.toThrow('No planting');
  });

  it('asks for persistent storage, and copes without the API', async () => {
    const persist = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('navigator', {
      storage: { persisted: vi.fn().mockResolvedValue(false), persist },
    });
    expect(await requestPersistentStorage()).toBe(true);
    expect(persist).toHaveBeenCalledOnce();

    vi.stubGlobal('navigator', {
      storage: { persisted: vi.fn().mockResolvedValue(true), persist },
    });
    expect(await requestPersistentStorage()).toBe(true);
    expect(persist).toHaveBeenCalledOnce();

    vi.stubGlobal('navigator', {});
    expect(await requestPersistentStorage()).toBe(false);

    vi.stubGlobal('navigator', {
      storage: { persist: vi.fn().mockRejectedValue(new Error('no')) },
    });
    expect(await requestPersistentStorage()).toBe(false);
  });
});

describe('useGarden', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  it('loads, adds (asking for persistence once), changes status and removes', async () => {
    const persist = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('navigator', {
      storage: { persisted: vi.fn().mockResolvedValue(false), persist },
    });
    const { result } = renderHook(() => useGarden());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.plantings).toEqual([]);

    await act(() =>
      result.current.add({ cropId: 'alho', action: 'PL', date: '2026-11-10', notes: '' }),
    );
    await act(() =>
      result.current.add({ cropId: 'fava', action: 'SD', date: '2026-11-12', notes: '' }),
    );
    expect(result.current.plantings).toHaveLength(2);
    expect(persist).toHaveBeenCalledOnce();

    const id = result.current.plantings.find((p) => p.cropId === 'alho')?.id ?? '';
    await act(() => result.current.setStatus(id, 'harvested'));
    expect(result.current.plantings.find((p) => p.id === id)?.status).toBe('harvested');

    await act(() => result.current.remove(id));
    expect(result.current.plantings.map((p) => p.cropId)).toEqual(['fava']);
    expect(result.current.failed).toBe(false);
  });

  it('reports a storage failure', async () => {
    const { result } = renderHook(() => useGarden());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(() => result.current.setStatus('missing', 'harvested'));
    expect(result.current.failed).toBe(true);
  });
});

describe('sproutPlacement', () => {
  it('gives each planting its own place and direction, always the same', () => {
    const ids = ['a1', 'b2', 'c3', 'd4', 'e5', 'f6', 'g7', 'h8'];
    const places = ids.map(sproutPlacement);
    expect(ids.map(sproutPlacement)).toEqual(places);
    for (const { left, flip } of places) {
      const percent = Number.parseInt(left, 10);
      expect(percent).toBeGreaterThanOrEqual(8);
      expect(percent).toBeLessThanOrEqual(62);
      expect([1, -1]).toContain(flip);
    }
    expect(new Set(places.map((p) => p.left)).size).toBeGreaterThan(4);
    expect(new Set(places.map((p) => p.flip)).size).toBe(2);
  });
});
