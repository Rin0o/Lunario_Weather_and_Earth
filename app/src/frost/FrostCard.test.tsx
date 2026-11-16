import { IDBFactory } from 'fake-indexeddb';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import i18n from 'i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Location } from '../astro/location.ts';
import { addPlanting } from '../garden/db.ts';
import { initI18n } from '../i18n/index.ts';
import { openMeteoJson } from './fixtures.ts';
import { FrostCard } from './FrostCard.tsx';

const GUARDA: Location = { name: 'Guarda', latitude: 40.5373, longitude: -7.2676 };
const NOW = new Date('2026-11-17T09:00:00Z');

const COLD = openMeteoJson([
  { date: '2026-11-16', air: -3, surface: -5 }, // yesterday: never shown
  { date: '2026-11-17', air: 6, surface: 4 },
  { date: '2026-11-18', air: 1.2, surface: -2.4 },
  { date: '2026-11-19', air: 2.6, surface: 0.5 },
  { date: '2026-11-20', air: 4, surface: 2 },
  { date: '2026-11-21', air: -0.4, surface: -3 },
]);
const MILD = openMeteoJson([{ date: '2026-11-17', air: 9, surface: 7 }]);

const respond = (json: unknown) => vi.fn(() => Promise.resolve(new Response(JSON.stringify(json))));

describe('FrostCard', () => {
  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    await initI18n('pt-PT');
  });

  it('lists the days at risk from today on', async () => {
    render(<FrostCard now={NOW} location={GUARDA} fetchImpl={respond(COLD)} />);
    const card = await screen.findByRole('article', { name: /Risco de geada/ });
    const days = within(card)
      .getAllByRole('listitem')
      .map((li) => li.textContent);
    expect(days).toEqual([
      'amanhã: geada (superfície -2 °C, ar 1 °C)',
      'quinta, 19/11: geada possível (ar 3 °C)',
      // -0.4 °C rounds to 0 °C, never "-0 °C".
      'sábado, 21/11: geada (superfície -3 °C, ar 0 °C)',
    ]);
    expect(within(card).getByText(/Previsão para Guarda · Fonte: Open-Meteo/)).toBeInTheDocument();
    expect(within(card).queryByText(/Proteja/)).not.toBeInTheDocument();
  });

  it('names the frost-sensitive crops growing in the garden', async () => {
    await addPlanting({ cropId: 'tomate', action: 'TR', date: '2026-10-01', notes: '' });
    await addPlanting({ cropId: 'feijao_verde', action: 'SD', date: '2026-10-01', notes: '' });
    await addPlanting({ cropId: 'tomate', action: 'SV', date: '2026-11-01', notes: '' });
    await addPlanting({ cropId: 'couve_galega', action: 'TR', date: '2026-10-01', notes: '' });
    render(<FrostCard now={NOW} location={GUARDA} fetchImpl={respond(COLD)} />);
    expect(
      await screen.findByText('Proteja na sua horta: Feijão-verde, Tomate.'),
    ).toBeInTheDocument();
  });

  it('shows nothing when no frost is forecast', async () => {
    const fetchImpl = respond(MILD);
    const { container } = render(<FrostCard now={NOW} location={GUARDA} fetchImpl={fetchImpl} />);
    await waitFor(() => expect(fetchImpl).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('keeps the saved forecast when offline, and says so', async () => {
    const first = render(<FrostCard now={NOW} location={GUARDA} fetchImpl={respond(COLD)} />);
    await screen.findByRole('article', { name: /Risco de geada/ });
    first.unmount();

    const offline = vi.fn(() => Promise.reject(new TypeError('offline')));
    render(<FrostCard now={NOW} location={GUARDA} fetchImpl={offline} />);
    expect(await screen.findByText(/Sem rede, previsão guardada/)).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('is written in English too', async () => {
    render(<FrostCard now={NOW} location={GUARDA} fetchImpl={respond(COLD)} />);
    await screen.findByRole('article', { name: /Risco de geada/ });
    await act(() => i18n.changeLanguage('en'));
    expect(screen.getByRole('article', { name: /Frost risk/ })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent(
      'tomorrow: frost (ground -2 °C, air 1 °C)',
    );
  });
});
