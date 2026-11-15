/** Shape of a real IPMA response (Coimbra, 2026-11-15), trimmed to three days. */
export const COIMBRA_FORECAST_JSON = {
  owner: 'IPMA',
  country: 'PT',
  data: [
    {
      precipitaProb: '100.0',
      tMin: '13.6',
      tMax: '19.0',
      predWindDir: 'S',
      idWeatherType: 6,
      classWindSpeed: 1,
      longitude: '-8.4194',
      forecastDate: '2026-11-15',
      classPrecInt: 2,
      latitude: '40.2081',
    },
    {
      precipitaProb: '100.0',
      tMin: '14.7',
      tMax: '18.5',
      predWindDir: 'S',
      idWeatherType: 9,
      classWindSpeed: 2,
      longitude: '-8.4194',
      forecastDate: '2026-11-16',
      classPrecInt: 2,
      latitude: '40.2081',
    },
    {
      precipitaProb: '4.0',
      tMin: '9.1',
      tMax: '16.2',
      predWindDir: 'NW',
      idWeatherType: 2,
      classWindSpeed: 1,
      longitude: '-8.4194',
      forecastDate: '2026-11-17',
      latitude: '40.2081',
    },
  ],
  globalIdLocal: 1060300,
  dataUpdate: '2026-11-15T11:31:02',
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
