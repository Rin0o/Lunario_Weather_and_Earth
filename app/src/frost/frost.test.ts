import { describe, expect, it, vi } from 'vitest';
import { openMeteoJson } from './fixtures.ts';
import { frostForecastUrl, frostRisk, parseFrostForecast, requestFrostJson } from './frost.ts';

describe('frost risk (Q-07 thresholds)', () => {
  it('is frost when the surface reaches 0 °C', () => {
    expect(frostRisk(4, 0)).toBe('frost');
    expect(frostRisk(5, -2)).toBe('frost');
  });

  it('is possible when the air reaches 3 °C', () => {
    expect(frostRisk(3, 0.5)).toBe('possible');
    expect(frostRisk(2, null)).toBe('possible');
  });

  it('is none above both thresholds', () => {
    expect(frostRisk(3.1, 0.1)).toBe('none');
  });
});

describe('Open-Meteo request', () => {
  it('asks for five days of hourly air and surface temperature, with rounded coordinates', () => {
    const url = new URL(frostForecastUrl(40.20331, -8.41029));
    expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      latitude: '40.2',
      longitude: '-8.41',
      hourly: 'temperature_2m,soil_temperature_0cm',
      timezone: 'Europe/Lisbon',
      forecast_days: '5',
    });
  });

  it('fails on an error response', async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(new Response('', { status: 429 })));
    await expect(requestFrostJson(40, -8, fetchImpl)).rejects.toThrow('Open-Meteo responded 429');
  });
});

describe('parseFrostForecast', () => {
  it('takes the lowest air and surface temperature of each day', () => {
    const json = openMeteoJson([
      { date: '2026-11-17', air: 1.4, surface: -1.2 },
      { date: '2026-11-18', air: 2.5, surface: 0.8 },
      { date: '2026-11-19', air: 8, surface: 6 },
    ]);
    expect(parseFrostForecast(json)).toEqual([
      { date: '2026-11-17', minAir: 1.4, minSurface: -1.2, risk: 'frost' },
      { date: '2026-11-18', minAir: 2.5, minSurface: 0.8, risk: 'possible' },
      { date: '2026-11-19', minAir: 8, minSurface: 6, risk: 'none' },
    ]);
  });

  it('copes with missing surface values and bad entries', () => {
    const json = openMeteoJson([{ date: '2026-11-17', air: 2, surface: null }]);
    json.hourly.time.push('not a time');
    expect(parseFrostForecast(json)).toEqual([
      { date: '2026-11-17', minAir: 2, minSurface: null, risk: 'possible' },
    ]);
    expect(
      parseFrostForecast({ hourly: { time: ['2026-11-17T00:00'], temperature_2m: [null] } }),
    ).toEqual([]);
  });

  it('returns nothing for something that is not a forecast', () => {
    expect(parseFrostForecast(null)).toEqual([]);
    expect(parseFrostForecast({ error: true })).toEqual([]);
    expect(parseFrostForecast({ hourly: { time: [], temperature_2m: 'x' } })).toEqual([]);
  });
});
