import { IDBFactory } from 'fake-indexeddb';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initI18n } from '../i18n/index.ts';
import { addPlanting, getMeta } from './db.ts';
import { GardenPage } from './GardenPage.tsx';
import type { Planting } from './plantings.ts';

const NOV_16 = new Date('2026-11-16T10:00:00Z');

/** jsdom has no Web Share API or object URLs; define them per test. */
function stubNavigator(props: Record<string, unknown>) {
  for (const [key, value] of Object.entries(props)) {
    Object.defineProperty(navigator, key, { value, configurable: true });
  }
}

async function renderWithOnePlanting(now = NOV_16, createdAt = NOV_16) {
  await addPlanting({ cropId: 'fava', action: 'SD', date: '2026-11-10', notes: '' }, createdAt);
  render(<GardenPage now={now} district="Coimbra" />);
  await screen.findByRole('list', { name: 'Na horta' });
}

const backupCard = () => screen.getByRole('article', { name: 'Cópia de segurança' });

describe('backup in "A minha horta"', () => {
  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    await initI18n('pt-PT');
  });

  afterEach(() => {
    for (const key of ['canShare', 'share']) Reflect.deleteProperty(navigator, key);
  });

  it('shares the backup file where the phone supports it, and remembers when', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    stubNavigator({ canShare: () => true, share });
    await renderWithOnePlanting();
    expect(within(backupCard()).getByText('Ainda não fez nenhuma cópia.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Exportar cópia' }));
    expect(await screen.findByText('Cópia partilhada.')).toBeInTheDocument();

    const { files } = share.mock.calls[0]?.[0] as { files: File[] };
    expect(files[0]?.name).toMatch(/^lunario-horta-\d{4}-\d{2}-\d{2}\.json$/);
    const content = JSON.parse(await (files[0] as File).text()) as { plantings: Planting[] };
    expect(content.plantings.map((p) => p.cropId)).toEqual(['fava']);

    expect(within(backupCard()).getByText(/^Última cópia: /)).toBeInTheDocument();
    expect(await getMeta('lastBackupAt')).not.toBeNull();
  });

  it('does not count a cancelled share as a backup', async () => {
    const abort = Object.assign(new Error('cancelled'), { name: 'AbortError' });
    stubNavigator({ canShare: () => true, share: vi.fn().mockRejectedValue(abort) });
    await renderWithOnePlanting();
    await userEvent.click(screen.getByRole('button', { name: 'Exportar cópia' }));
    expect(await screen.findByText('Cópia cancelada.')).toBeInTheDocument();
    expect(within(backupCard()).getByText('Ainda não fez nenhuma cópia.')).toBeInTheDocument();
  });

  it('downloads the file where sharing files is not possible', async () => {
    const createObjectURL = vi.fn(() => 'blob:backup');
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    await renderWithOnePlanting();

    await userEvent.click(screen.getByRole('button', { name: 'Exportar cópia' }));
    expect(await screen.findByText('Cópia guardada nas transferências.')).toBeInTheDocument();
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    click.mockRestore();
  });

  it('merges an imported file into the garden', async () => {
    await renderWithOnePlanting();
    const backup = {
      format: 'lunario-backup',
      version: 1,
      exportedAt: '2026-11-16T09:00:00.000Z',
      plantings: [
        {
          id: 'from-other-phone',
          cropId: 'alho',
          action: 'PL',
          date: '2026-10-20',
          status: 'active',
          notes: 'canteiro 3',
          createdAt: '2026-10-20T09:00:00.000Z',
          updatedAt: '2026-10-20T09:00:00.000Z',
        },
        { id: 'broken' },
      ],
    };
    const file = new File([JSON.stringify(backup)], 'lunario-horta.json', {
      type: 'application/json',
    });
    await userEvent.upload(screen.getByLabelText('Importar cópia'), file);

    expect(
      await screen.findByText(
        'Importado: 1 novos, 0 atualizados, 0 iguais. 1 registo danificado foi ignorado.',
      ),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('canteiro 3')).toBeInTheDocument());
    expect(screen.getAllByRole('link', { name: /Alho|Fava/ })).toHaveLength(2);
  });

  it('explains when a file is not a backup', async () => {
    await renderWithOnePlanting();
    const file = new File(['{"hello":1}'], 'other.json', { type: 'application/json' });
    await userEvent.upload(screen.getByLabelText('Importar cópia'), file);
    expect(
      await screen.findByText('Este ficheiro não é uma cópia do Lunário.'),
    ).toBeInTheDocument();
  });

  it('reminds monthly and can be snoozed', async () => {
    const monthAgo = new Date('2026-10-10T10:00:00Z');
    await renderWithOnePlanting(NOV_16, monthAgo);
    const reminder = await screen.findByRole('region', { name: 'Cópia de segurança' });
    expect(reminder).toHaveTextContent('Ainda não fez nenhuma cópia da horta.');

    await userEvent.click(within(reminder).getByRole('button', { name: 'Mais tarde' }));
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Cópia de segurança' })).not.toBeInTheDocument(),
    );
    expect(await getMeta('backupReminderSnoozedAt')).not.toBeNull();
  });

  it('does not remind before a month has passed', async () => {
    await renderWithOnePlanting();
    expect(screen.queryByRole('region', { name: 'Cópia de segurança' })).not.toBeInTheDocument();
  });
});
