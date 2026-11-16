import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { NewPlanting, Planting } from './plantings.ts';

/**
 * The device-only database (RNF-03). Bump DB_VERSION and add a step in `upgrade` for any
 * schema change; steps run in order, so a phone on any older version catches up.
 *   v1: plantings
 *   v2: meta (key/value: last backup, reminder snooze, calendar reminder settings, frost alerts)
 */
export type MetaKey =
  | 'lastBackupAt'
  | 'backupReminderSnoozedAt'
  | 'reminderDaysBefore'
  | 'reminderTime'
  | 'moonMode'
  /** 'on' once the user turned frost alerts on (RF-14). */
  | 'frostAlerts'
  /** The last subscription sent to the alerts Worker, to send it again only when it changes. */
  | 'frostAlertsSent';

interface LunarioDb extends DBSchema {
  plantings: { key: string; value: Planting };
  meta: { key: MetaKey; value: { key: MetaKey; value: string } };
}

export const DB_NAME = 'lunario';
const DB_VERSION = 2;

let cached: { factory: IDBFactory; db: Promise<IDBPDatabase<LunarioDb>> } | null = null;

function db(): Promise<IDBPDatabase<LunarioDb>> {
  // Re-open if the IndexedDB factory changed (tests swap in a fresh one).
  if (!cached || cached.factory !== globalThis.indexedDB) {
    cached = {
      factory: globalThis.indexedDB,
      db: openDB<LunarioDb>(DB_NAME, DB_VERSION, {
        upgrade(database, oldVersion) {
          if (oldVersion < 1) database.createObjectStore('plantings', { keyPath: 'id' });
          if (oldVersion < 2) database.createObjectStore('meta', { keyPath: 'key' });
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

/** Writes several plantings in one transaction (used by import). */
export async function putPlantings(plantings: readonly Planting[]): Promise<void> {
  const tx = (await db()).transaction('plantings', 'readwrite');
  await Promise.all([...plantings.map((p) => tx.store.put(p)), tx.done]);
}

export async function getMeta(key: MetaKey): Promise<string | null> {
  return (await (await db()).get('meta', key))?.value ?? null;
}

export async function setMeta(key: MetaKey, value: string): Promise<void> {
  await (await db()).put('meta', { key, value });
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
