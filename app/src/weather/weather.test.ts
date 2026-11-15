import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { COIMBRA_FORECAST_JSON, jsonResponse } from './fixtures.ts';
import { parseForecast, requestForecastJson } from './ipma.ts';
import { useForecast } from './useForecast.ts';

const COIMBRA = 1060300;
const NOV_15 = new Date('2026-11-15T10:00:00Z');

describe('parseForecast', () => {
  it('parses IPMA days into typed values', () => {
    const { days } = parseForecast(COIMBRA_FORECAST_JSON, COIMBRA);
    expect(days).toHaveLength(3);
    expect(days[0]).toEqual({
      date: '2026-11-15',
      tMin: 13.6,
      tMax: 19,
      rainProbability: 100,
      weatherType: 6,
      windDirection: 'S',
      windClass: 1,
    });
    expect(days[2]?.windDirection).toBe('NW');
  });

  it('skips unusable days and normalises missing values', () => {
    const { days } = parseForecast(
      {
        data: [
          { forecastDate: 'bad', tMin: '1', tMax: '2', idWeatherType: 1 },
          { forecastDate: '2026-11-15', tMin: 'x', tMax: '2', idWeatherType: 1 },
          null,
          {
            forecastDate: '2026-11-16',
            tMin: 3,
            tMax: 9,
            idWeatherType: 22,
            precipitaProb: '-99.0',
            predWindDir: 'nne',
            classWindSpeed: -99,
          },
        ],
      },
      COIMBRA,
    );
    expect(days).toEqual([
      {
        date: '2026-11-16',
        tMin: 3,
        tMax: 9,
        rainProbability: null,
        weatherType: 22,
        windDirection: null,
        windClass: null,
      },
    ]);
  });

  it('throws when nothing is usable', () => {
    expect(() => parseForecast({ data: [] }, COIMBRA)).toThrow('no usable days');
    expect(() => parseForecast(null, COIMBRA)).toThrow('no usable days');
  });
});

describe('requestForecastJson', () => {
  it('requests the location forecast and rejects HTTP errors', async () => {
    const ok = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(COIMBRA_FORECAST_JSON));
    await expect(requestForecastJson(COIMBRA, ok)).resolves.toEqual(COIMBRA_FORECAST_JSON);
    expect(ok).toHaveBeenCalledWith(
      'https://api.ipma.pt/open-data/forecast/meteorology/cities/daily/1060300.json',
      { cache: 'no-cache' },
    );

    const failing = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}, 503));
    await expect(requestForecastJson(COIMBRA, failing)).rejects.toThrow('503');
  });
});

describe('useForecast', () => {
  it('downloads, caches and shows days from today', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(COIMBRA_FORECAST_JSON));
    const day2 = new Date('2026-11-16T10:00:00Z');
    const { result } = renderHook(() => useForecast(COIMBRA, day2, fetchImpl));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.offline).toBe(false);
    expect(result.current.forecast?.days.map((d) => d.date)).toEqual(['2026-11-16', '2026-11-17']);
    expect(result.current.fetchedAt).toBeInstanceOf(Date);
    expect(localStorage.getItem('lunario.forecast.1060300')).toContain('2026-11-15');
  });

  it('shows the saved forecast, flagged offline, when the network fails', async () => {
    const savedAt = '2026-11-15T08:30:00.000Z';
    localStorage.setItem(
      'lunario.forecast.1060300',
      JSON.stringify({ fetchedAt: savedAt, json: COIMBRA_FORECAST_JSON }),
    );
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useForecast(COIMBRA, NOV_15, fetchImpl));

    // The saved forecast is available immediately, before the network answers.
    expect(result.current.forecast?.days).toHaveLength(3);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.offline).toBe(true);
    expect(result.current.forecast?.days).toHaveLength(3);
    expect(result.current.fetchedAt?.toISOString()).toBe(savedAt);
  });

  it('has nothing to show offline without a saved forecast, or once it is out of date', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline'));
    const { result } = renderHook(() => useForecast(COIMBRA, NOV_15, fetchImpl));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.forecast).toBeNull();
    expect(result.current.offline).toBe(true);

    localStorage.setItem(
      'lunario.forecast.1060300',
      JSON.stringify({ fetchedAt: '2026-11-15T08:30:00Z', json: COIMBRA_FORECAST_JSON }),
    );
    const later = renderHook(() =>
      useForecast(COIMBRA, new Date('2026-11-20T10:00:00Z'), fetchImpl),
    );
    await waitFor(() => expect(later.result.current.loading).toBe(false));
    expect(later.result.current.forecast).toBeNull();
    expect(later.result.current.fetchedAt).toBeNull();
  });

  it('ignores a corrupt cache', async () => {
    localStorage.setItem('lunario.forecast.1060300', '{not json');
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline'));
    const { result } = renderHook(() => useForecast(COIMBRA, NOV_15, fetchImpl));
    expect(result.current.forecast).toBeNull();
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('fetches again when the location changes, without showing the old forecast', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(COIMBRA_FORECAST_JSON));
    const { result, rerender } = renderHook(({ id }) => useForecast(id, NOV_15, fetchImpl), {
      initialProps: { id: COIMBRA },
    });
    await waitFor(() => expect(result.current.forecast).not.toBeNull());

    fetchImpl.mockReturnValueOnce(new Promise(() => undefined)); // Guarda never answers
    rerender({ id: 1090700 });
    expect(result.current.forecast).toBeNull();
    expect(fetchImpl).toHaveBeenLastCalledWith(
      expect.stringContaining('/1090700.json'),
      expect.anything(),
    );
  });
});
