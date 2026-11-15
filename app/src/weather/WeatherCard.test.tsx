import { act, render, screen, within } from '@testing-library/react';
import i18n from 'i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initI18n } from '../i18n/index.ts';
import { COIMBRA_FORECAST_JSON, jsonResponse } from './fixtures.ts';
import { WeatherCard } from './WeatherCard.tsx';

const COIMBRA = 1060300;
const NOV_15 = new Date('2026-11-15T10:00:00Z');

const fact = (term: string) =>
  screen.getByText(term, { selector: 'dt' }).nextElementSibling?.textContent;

describe('WeatherCard', () => {
  beforeEach(async () => {
    await initI18n('pt-PT');
  });

  it("shows today's forecast and the next days", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(COIMBRA_FORECAST_JSON));
    render(<WeatherCard now={NOV_15} ipmaId={COIMBRA} fetchImpl={fetchImpl} />);

    expect(await screen.findByText('Aguaceiros ou chuva')).toBeInTheDocument();
    expect(screen.getByText('19° / 14°')).toBeInTheDocument();
    expect(fact('Probabilidade de chuva')).toBe('100%');
    expect(fact('Vento')).toBe('Sul · fraco');

    const strip = screen.getByRole('list', { name: 'Próximos dias' });
    const days = within(strip).getAllByRole('listitem');
    expect(days).toHaveLength(2);
    expect(
      within(days[1] as HTMLElement).getByRole('img', { name: 'Céu pouco nublado' }),
    ).toBeVisible();
    expect(screen.getByText(/^Fonte: IPMA · atualizado às \d\d:\d\d$/)).toBeInTheDocument();
  });

  it('shows the saved forecast with a no-network notice when offline', async () => {
    localStorage.setItem(
      'lunario.forecast.1060300',
      JSON.stringify({ fetchedAt: '2026-11-15T08:30:00Z', json: COIMBRA_FORECAST_JSON }),
    );
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline'));
    render(<WeatherCard now={NOV_15} ipmaId={COIMBRA} fetchImpl={fetchImpl} />);

    expect(await screen.findByText('Sem rede, previsão guardada ·')).toBeInTheDocument();
    expect(screen.getByText(/atualizado às 08:30/)).toBeInTheDocument();
    expect(screen.getByText('Aguaceiros ou chuva')).toBeInTheDocument();
  });

  it('shows what is left of an older saved forecast, with its download date', async () => {
    localStorage.setItem(
      'lunario.forecast.1060300',
      JSON.stringify({ fetchedAt: '2026-11-15T08:30:00Z', json: COIMBRA_FORECAST_JSON }),
    );
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline'));
    // 17 Nov: only the last saved day is left; it is today, so no date label is needed.
    render(
      <WeatherCard now={new Date('2026-11-17T10:00:00Z')} ipmaId={COIMBRA} fetchImpl={fetchImpl} />,
    );
    expect(await screen.findByText('Céu pouco nublado')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Próximos dias' })).not.toBeInTheDocument();
    expect(screen.getByText('Fonte: IPMA · atualizado a 15/11 às 08:30')).toBeInTheDocument();
  });

  it('says the forecast is unavailable when there is nothing to show', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline'));
    render(<WeatherCard now={NOV_15} ipmaId={COIMBRA} fetchImpl={fetchImpl} />);
    expect(screen.getByText('A carregar a previsão…')).toBeInTheDocument();
    expect(await screen.findByText(/Previsão indisponível/)).toBeInTheDocument();
    expect(screen.getByText('Fonte: IPMA')).toBeInTheDocument();
  });

  it('shows dashes for missing rain and wind, and translates to English', async () => {
    const json = {
      data: [{ forecastDate: '2026-11-15', tMin: '2', tMax: '9', idWeatherType: 22 }],
    };
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(json));
    render(<WeatherCard now={NOV_15} ipmaId={COIMBRA} fetchImpl={fetchImpl} />);
    expect(await screen.findByText('Geada')).toBeInTheDocument();
    expect(fact('Probabilidade de chuva')).toBe('—');
    expect(fact('Vento')).toBe('—');

    await act(() => i18n.changeLanguage('en'));
    expect(screen.getByText('Frost')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Weather' })).toBeInTheDocument();
  });
});
