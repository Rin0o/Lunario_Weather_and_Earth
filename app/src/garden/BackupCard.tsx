import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatFullDate } from '../i18n/format.ts';
import { BackupError } from './backup.ts';
import type { Backup } from './useBackup.ts';

/** RF-11: export the garden to a file and merge a file back in. */
export function BackupCard({ backup }: { backup: Backup }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');

  const exportNow = async () => {
    try {
      setMessage(t(`backup.${await backup.exportBackup()}`));
    } catch {
      setMessage(t('backup.failed'));
    }
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const result = await backup.importBackup(file);
      const parts = [t('backup.imported', result)];
      if (result.invalid) parts.push(t('backup.invalidEntries', { count: result.invalid }));
      setMessage(parts.join(' '));
    } catch (error) {
      setMessage(error instanceof BackupError ? t('backup.invalidFile') : t('backup.failed'));
    } finally {
      if (input.current) input.current.value = '';
    }
  };

  return (
    <article className="card" aria-labelledby="backup-heading">
      <h3 id="backup-heading">{t('backup.title')}</h3>
      <p className="hint">{t('backup.intro')}</p>
      <p>
        {backup.lastBackupAt
          ? t('backup.last', { date: formatFullDate(new Date(backup.lastBackupAt), lang) })
          : t('backup.never')}
      </p>
      <div className="planting-actions">
        <button type="button" onClick={() => void exportNow()}>
          {t('backup.export')}
        </button>
        <label className="file-button">
          {t('backup.import')}
          <input
            ref={input}
            type="file"
            accept=".json,application/json"
            onChange={(e) => void importFile(e.target.files?.[0])}
          />
        </label>
      </div>
      <p role="status" className="hint">
        {message}
      </p>
    </article>
  );
}

/** RF-15: the monthly nudge at the top of "A minha horta". */
export function BackupReminder({ backup }: { backup: Backup }) {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  if (!backup.due)
    return message ? (
      <p role="status" className="hint">
        {message}
      </p>
    ) : null;

  return (
    <div className="reminder" role="region" aria-label={t('backup.title')}>
      <p>{backup.lastBackupAt ? t('backup.reminder') : t('backup.reminderNever')}</p>
      <div className="planting-actions">
        <button
          type="button"
          onClick={() =>
            void backup
              .exportBackup()
              .then((outcome) => setMessage(t(`backup.${outcome}`)))
              .catch(() => setMessage(t('backup.failed')))
          }
        >
          {t('backup.backupNow')}
        </button>
        <button type="button" onClick={() => void backup.snooze()}>
          {t('backup.later')}
        </button>
      </div>
    </div>
  );
}
