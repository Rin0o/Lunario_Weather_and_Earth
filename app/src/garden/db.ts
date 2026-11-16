import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { NewPlanting, Planting } from './plantings.ts';

/**
 * The device-only database (RNF-03). Version 1 holds the garden; preferences move here later
 * (D-23). Bump DB_VERSION and add a migration step in `upgrade` for any schema change.
 */
interface LunarioDb extends DBSchema {
  plantings: { key: string; value: Planting };
}

const DB_NAME = 'lunario';
const DB_VERSION = 1;

let cached: { factory: IDBFactory; db: Promise<IDBPDatabase<LunarioDb>> } | null = null;

function db(): Promise<IDBPDatabase<LunarioDb>> {
  // Re-open if the IndexedDB factory changed (tests swap in a fresh one).
  if (!cached || cached.factory !== globalThis.indexedDB) {
    cached = {
      factory: globalThis.indexedDB,
      db: openDB<LunarioDb>(DB_NAME, DB_VERSION, {
        upgrade(database, oldVersion) {
          if (oldVersion < 1) database.createObjectStore('plantings', { keyPath: 'id' });
        },
      }),
    };
  }
  return cached.db;
}

export async function listPlantings(): Promise<Planting[]> {
  return (await db()).getAll('plantings');
}

export async function addPlanting(input: NewPlanting, now = new Date()): Promise<Planting> {
  const stamp = now.toISOString();
  const planting: Planting = {
    ...input,
    notes: input.notes.trim(),
    id: crypto.randomUUID(),
    status: 'active',
    createdAt: stamp,
    updatedAt: stamp,
  };
  await (await db()).add('plantings', planting);
  return planting;
}

export async function updatePlanting(
  id: string,
  patch: Partial<Pick<Planting, 'status' | 'notes' | 'date'>>,
  now = new Date(),
): Promise<Planting> {
  const database = await db();
  const tx = database.transaction('plantings', 'readwrite');
  const existing = await tx.store.get(id);
  if (!existing) throw new Error(`No planting ${id}`);
  const updated: Planting = { ...existing, ...patch, updatedAt: now.toISOString() };
  await tx.store.put(updated);
  await tx.done;
  return updated;
}

export async function deletePlanting(id: string): Promise<void> {
  await (await db()).delete('plantings', id);
}

/**
 * Asks the browser not to evict the app's storage (RF-15). Installed PWAs are usually granted
 * it; the answer does not change anything else, so failures are ignored.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (await navigator.storage?.persisted?.()) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
