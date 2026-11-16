import { PLANTING_ACTIONS, type Planting } from './plantings.ts';

/**
 * Backup file of "A minha horta" (RF-11): plain JSON the user keeps wherever they like.
 * `version` lets future formats read old files.
 */
export interface BackupFile {
  format: 'lunario-backup';
  version: 1;
  exportedAt: string;
  plantings: Planting[];
}

export class BackupError extends Error {}

export function toBackup(plantings: readonly Planting[], now = new Date()): BackupFile {
  return {
    format: 'lunario-backup',
    version: 1,
    exportedAt: now.toISOString(),
    plantings: [...plantings],
  };
}

/** `lunario-horta-2026-11-16.json` */
export function backupFileName(isoDate: string): string {
  return `lunario-horta-${isoDate}.json`;
}

const isString = (v: unknown): v is string => typeof v === 'string';
const isIsoDate = (v: unknown) => isString(v) && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isTimestamp = (v: unknown) => isString(v) && !Number.isNaN(Date.parse(v));

function isPlanting(v: unknown): v is Planting {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Record<string, unknown>;
  return (
    isString(p.id) &&
    p.id.length > 0 &&
    isString(p.cropId) &&
    (PLANTING_ACTIONS as readonly unknown[]).includes(p.action) &&
    isIsoDate(p.date) &&
    (p.status === 'active' || p.status === 'harvested') &&
    isString(p.notes) &&
    isTimestamp(p.createdAt) &&
    isTimestamp(p.updatedAt)
  );
}

/**
 * Reads a backup file. Throws BackupError if it is not a Lunário backup at all; individual
 * entries that are damaged are skipped and counted.
 */
export function parseBackup(text: string): { plantings: Planting[]; invalid: number } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new BackupError('not JSON');
  }
  const file = json as Partial<BackupFile> | null;
  if (file?.format !== 'lunario-backup') throw new BackupError('not a Lunário backup');
  if (file.version !== 1) throw new BackupError(`unsupported version ${String(file.version)}`);
  if (!Array.isArray(file.plantings)) throw new BackupError('no plantings');
  const plantings = file.plantings.filter(isPlanting);
  return { plantings, invalid: file.plantings.length - plantings.length };
}

export interface MergeResult {
  /** Entries to write: new ones and newer versions of existing ones. */
  toWrite: Planting[];
  added: number;
  updated: number;
  unchanged: number;
}

/** Merges imported entries into the existing ones: by id, the most recently updated wins. */
export function mergePlantings(
  existing: readonly Planting[],
  incoming: readonly Planting[],
): MergeResult {
  const newer = (a: Planting, b: Planting) => Date.parse(a.updatedAt) > Date.parse(b.updatedAt);

  // A file could list one entry twice: keep its newest copy.
  const latest = new Map<string, Planting>();
  for (const p of incoming) {
    const seen = latest.get(p.id);
    if (!seen || newer(p, seen)) latest.set(p.id, p);
  }

  const current = new Map(existing.map((p) => [p.id, p]));
  const result: MergeResult = { toWrite: [], added: 0, updated: 0, unchanged: 0 };
  for (const p of latest.values()) {
    const mine = current.get(p.id);
    if (!mine) {
      result.toWrite.push(p);
      result.added++;
    } else if (newer(p, mine)) {
      result.toWrite.push(p);
      result.updated++;
    } else {
      result.unchanged++;
    }
  }
  return result;
}

const MONTH_MS = 30 * 86_400_000;

/**
 * Monthly reminder (RF-15): due when something changed since the last backup (or there was
 * never one) and a month has passed since the last backup and since the last "later".
 */
export function isBackupDue(
  plantings: readonly Planting[],
  lastBackupAt: string | null,
  snoozedAt: string | null,
  now = new Date(),
): boolean {
  if (plantings.length === 0) return false;
  const last = lastBackupAt ? Date.parse(lastBackupAt) : null;
  const changed = last === null || plantings.some((p) => Date.parse(p.updatedAt) > last);
  if (!changed) return false;
  const reference = Math.max(
    last ?? Math.min(...plantings.map((p) => Date.parse(p.createdAt))),
    snoozedAt ? Date.parse(snoozedAt) : 0,
  );
  return now.getTime() - reference >= MONTH_MS;
}
