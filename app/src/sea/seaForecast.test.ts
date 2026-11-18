import { describe, expect, it } from 'vitest';
import {
  IPMA_SEA_DAYS_JSON,
  MARINE_JSON,
  WARNINGS_JSON,
  WIND_JSON,
  fakeSeaFetch,
} from './fixtures.ts';
import { beaufort, formatRange } from './format.ts';
import {
  compassOf,
  marineUrl,
  parseIpmaSeaDay,
  parseSea,
  parseSeaHours,
  parseSeaWarnings,
  requestSeaJson,
  windUrl,
} from './seaForecast.ts';

const FIGUEIRA = 1060526;

describe('IPMA sea forecast', () => {
  it('reads one coastal point, keeping the ranges in order', () => {
    expect(parseIpmaSeaDay(IPMA_SEA_DAYS_JSON[0], FIGUEIRA)).toEqual({
      date: '2026-11-18',
      waveHeight: { min: 3.9, max: 5.3 },
      wavePeriod: { min: 8.8, max: 9.4 },
      waveDirection: 'NW',
      totalSea: { min: 5, max: 5.5 },
      water: { min: 17.2, max: 17.4 },
    });
  });

  it('returns null for a missing point or a broken file', () => {
    expect(parseIpmaSeaDay(IPMA_SEA_DAYS_JSON[0], 999)).toBeNull();
    expect(parseIpmaSeaDay({ data: 'nope' }, FIGUEIRA)).toBeNull();
    expect(parseIpmaSeaDay(null, FIGUEIRA)).toBeNull();
  });
});

describe('Open-Meteo sea hours', () => {
  it('joins the waves and the wind by hour', () => {
    const hours = parseSeaHours(MARINE_JSON, WIND_JSON);
    expect(hours).toHaveLength(48);
    expect(hours[0]).toEqual({
      time: '2026-11-18T00:00',
      waveHeight: 3.5,
      wavePeriod: 9.2,
      waveDirection: 315,
      swellHeight: 3.1,
      swellPeriod: 11.4,
      water: 17.3,
      wind: 20,
      gusts: 35,
      windDirection: 330,
    });
  });

  it('works without the wind', () => {
    expect(parseSeaHours(MARINE_JSON, null)[0]?.wind).toBeNull();
    expect(parseSeaHours(null, WIND_JSON)).toEqual([]);
  });

  it('asks for rounded coordinates, local times and the sea cell', () => {
    const marine = new URL(marineUrl(40.14171, -8.87834));
    expect(marine.searchParams.get('latitude')).toBe('40.14');
    expect(marine.searchParams.get('cell_selection')).toBe('sea');
    expect(marine.searchParams.get('timezone')).toBe('Europe/Lisbon');
    expect(new URL(windUrl(40.14171, -8.87834)).searchParams.get('wind_speed_unit')).toBe('kmh');
  });
});

describe('sea days', () => {
  it('puts IPMA and Open-Meteo together, with the days IPMA covers alone', () => {
    const days = parseSea(
      { marine: MARINE_JSON, wind: WIND_JSON, ipma: IPMA_SEA_DAYS_JSON, warnings: [] },
      FIGUEIRA,
    );
    expect(days.map((d) => d.date)).toEqual(['2026-11-18', '2026-11-19', '2026-11-20']);
    expect(days[0]?.ipma?.waveHeight).toEqual({ min: 3.9, max: 5.3 });
    expect(days[0]?.wind).toEqual({ min: 20, max: 43 });
    expect(days[0]?.gusts).toBe(58);
    expect(days[2]?.hours).toEqual([]);
    expect(days[2]?.ipma?.waveHeight?.max).toBe(4.2);
  });

  it('downloads everything, and survives the optional sources failing', async () => {
    const json = await requestSeaJson(40.14, -8.88, fakeSeaFetch());
    expect(json.ipma).toHaveLength(3);
    const failing = ((input: RequestInfo | URL) =>
      String(input).includes('marine-api')
        ? fakeSeaFetch()(input)
        : Promise.resolve(new Response('', { status: 500 }))) as typeof fetch;
    const partial = await requestSeaJson(40.14, -8.88, failing);
    expect(partial.wind).toBeNull();
    expect(partial.ipma).toEqual([null, null, null]);
  });

  it('fails when the Marine API fails', async () => {
    const down = (() => Promise.resolve(new Response('', { status: 503 }))) as typeof fetch;
    await expect(requestSeaJson(40.14, -8.88, down)).rejects.toThrow('503');
  });
});

describe('sea warnings', () => {
  it('keeps the district’s sea agitation warnings that have not ended, in order', () => {
    const warnings = parseSeaWarnings(WARNINGS_JSON, 'CBR', '2026-11-18T10:00');
    expect(warnings.map((w) => w.level)).toEqual(['yellow', 'orange']);
    expect(parseSeaWarnings(WARNINGS_JSON, 'CBR', '2026-11-18T19:00').map((w) => w.level)).toEqual([
      'orange',
    ]);
    expect(parseSeaWarnings(WARNINGS_JSON, 'VCT', '2026-11-18T10:00')).toEqual([]);
    expect(parseSeaWarnings('nope', 'CBR', '2026-11-18T10:00')).toEqual([]);
  });
});

describe('sea formats', () => {
  it('names the compass point of a bearing', () => {
    expect(compassOf(0)).toBe('N');
    expect(compassOf(315)).toBe('NW');
    expect(compassOf(337)).toBe('NW');
    expect(compassOf(338)).toBe('N');
    expect(compassOf(-45)).toBe('NW');
  });

  it('gives the Beaufort force of a wind', () => {
    expect(beaufort(0)).toBe(0);
    expect(beaufort(25)).toBe(4);
    expect(beaufort(62)).toBe(8);
    expect(beaufort(130)).toBe(12);
  });

  it('prints ranges with the language’s decimal mark', () => {
    expect(formatRange({ min: 1.5, max: 2 }, 'pt-PT')).toBe('1,5–2,0');
    expect(formatRange({ min: 1.5, max: 2 }, 'en')).toBe('1.5–2.0');
    expect(formatRange({ min: 2.01, max: 2.04 }, 'en')).toBe('2.0');
  });
});
