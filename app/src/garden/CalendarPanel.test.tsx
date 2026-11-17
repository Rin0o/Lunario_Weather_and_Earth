import { IDBFactory } from 'fake-indexeddb';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IsoDate } from '../calendar/dates.ts';
import { initI18n } from '../i18n/index.ts';
import { addPlanting, getMeta, setMeta } from './db.ts';
import { GardenPage } from './GardenPage.tsx';

const NOV_16 = new Date('2026-11-16T10:00:00Z');

/** Captures the files the app downloads (jsdom has no object URLs). */
function captureDownloads() {
  const files: File[] = [];
  vi.stubGlobal(
    'URL',
    Object.assign(URL, {
      createObjectURL: vi.fn((file: File) => {
        files.push(file);
        return 'blob:file';
      }),
      revokeObjectURL: vi.fn(),
    }),
  );
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  return files;
}

async function renderWith(cropId: string, action: 'SV' | 'SD' | 'PL', date: IsoDate) {
  await addPlanting({ cropId, action, date, notes: '' });
  render(<GardenPage now={NOV_16} district="Coimbra" />);
  await screen.findByRole('list', { name: 'Na horta' });
}

describe('"Adicionar ao calendário" (RF-13)', () => {
  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    await initI18n('pt-PT');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the expected transplant and creates both reminders with the chosen alarm', async () => {
    const user = userEvent.setup();
    const files = captureDownloads();
    await renderWith('tomate', 'SV', '2026-11-16');

    expect(
      screen.getByTitle('Transplante previsto: 28 de dezembro de 2026 – 11 de janeiro de 2027.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Adicionar ao calendário' }));
    const events = within(screen.getByRole('list', { name: 'Lembretes' }))
      .getAllByRole('listitem')
      .map((li) => li.textContent);
    expect(events).toEqual([
      expect.stringMatching(/^Transplantar Tomate \(Lunário\) · 28 de dezembro de 2026/),
      expect.stringMatching(/^Início da colheita: Tomate \(Lunário\) · 16 de março de 2027/),
    ]);
    const google = screen.getAllByRole('link', { name: 'Abrir no Google Calendar' });
    expect(new URL(google[0]?.getAttribute('href') ?? '').searchParams.get('dates')).toBe(
      '20261228/20261229',
    );

    expect(screen.getByLabelText('Avisar quantos dias antes')).toHaveValue(5);
    expect(screen.getByLabelText('A que horas')).toHaveValue('13:00');
    await user.clear(screen.getByLabelText('Avisar quantos dias antes'));
    await user.type(screen.getByLabelText('Avisar quantos dias antes'), '3');
    await user.clear(screen.getByLabelText('A que horas'));
    await user.type(screen.getByLabelText('A que horas'), '09:30');
    await user.click(screen.getByRole('button', { name: 'Criar ficheiro do calendário' }));

    expect(
      await screen.findByText('Ficheiro criado. Abra-o para o adicionar ao calendário.'),
    ).toBeInTheDocument();
    expect(files).toHaveLength(1);
    expect(files[0]?.name).toBe('lunario-tomate-2026-11-16.ics');
    expect(files[0]?.type).toBe('text/calendar');
    const ics = (await (files[0] as File).text()).replace(/\r\n /g, '');
    // 3 days before at 09:30 → 2 days 14 h 30 min before midnight of the event day.
    expect(ics.match(/TRIGGER:-P2DT14H30M/g)).toHaveLength(2);
    expect(ics).toContain('SUMMARY:Transplantar Tomate (Lunário)');
    expect(await getMeta('reminderDaysBefore')).toBe('3');
    expect(await getMeta('reminderTime')).toBe('09:30');
  });

  it('starts from the last reminder setting', async () => {
    await setMeta('reminderDaysBefore', '2');
    await setMeta('reminderTime', '08:00');
    await renderWith('fava', 'SD', '2026-11-16');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar ao calendário' }));
    await waitFor(() => expect(screen.getByLabelText('Avisar quantos dias antes')).toHaveValue(2));
    expect(screen.getByLabelText('A que horas')).toHaveValue('08:00');
  });

  it('has nothing to add once the dates have passed', async () => {
    await renderWith('rabanete', 'SD', '2026-01-10');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar ao calendário' }));
    expect(screen.getByText('Não há datas futuras para lembrar.')).toBeInTheDocument();
  });

  it('offers no calendar for a perennial crop', async () => {
    await renderWith('morango', 'PL', '2026-11-10');
    expect(screen.queryByRole('button', { name: 'Adicionar ao calendário' })).toBeNull();
  });
});
