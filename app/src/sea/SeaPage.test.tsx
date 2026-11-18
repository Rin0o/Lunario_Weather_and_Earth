import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { seaPortFor } from '../coast/useSeaPort.ts';
import { initI18n } from '../i18n/index.ts';
import { fakeSeaFetch } from './fixtures.ts';
import { SeaPage } from './SeaPage.tsx';

// 10:00 in Lisbon (winter, UTC+0).
const NOW = new Date('2026-11-18T10:00:00Z');
const COIMBRA = { latitude: 40.2, longitude: -8.41 };

const fact = (term: string) =>
  screen.getByText(term, { selector: 'dt' }).nextElementSibling?.textContent;

describe('SeaPage', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    localStorage.clear();
    await initI18n('pt-PT');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the tides, the waves, the wind, the next days and the warnings', async () => {
    render(<SeaPage now={NOW} seaPort={seaPortFor(COIMBRA, null)} fetchImpl={fakeSeaFetch()} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Mar' })).toBeInTheDocument();
    expect(screen.getByText('Figueira da Foz')).toBeInTheDocument();

    // Tides are computed on the phone, so they are there before any download.
    const tides = screen.getByRole('article', { name: 'Marés' });
    expect(within(tides).getAllByText(/^(Preia|Baixa)-mar$/).length).toBeGreaterThanOrEqual(3);
    expect(within(tides).getByText('Marés mortas')).toBeInTheDocument();

    expect(await screen.findByText('Ondas', { selector: 'dt' })).toBeInTheDocument();
    expect(fact('Ondas')).toBe('3,9–5,3 mNoroeste');
    expect(fact('Período')).toBe('9 s');
    expect(fact('Mar total')).toBe('5,0–5,5 m');
    expect(fact('Temperatura da água')).toBe('17°');
    expect(fact('Agora')).toBe('30 km/hNoroesteforça 5');
    expect(fact('Rajadas')).toBe('até 58 km/h');

    const days = screen.getByRole('table');
    expect(within(days).getAllByRole('row')).toHaveLength(3); // header + 2 days

    // Closed, the warnings take one line: the highest level and when the last one ends.
    const warnings = screen.getByRole('article', { name: /^Agitação marítima · aviso laranja/ });
    const details = warnings.querySelector('details');
    expect(details?.open).toBe(false);
    expect(within(warnings).getByText(/^até sexta 00:00/)).toBeInTheDocument();
    fireEvent.click(within(warnings).getByText(/^Agitação marítima/));
    expect(details?.open).toBe(true);
    expect(within(warnings).getByText('Laranja')).toBeInTheDocument();
    expect(within(warnings).getByText('Amarelo')).toBeInTheDocument();
    expect(
      screen.getByText(/^Fontes: IPMA e Open-Meteo .* atualizado às 10:00$/),
    ).toBeInTheDocument();
  });

  it('says when the forecast cannot be downloaded, but still shows the tides', async () => {
    const down = (() => Promise.reject(new TypeError('offline'))) as typeof fetch;
    render(<SeaPage now={NOW} seaPort={seaPortFor(COIMBRA, null)} fetchImpl={down} />);
    expect(await screen.findByText(/Previsão do mar indisponível/)).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Marés' })).toBeInTheDocument();
  });
});
