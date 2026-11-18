// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import {
  alertFor,
  distinctPlaces,
  forecastsFrom,
  forecastUrl,
  frostJobs,
  runFrostAlerts,
  tonight,
} from './frost.ts';
import { fakeQueue, frostAt, sub } from './test/fakes.ts';

// 17 November 2026, 18:00 in Lisbon (winter time = UTC).
const NOW = new Date('2026-11-17T18:00:00Z');

/** Hourly series for 17–18 November with the given lows at 06:00 on the 18th. */
function forecast(air: number, surface: number) {
  const time: string[] = [];
  const t2m: number[] = [];
  const soil: number[] = [];
  for (const day of ['2026-11-17', '2026-11-18']) {
    for (let h = 0; h < 24; h++) {
      time.push(`${day}T${String(h).padStart(2, '0')}:00`);
      const coldest = day === '2026-11-18' && h === 6;
      // A colder hour on the afternoon of the 18th must not count: it is after the night.
      const afterNight = day === '2026-11-18' && h === 14;
      t2m.push(coldest ? air : afterNight ? air - 5 : air + 6);
      soil.push(coldest ? surface : afterNight ? surface - 5 : surface + 6);
    }
  }
  return { hourly: { time, temperature_2m: t2m, soil_temperature_0cm: soil } };
}

const answer = (json: unknown) => vi.fn(() => Promise.resolve(new Response(JSON.stringify(json))));

describe('frost alerts', () => {
  it('looks at the coming night, 18:00 to 10:00 local time', () => {
    expect(tonight(NOW)).toEqual({
      from: '2026-11-17T18:00',
      to: '2026-11-18T10:00',
      date: '2026-11-17',
    });
    // Summer time: 18:00 UTC is 19:00 in Lisbon, still the same evening.
    expect(tonight(new Date('2026-07-01T18:00:00Z')).date).toBe('2026-07-01');
  });

  it('asks Open-Meteo once for each distinct place', () => {
    const places = distinctPlaces([
      frostAt(40.54, -7.27),
      frostAt(40.54, -7.27),
      frostAt(41.74, -7.47),
    ]);
    expect(places).toEqual([
      { latitude: 40.54, longitude: -7.27 },
      { latitude: 41.74, longitude: -7.47 },
    ]);
    const url = new URL(forecastUrl(places));
    expect(url.searchParams.get('latitude')).toBe('40.54,41.74');
    expect(url.searchParams.get('longitude')).toBe('-7.27,-7.47');
    expect(url.searchParams.get('forecast_days')).toBe('2');
  });

  it('reads one forecast or a list, and nothing if the count is off', () => {
    expect(forecastsFrom({ a: 1 }, 1)).toEqual([{ a: 1 }]);
    expect(forecastsFrom([1, 2], 2)).toEqual([1, 2]);
    expect(forecastsFrom([1], 2)).toEqual([]);
  });

  it('writes the alert in the subscriber language, naming the crops', () => {
    const span = { minAir: 1.2, minSurface: -2.4, risk: 'frost' as const };
    expect(
      alertFor(span, { crops: ['Tomate', 'Feijão-verde'], language: 'pt-PT' }, '2026-11-17'),
    ).toEqual({
      title: '❄️ Risco de geada esta noite',
      body: 'Mínimas previstas: ar 1 °C, superfície -2 °C. Proteja: Tomate, Feijão-verde.',
      tag: 'frost-2026-11-17',
      url: '/',
    });
    expect(
      alertFor(
        { minAir: 2.6, minSurface: null, risk: 'possible' },
        { crops: [], language: 'en' },
        '2026-11-17',
      ),
    ).toMatchObject({
      title: '❄️ Frost possible tonight',
      body: 'Forecast lows: air 3 °C, ground —.',
    });
    expect(
      alertFor(
        { minAir: 8, minSurface: 5, risk: 'none' },
        { crops: [], language: 'en' },
        '2026-11-17',
      ),
    ).toBeNull();
  });

  it('picks the frost subscribers at risk only, ignoring those with sea alerts only', async () => {
    const subs = [
      sub(1, { frost: frostAt(40.54, -7.27, ['Tomate']) }), // Guarda: frost
      sub(2, { frost: frostAt(38.71, -9.14) }), // Lisbon: mild
      sub(3, { frost: frostAt(41.74, -7.47), language: 'en' }), // Chaves: frost
      sub(4, { sea: { area: 'AVR', yellow: false } }), // no frost alerts
    ];
    const fetchImpl = answer([forecast(1, -2), forecast(9, 7), forecast(0, -4)]);
    const { places, jobs } = await frostJobs(subs, NOW, fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(places).toBe(3);
    expect(jobs.map((j) => [j.endpoint, j.message.body, j.topic, j.ttl])).toEqual([
      [
        'https://push.example/1',
        'Mínimas previstas: ar 1 °C, superfície -2 °C. Proteja: Tomate.',
        'frost',
        43200,
      ],
      ['https://push.example/3', 'Forecast lows: air 0 °C, ground -4 °C.', 'frost', 43200],
    ]);
  });

  it('queues the alerts in batches and counts them', async () => {
    const subs = Array.from({ length: 7 }, (_, i) => sub(i, { frost: frostAt(40.54, -7.27) }));
    const { queue, batches } = fakeQueue();
    const result = await runFrostAlerts(
      { list: () => Promise.resolve(subs) },
      queue,
      NOW,
      answer(forecast(1, -2)),
    );
    expect(result).toEqual({ places: 1, alerts: 7, messages: 2 });
    expect(batches).toHaveLength(1);
    expect(batches[0]?.map((m) => m.length)).toEqual([5, 2]);
  });

  it('fails the run when Open-Meteo fails, so the cron reports it', async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(new Response('', { status: 503 })));
    const { queue } = fakeQueue();
    await expect(
      runFrostAlerts(
        { list: () => Promise.resolve([sub(1, { frost: frostAt(40.54, -7.27) })]) },
        queue,
        NOW,
        fetchImpl,
      ),
    ).rejects.toThrow('Open-Meteo responded 503');
    expect(queue.sendBatch).not.toHaveBeenCalled();
  });

  it('does nothing without frost subscribers', async () => {
    const fetchImpl = vi.fn();
    const { queue } = fakeQueue();
    const store = { list: () => Promise.resolve([sub(1, { sea: { area: 'FAR', yellow: true } })]) };
    expect(await runFrostAlerts(store, queue, NOW, fetchImpl)).toEqual({
      places: 0,
      alerts: 0,
      messages: 0,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(queue.sendBatch).not.toHaveBeenCalled();
  });
});
