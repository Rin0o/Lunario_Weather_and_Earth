import { IDBFactory } from 'fake-indexeddb';
import { openDB } from 'idb';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  BackupError,
  backupFileName,
  isBackupDue,
  mergePlantings,
  parseBackup,
  toBackup,
} from './backup.ts';
import { DB_NAME, getMeta, listPlantings, putPlantings, setMeta } from './db.ts';
import type { Planting } from './plantings.ts';

const p = (
  id: string,
  updatedAt = '2026-11-10T10:00:00.000Z',
  over: Partial<Planting> = {},
): Planting => ({
  id,
  cropId: 'fava',
  action: 'SD',
  date: '2026-11-01',
  status: 'active',
  notes: '',
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt,
  ...over,
});

describe('backup file', () => {
  it('round-trips plantings', () => {
    const file = toBackup([p('a'), p('b')], new Date('2026-11-16T09:00:00Z'));
    expect(file).toMatchObject({
      format: 'lunario-backup',
      version: 1,
      exportedAt: '2026-11-16T09:00:00.000Z',
    });
    expect(parseBackup(JSON.stringify(file))).toEqual({ plantings: [p('a'), p('b')], invalid: 0 });
    expect(backupFileName('2026-11-16')).toBe('lunario-horta-2026-11-16.json');
  });

  it.each([
    ['not json', 'not JSON'],
    ['{"format":"other"}', 'not a Lunário backup'],
    ['null', 'not a Lunário backup'],
    ['{"format":"lunario-backup","version":2,"plantings":[]}', 'unsupported version 2'],
    ['{"format":"lunario-backup","version":1}', 'no plantings'],
  ])('rejects %s', (text, message) => {
    expect(() => parseBackup(text)).toThrow(BackupError);
    expect(() => parseBackup(text)).toThrow(message);
  });

  it('skips and counts damaged entries', () => {
    const text = JSON.stringify({
      format: 'lunario-backup',
      version: 1,
      plantings: [
        p('ok'),
        { ...p('bad-action'), action: 'XX' },
        { ...p('bad-date'), date: '16/11/2026' },
        { ...p(''), id: '' },
        { ...p('bad-status'), status: 'lost' },
        { ...p('bad-stamp'), updatedAt: 'yesterday' },
        'nonsense',
      ],
    });
    expect(parseBackup(text)).toEqual({ plantings: [p('ok')], invalid: 6 });
  });
});

describe('mergePlantings', () => {
  it('adds new entries and keeps the most recently updated version', () => {
    const phone = [
      p('same'),
      p('older-on-phone', '2026-11-01T00:00:00Z'),
      p('newer-on-phone', '2026-11-20T00:00:00Z'),
    ];
    const file = [
      p('same'),
      p('older-on-phone', '2026-11-15T00:00:00Z', { status: 'harvested' }),
      p('newer-on-phone', '2026-11-05T00:00:00Z'),
      p('new'),
    ];
    const result = mergePlantings(phone, file);
    expect(result).toMatchObject({ added: 1, updated: 1, unchanged: 2 });
    expect(result.toWrite.map((x) => x.id).sort()).toEqual(['new', 'older-on-phone']);
  });

  it('keeps the newest copy when a file lists an entry twice', () => {
    const result = mergePlantings(
      [],
      [p('x', '2026-11-01T00:00:00Z'), p('x', '2026-11-09T00:00:00Z', { notes: 'latest' })],
    );
    expect(result.added).toBe(1);
    expect(result.toWrite).toEqual([p('x', '2026-11-09T00:00:00Z', { notes: 'latest' })]);
  });

  it('changes nothing when the same file is imported twice', () => {
    const entries = [p('a'), p('b')];
    expect(mergePlantings(entries, entries)).toMatchObject({
      added: 0,
      updated: 0,
      unchanged: 2,
      toWrite: [],
    });
  });
});

describe('isBackupDue (monthly, RF-15)', () => {
  const now = new Date('2026-12-20T10:00:00Z');
  const created = p('a', '2026-11-01T10:00:00.000Z');

  it('is not due without plantings', () => {
    expect(isBackupDue([], null, null, now)).toBe(false);
  });

  it('is due a month after the first entry when there was never a backup', () => {
    expect(isBackupDue([created], null, null, now)).toBe(true);
    expect(isBackupDue([created], null, null, new Date('2026-11-20T10:00:00Z'))).toBe(false);
  });

  it('is due a month after the last backup only if something changed', () => {
    const backedUp = '2026-11-15T00:00:00.000Z';
    expect(isBackupDue([created], backedUp, null, now)).toBe(false);
    const changed = p('a', '2026-11-18T00:00:00.000Z');
    expect(isBackupDue([changed], backedUp, null, now)).toBe(true);
    expect(isBackupDue([changed], backedUp, null, new Date('2026-12-01T00:00:00Z'))).toBe(false);
  });

  it('waits a month after "later"', () => {
    expect(isBackupDue([created], null, '2026-12-10T00:00:00.000Z', now)).toBe(false);
    expect(isBackupDue([created], null, '2026-11-10T00:00:00.000Z', now)).toBe(true);
  });
});

describe('device database upgrade', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  it('upgrades a version 1 database without losing plantings', async () => {
    const v1 = await openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore('plantings', { keyPath: 'id' });
      },
    });
    await v1.put('plantings', p('kept'));
    v1.close();

    expect(await listPlantings()).toEqual([p('kept')]);
    expect(await getMeta('lastBackupAt')).toBeNull();
    await setMeta('lastBackupAt', '2026-11-16T09:00:00.000Z');
    expect(await getMeta('lastBackupAt')).toBe('2026-11-16T09:00:00.000Z');
  });

  it('writes several plantings at once', async () => {
    await putPlantings([p('a'), p('b')]);
    expect((await listPlantings()).map((x) => x.id).sort()).toEqual(['a', 'b']);
  });
});
