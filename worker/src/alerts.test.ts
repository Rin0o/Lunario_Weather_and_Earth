// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import {
  alertFor,
  distinctPlaces,
  forecastsFrom,
  forecastUrl,
  runAlerts,
  tonight,
  type Sender,
  type Store,
} from './alerts.ts';
import type { Subscription } from './subscription.ts';

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

const sub = (
  n: number,
  latitude: number,
  longitude: number,
  extra: Partial<Subscription> = {},
) => ({
  endpoint: `https://push.example/${n}`,
  p256dh: 'p',
  auth: 'a',
  latitude,
  longitude,
  crops: [],
  language: 'pt-PT' as const,
  ...extra,
});

describe('alerts', () => {
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
      sub(1, 40.54, -7.27),
      sub(2, 40.54, -7.27),
      sub(3, 41.74, -7.47),
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
    });
    expect(
      alertFor(
        { minAir: 2.6, minSurface: null, risk: 'possible' },
        { crops: [], language: 'en' },
        '2026-11-17',
      ),
    ).toEqual({
      title: '❄️ Frost possible tonight',
      body: 'Forecast lows: air 3 °C, ground —.',
      tag: 'frost-2026-11-17',
    });
    expect(
      alertFor(
        { minAir: 8, minSurface: 5, risk: 'none' },
        { crops: [], language: 'en' },
        '2026-11-17',
      ),
    ).toBeNull();
  });

  it('notifies only the subscribers at risk, and deletes those the push service dropped', async () => {
    const subs = [
      sub(1, 40.54, -7.27, { crops: ['Tomate'] }), // Guarda: frost
      sub(2, 40.54, -7.27), // Guarda: frost, but gone from the push service
      sub(3, 38.71, -9.14), // Lisbon: mild
      sub(4, 41.74, -7.47), // Chaves: frost, push service error
    ];
    const store: Store = {
      list: () => Promise.resolve(subs),
      remove: vi.fn(() => Promise.resolve()),
    };
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify([forecast(1, -2), forecast(9, 7), forecast(0, -4)])),
      ),
    );
    const sent: string[] = [];
    const sender: Sender = {
      send: (s, message) => {
        sent.push(`${s.endpoint} ${message.body}`);
        return Promise.resolve({ 1: 201, 2: 410, 4: 500 }[Number(s.endpoint.at(-1))] ?? 201);
      },
    };

    const result = await runAlerts(store, sender, NOW, fetchImpl);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ places: 3, sent: 1, removed: 1, failed: 1 });
    expect(store.remove).toHaveBeenCalledWith('https://push.example/2');
    expect(sent).toEqual([
      'https://push.example/1 Mínimas previstas: ar 1 °C, superfície -2 °C. Proteja: Tomate.',
      'https://push.example/2 Mínimas previstas: ar 1 °C, superfície -2 °C.',
      'https://push.example/4 Mínimas previstas: ar 0 °C, superfície -4 °C.',
    ]);
  });

  it('counts a send that throws as failed and carries on', async () => {
    const store: Store = {
      list: () => Promise.resolve([sub(1, 40.54, -7.27), sub(2, 40.54, -7.27)]),
      remove: vi.fn(() => Promise.resolve()),
    };
    const fetchImpl = vi.fn(() => Promise.resolve(new Response(JSON.stringify(forecast(1, -2)))));
    let calls = 0;
    const sender: Sender = {
      send: () => (++calls === 1 ? Promise.reject(new Error('network')) : Promise.resolve(201)),
    };
    expect(await runAlerts(store, sender, NOW, fetchImpl)).toEqual({
      places: 1,
      sent: 1,
      removed: 0,
      failed: 1,
    });
  });

  it('fails the run when Open-Meteo fails, so the cron reports it', async () => {
    const store: Store = { list: () => Promise.resolve([sub(1, 40.54, -7.27)]), remove: vi.fn() };
    const fetchImpl = vi.fn(() => Promise.resolve(new Response('', { status: 503 })));
    await expect(runAlerts(store, { send: vi.fn() }, NOW, fetchImpl)).rejects.toThrow(
      'Open-Meteo responded 503',
    );
  });

  it('does nothing without subscribers', async () => {
    const fetchImpl = vi.fn();
    const store: Store = { list: () => Promise.resolve([]), remove: vi.fn() };
    expect(await runAlerts(store, { send: vi.fn() }, NOW, fetchImpl)).toEqual({
      places: 0,
      sent: 0,
      removed: 0,
      failed: 0,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
