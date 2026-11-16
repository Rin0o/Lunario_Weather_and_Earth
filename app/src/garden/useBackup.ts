import { useCallback, useEffect, useState } from 'react';
import { dateInZone } from '../astro/time.ts';
import { downloadFile } from '../lib/download.ts';
import { backupFileName, isBackupDue, mergePlantings, parseBackup, toBackup } from './backup.ts';
import { getMeta, putPlantings, setMeta } from './db.ts';
import type { Garden } from './useGarden.ts';

export type ExportOutcome = 'shared' | 'downloaded' | 'cancelled';
export type ImportOutcome = { added: number; updated: number; unchanged: number; invalid: number };

export interface Backup {
  lastBackupAt: string | null;
  /** The monthly reminder should show (RF-15). */
  due: boolean;
  exportBackup: () => Promise<ExportOutcome>;
  /** Merges a backup file into the device; throws BackupError for a file that isn't one. */
  importBackup: (file: Blob) => Promise<ImportOutcome>;
  snooze: () => Promise<void>;
}

/** Export, import and the backup reminder for "A minha horta" (RF-11, RF-15). */
export function useBackup(garden: Garden, now: Date): Backup {
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [snoozedAt, setSnoozedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([getMeta('lastBackupAt'), getMeta('backupReminderSnoozedAt')])
      .then(([last, snoozed]) => {
        if (cancelled) return;
        setLastBackupAt(last);
        setSnoozedAt(snoozed);
      })
      .catch(() => undefined); // no storage: no reminder state, exports still work
    return () => {
      cancelled = true;
    };
  }, []);

  const exportBackup = useCallback(async (): Promise<ExportOutcome> => {
    const at = new Date();
    const json = JSON.stringify(toBackup(garden.plantings, at), null, 2);
    const file = new File([json], backupFileName(dateInZone(at)), { type: 'application/json' });

    let outcome: ExportOutcome = 'downloaded';
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: file.name });
        outcome = 'shared';
      } catch (error) {
        if ((error as Error).name === 'AbortError') return 'cancelled';
        downloadFile(file); // sharing failed for another reason: save the file instead
      }
    } else {
      downloadFile(file);
    }
    await setMeta('lastBackupAt', at.toISOString()).catch(() => undefined);
    setLastBackupAt(at.toISOString());
    return outcome;
  }, [garden.plantings]);

  const importBackup = useCallback(
    async (file: Blob): Promise<ImportOutcome> => {
      const { plantings, invalid } = parseBackup(await file.text());
      const merge = mergePlantings(garden.plantings, plantings);
      if (merge.toWrite.length) await putPlantings(merge.toWrite);
      await garden.reload();
      return { added: merge.added, updated: merge.updated, unchanged: merge.unchanged, invalid };
    },
    [garden],
  );

  const snooze = useCallback(async () => {
    const at = new Date().toISOString();
    await setMeta('backupReminderSnoozedAt', at).catch(() => undefined);
    setSnoozedAt(at);
  }, []);

  return {
    lastBackupAt,
    due: !garden.loading && isBackupDue(garden.plantings, lastBackupAt, snoozedAt, now),
    exportBackup,
    importBackup,
    snooze,
  };
}
