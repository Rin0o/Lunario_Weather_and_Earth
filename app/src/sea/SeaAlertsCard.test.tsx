import { IDBFactory } from 'fake-indexeddb';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Location } from '../astro/location.ts';
import { findPort, type Port } from '../coast/ports.ts';
import { initI18n } from '../i18n/index.ts';
import { fakePlatform } from '../test/fakePush.ts';
import { SeaAlertsCard } from './SeaAlertsCard.tsx';

const AVEIRO: Location = { name: 'Aveiro', latitude: 40.64, longitude: -8.65 };
const PORT = findPort('aveiro') as Port;
const ok = () =>
  vi.fn<(url: string, init: RequestInit) => Promise<Response>>(() =>
    Promise.resolve(new Response(null, { status: 204 })),
  );
const body = (fetchImpl: ReturnType<typeof ok>, call: number) =>
  JSON.parse(String(fetchImpl.mock.calls[call]?.[1].body)) as Record<string, unknown>;

describe('SeaAlertsCard', () => {
  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    await initI18n('pt-PT');
  });

  it('says the location is not sent, turns on for the port district, and offers yellow', async () => {
    const fetchImpl = ok();
    render(
      <SeaAlertsCard
        location={AVEIRO}
        port={PORT}
        platform={fakePlatform().platform}
        fetchImpl={fetchImpl as unknown as typeof fetch}
      />,
    );
    expect(screen.getByText(/A sua localização não é enviada/)).toBeInTheDocument();
    const toggle = await screen.findByRole('checkbox', { name: 'Avisar-me de agitação marítima' });
    await waitFor(() => expect(toggle).toBeEnabled());
    expect(screen.queryByRole('checkbox', { name: /amarelos/ })).not.toBeInTheDocument();

    await userEvent.click(toggle);
    await waitFor(() => expect(toggle).toBeChecked());
    expect(screen.getByRole('status')).toHaveTextContent(
      'Ligados para Aveiro (distrito de Aveiro)',
    );
    expect(body(fetchImpl, 0)).toMatchObject({ frost: null, sea: { area: 'AVR', yellow: false } });

    const yellow = screen.getByRole('checkbox', { name: /Incluir os avisos amarelos/ });
    expect(yellow).not.toBeChecked();
    await userEvent.click(yellow);
    await waitFor(() => expect(yellow).toBeChecked());
    expect(body(fetchImpl, 1)).toMatchObject({ sea: { area: 'AVR', yellow: true } });

    await userEvent.click(toggle);
    await waitFor(() => expect(toggle).not.toBeChecked());
    expect(fetchImpl.mock.calls[2]?.[1].method).toBe('DELETE');
  });

  it('puts the yellow choice back and says so when the server fails', async () => {
    const fetchImpl = ok();
    render(
      <SeaAlertsCard
        location={AVEIRO}
        port={PORT}
        platform={fakePlatform().platform}
        fetchImpl={fetchImpl as unknown as typeof fetch}
      />,
    );
    const toggle = await screen.findByRole('checkbox', { name: 'Avisar-me de agitação marítima' });
    await waitFor(() => expect(toggle).toBeEnabled());
    await userEvent.click(toggle);
    const yellow = await screen.findByRole('checkbox', { name: /amarelos/ });

    fetchImpl.mockResolvedValue(new Response(null, { status: 503 }));
    await userEvent.click(yellow);
    expect(await screen.findByText(/Não foi possível mudar os alertas/)).toBeVisible();
    expect(yellow).not.toBeChecked();
  });

  it('explains when the phone cannot receive alerts', async () => {
    const platform = { ...fakePlatform().platform, supported: () => false };
    render(<SeaAlertsCard location={AVEIRO} port={PORT} platform={platform} />);
    expect(await screen.findByText(/No iPhone, adicione o Lunário/)).toBeVisible();
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });
});
