/** Trimmed copies of real answers (2026-11-18), for the sea tests. */

const ipmaDay = (date: string, waveHighMax: string) => ({
  owner: 'IPMA',
  country: 'PT',
  forecastDate: date,
  dataUpdate: `${date}T09:31:02`,
  data: [
    {
      globalIdLocal: 1060526,
      waveHighMin: '3.9',
      waveHighMax,
      wavePeriodMin: '9.4', // IPMA sometimes swaps min and max
      wavePeriodMax: '8.8',
      predWaveDir: 'NW',
      totalSeaMin: 5,
      totalSeaMax: 5.5,
      sstMin: '17.2',
      sstMax: '17.4',
      latitude: '40.1417',
      longitude: '-8.8783',
    },
    { globalIdLocal: 1111026, waveHighMin: '3.6', waveHighMax: '4.1', predWaveDir: 'NW' },
  ],
});

export const IPMA_SEA_DAYS_JSON = [
  ipmaDay('2026-11-18', '5.3'),
  ipmaDay('2026-11-19', '5.6'),
  ipmaDay('2026-11-20', '4.2'),
];

const times = ['2026-11-18', '2026-11-19'].flatMap((d) =>
  Array.from({ length: 24 }, (_, h) => `${d}T${String(h).padStart(2, '0')}:00`),
);

export const MARINE_JSON = {
  latitude: 40.125,
  longitude: -8.875,
  hourly: {
    time: times,
    wave_height: times.map((_, i) => 3.5 + (i % 24) / 20),
    wave_period: times.map(() => 9.2),
    wave_direction: times.map(() => 315),
    swell_wave_height: times.map(() => 3.1),
    swell_wave_period: times.map(() => 11.4),
    sea_surface_temperature: times.map(() => 17.3),
  },
};

export const WIND_JSON = {
  hourly: {
    time: times,
    wind_speed_10m: times.map((_, i) => 20 + (i % 24)),
    wind_gusts_10m: times.map((_, i) => 35 + (i % 24)),
    wind_direction_10m: times.map(() => 330),
  },
};

export const WARNINGS_JSON = [
  {
    text: 'Ondas de noroeste com 5 a 6 metros, com altura máxima até 10 metros.',
    awarenessTypeName: 'Agitação Marítima',
    idAreaAviso: 'CBR',
    startTime: '2026-11-18T18:00:00',
    awarenessLevelID: 'orange',
    endTime: '2026-11-20T00:00:00',
  },
  {
    text: 'Ondas de noroeste com 4 a 5 metros.',
    awarenessTypeName: 'Agitação Marítima',
    idAreaAviso: 'CBR',
    startTime: '2026-11-18T07:19:00',
    awarenessLevelID: 'yellow',
    endTime: '2026-11-18T18:00:00',
  },
  {
    text: '',
    awarenessTypeName: 'Agitação Marítima',
    idAreaAviso: 'CBR',
    startTime: '2026-11-20T00:00:00',
    awarenessLevelID: 'green',
    endTime: '2026-11-21T00:00:00',
  },
  {
    text: 'Ondas de noroeste com 4 a 5 metros.',
    awarenessTypeName: 'Agitação Marítima',
    idAreaAviso: 'FAR',
    startTime: '2026-11-18T12:00:00',
    awarenessLevelID: 'yellow',
    endTime: '2026-11-20T09:00:00',
  },
  {
    text: 'Vento forte.',
    awarenessTypeName: 'Vento',
    idAreaAviso: 'CBR',
    startTime: '2026-11-18T12:00:00',
    awarenessLevelID: 'yellow',
    endTime: '2026-11-19T09:00:00',
  },
];

/** A fetch answering every sea request from the fixtures. */
export function fakeSeaFetch(): typeof fetch {
  return ((input: RequestInfo | URL) => {
    // Matched on the parsed host and path, never on a substring of the whole URL.
    const { hostname, pathname } = new URL(String(input));
    const json =
      hostname === 'marine-api.open-meteo.com'
        ? MARINE_JSON
        : hostname === 'api.open-meteo.com'
          ? WIND_JSON
          : pathname.endsWith('/warnings_www.json')
            ? WARNINGS_JSON
            : IPMA_SEA_DAYS_JSON[Number(/day(\d)\.json$/.exec(pathname)?.[1] ?? 0)];
    return Promise.resolve(new Response(JSON.stringify(json), { status: 200 }));
  }) as typeof fetch;
}
