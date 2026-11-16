import { IDBFactory } from 'fake-indexeddb';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Location } from '../astro/location.ts';
import { initI18n } from '../i18n/index.ts';
import { fakePlatform } from '../test/fakePush.ts';
import { FrostAlertsCard } from './FrostAlertsCard.tsx';

const GUARDA: Location = { name: 'Guarda', latitude: 40.5373, longitude: -7.2676 };
const ok = () => vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));

describe('FrostAlertsCard', () => {
  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    await initI18n('pt-PT');
  });

  it('says what is sent, and turns alerts on and off', async () => {
    const { platform } = fakePlatform();
    const fetchImpl = ok();
    render(<FrostAlertsCard location={GUARDA} platform={platform} fetchImpl={fetchImpl} />);
    expect(screen.getByText(/localização arredondada a cerca de 1 km/)).toBeInTheDocument();

    const toggle = await screen.findByRole('checkbox', { name: 'Avisar-me de geada' });
    await waitFor(() => expect(toggle).toBeEnabled());
    expect(toggle).not.toBeChecked();

    await userEvent.click(toggle);
    await waitFor(() => expect(toggle).toBeChecked());
    expect(screen.getByRole('status')).toHaveTextContent('Ligados para Guarda');

    await userEvent.click(toggle);
    await waitFor(() => expect(toggle).not.toBeChecked());
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  it('sends a test alert once alerts are on', async () => {
    const { platform } = fakePlatform();
    const fetchImpl = vi.fn((url: RequestInfo | URL) =>
      Promise.resolve(
        new Response(null, { status: String(url).endsWith('/test') && fails ? 502 : 204 }),
      ),
    );
    let fails = false;
    render(<FrostAlertsCard location={GUARDA} platform={platform} fetchImpl={fetchImpl} />);
    expect(screen.queryByRole('button', { name: 'Enviar alerta de teste' })).toBeNull();

    const toggle = await screen.findByRole('checkbox');
    await waitFor(() => expect(toggle).toBeEnabled());
    await userEvent.click(toggle);
    const button = await screen.findByRole('button', { name: 'Enviar alerta de teste' });
    await userEvent.click(button);
    expect(await screen.findByText(/A notificação deve chegar/)).toBeVisible();

    fails = true;
    await userEvent.click(button);
    expect(await screen.findByText(/Não foi possível enviar o teste/)).toBeVisible();
  });

  it('explains when the phone cannot receive alerts', async () => {
    const platform = { ...fakePlatform().platform, supported: () => false };
    render(<FrostAlertsCard location={GUARDA} platform={platform} />);
    expect(
      await screen.findByText(/No iPhone, adicione o Lunário ao ecrã principal/),
    ).toBeVisible();
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it('explains when notifications are blocked', async () => {
    render(<FrostAlertsCard location={GUARDA} platform={fakePlatform('denied').platform} />);
    const toggle = await screen.findByRole('checkbox');
    await waitFor(() => expect(toggle).toBeEnabled());
    await userEvent.click(toggle);
    expect(await screen.findByText(/notificações estão bloqueadas/)).toBeVisible();
    expect(toggle).not.toBeChecked();
  });

  it('stays off and says so when the server fails', async () => {
    const failing = vi.fn(() => Promise.resolve(new Response(null, { status: 503 })));
    render(
      <FrostAlertsCard location={GUARDA} platform={fakePlatform().platform} fetchImpl={failing} />,
    );
    const toggle = await screen.findByRole('checkbox');
    await waitFor(() => expect(toggle).toBeEnabled());
    await userEvent.click(toggle);
    expect(await screen.findByText(/Não foi possível mudar os alertas/)).toBeVisible();
    expect(toggle).not.toBeChecked();
  });
});
