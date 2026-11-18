// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { WARNINGS_JSON } from '../../app/src/sea/fixtures.ts';
import {
  alreadySeen,
  newWarnings,
  runSeaAlerts,
  seaAlertFor,
  seaCheckDue,
  seaTtl,
  warningFor,
  type AreaWarning,
} from './sea.ts';
import { D1Store, type SeenWarning } from './store.ts';
import { fakeD1 } from './test/fakeD1.ts';
import { fakeQueue, frostAt, sub } from './test/fakes.ts';

// Wednesday 18 November 2026, 08:00 in Lisbon (winter time = UTC).
const NOW = new Date('2026-11-18T08:00:00Z');
const NOW_LOCAL = '2026-11-18T08:00';

const ipma = (json: unknown) => vi.fn(() => Promise.resolve(new Response(JSON.stringify(json))));

const warning = (extra: Partial<AreaWarning>): AreaWarning => ({
  area: 'CBR',
  level: 'orange',
  start: '2026-11-18T18:00:00',
  end: '2026-11-20T00:00:00',
  text: '',
  ...extra,
});

describe('when the sea is checked', () => {
  it('at 08, 12, 16 and 20 h in Portugal, summer or winter, never at night', () => {
    // Winter: Lisbon is UTC.
    expect(seaCheckDue(new Date('2026-11-18T08:00:00Z'))).toBe(true);
    expect(seaCheckDue(new Date('2026-11-18T07:00:00Z'))).toBe(false);
    expect(seaCheckDue(new Date('2026-11-18T20:00:00Z'))).toBe(true);
    // Summer: Lisbon is UTC+1, so the 07:00 UTC run is the 08:00 one.
    expect(seaCheckDue(new Date('2026-07-01T07:00:00Z'))).toBe(true);
    expect(seaCheckDue(new Date('2026-07-01T08:00:00Z'))).toBe(false);
    expect(seaCheckDue(new Date('2026-07-01T19:00:00Z'))).toBe(true);
    expect(seaCheckDue(new Date('2026-07-01T20:00:00Z'))).toBe(false);
    for (const night of ['2026-11-18T23:00:00Z', '2026-11-18T03:00:00Z']) {
      expect(seaCheckDue(new Date(night))).toBe(false);
    }
  });
});

describe('which warnings are news', () => {
  const orange = warning({});

  it('reads the sea warnings of the subscribers areas only, not other kinds', () => {
    const { current, fresh } = newWarnings(WARNINGS_JSON, ['CBR', 'CBR'], NOW_LOCAL, []);
    expect(current.map((w) => `${w.area} ${w.level} ${w.start}`)).toEqual([
      'CBR yellow 2026-11-18T07:19:00',
      'CBR orange 2026-11-18T18:00:00',
    ]);
    expect(fresh).toEqual(current);
    expect(newWarnings(WARNINGS_JSON, ['CBR', 'FAR'], NOW_LOCAL, current).fresh).toEqual([
      expect.objectContaining({ area: 'FAR', level: 'yellow' }),
    ]);
  });

  it('is not news when extended, followed by a milder one, or in the same place again', () => {
    const seen = [orange];
    expect(alreadySeen(orange, seen)).toBe(true);
    expect(alreadySeen({ ...orange, end: '2026-11-20T12:00:00' }, seen)).toBe(true);
    // Yellow right after the orange, touching it.
    const after = {
      ...orange,
      level: 'yellow' as const,
      start: orange.end,
      end: '2026-11-20T09:00:00',
    };
    expect(alreadySeen(after, seen)).toBe(true);
  });

  it('is news when it turns red, in another area, or days later', () => {
    const seen = [orange];
    expect(alreadySeen({ ...orange, level: 'red' }, seen)).toBe(false);
    expect(alreadySeen({ ...orange, area: 'AVR' }, seen)).toBe(false);
    expect(
      alreadySeen({ ...orange, start: '2026-11-22T06:00:00', end: '2026-11-22T18:00:00' }, seen),
    ).toBe(false);
  });

  it('tells each subscriber the most severe warning they asked for', () => {
    const fresh = [
      warning({ level: 'yellow', start: '2026-11-18T07:19:00', end: '2026-11-18T18:00:00' }),
      warning({}),
      warning({ area: 'FAR', level: 'yellow' }),
    ];
    expect(warningFor(fresh, { area: 'CBR', yellow: false })?.level).toBe('orange');
    expect(warningFor(fresh, { area: 'CBR', yellow: true })?.level).toBe('orange');
    expect(warningFor(fresh, { area: 'FAR', yellow: false })).toBeNull();
    expect(warningFor(fresh, { area: 'FAR', yellow: true })?.level).toBe('yellow');
    expect(warningFor(fresh, { area: 'LSB', yellow: true })).toBeNull();
  });
});

describe('the notification', () => {
  const orange = warning({ text: 'Ondas de noroeste com 5 a 6 metros.' });

  it('names the level, the district and when, in the subscriber language', () => {
    expect(seaAlertFor(orange, 'pt-PT', NOW_LOCAL)).toEqual({
      title: '🟠 Aviso laranja de agitação marítima',
      body: 'Distrito de Coimbra, de hoje 18:00 a sexta 00:00. Ondas de noroeste com 5 a 6 metros.',
      tag: 'sea-CBR-orange-2026-11-18T18:00:00',
      url: '/#/mar',
    });
    // IPMA's details are only in Portuguese.
    expect(seaAlertFor(orange, 'en', NOW_LOCAL)).toMatchObject({
      title: '🟠 Orange rough sea warning',
      body: 'Coimbra district, from today 18:00 to Friday 00:00.',
    });
  });

  it('says "until" for a warning already on, and "tomorrow" for the next day', () => {
    const red = warning({
      level: 'red',
      start: '2026-11-18T06:00:00',
      end: '2026-11-19T06:00:00',
      area: 'LSB',
    });
    expect(seaAlertFor(red, 'pt-PT', NOW_LOCAL)).toMatchObject({
      title: '🔴 Aviso vermelho de agitação marítima',
      body: 'Distrito de Lisboa, até amanhã 06:00.',
    });
    expect(seaAlertFor({ ...red, level: 'yellow' }, 'en', NOW_LOCAL).body).toBe(
      'Lisboa district, until tomorrow 06:00.',
    );
  });

  it('is kept by the push service until the warning ends, between 1 and 24 hours', () => {
    expect(seaTtl(warning({ end: '2026-11-18T18:00:00' }), NOW_LOCAL)).toBe(10 * 3600);
    expect(seaTtl(warning({}), NOW_LOCAL)).toBe(24 * 3600);
    expect(seaTtl(warning({ end: '2026-11-18T08:10:00' }), NOW_LOCAL)).toBe(3600);
  });
});

describe('runSeaAlerts', () => {
  async function setup() {
    const store = new D1Store(fakeD1());
    const at = new Date('2026-11-17T10:00:00Z');
    await store.save(sub(1, { sea: { area: 'CBR', yellow: false } }), at);
    await store.save(sub(2, { sea: { area: 'CBR', yellow: true }, language: 'en' }), at);
    await store.save(sub(3, { sea: { area: 'FAR', yellow: false } }), at);
    await store.save(sub(4, { frost: frostAt(40.54, -7.27) }), at);
    return store;
  }

  it('notifies each new warning once, to the subscribers of that area', async () => {
    const store = await setup();
    const { queue, jobs } = fakeQueue();

    const first = await runSeaAlerts(store, queue, NOW, ipma(WARNINGS_JSON));
    expect(first).toEqual({ areas: 2, warnings: 3, alerts: 2, messages: 1 });
    expect(jobs().map((j) => [j.endpoint, j.message.title, j.topic])).toEqual([
      ['https://push.example/1', '🟠 Aviso laranja de agitação marítima', 'sea'],
      ['https://push.example/2', '🟠 Orange rough sea warning', 'sea'],
    ]);
    expect(await store.listSeen()).toHaveLength(3);

    // Four hours later, the same warnings: nothing to say.
    const later = new Date('2026-11-18T12:00:00Z');
    expect(await runSeaAlerts(store, queue, later, ipma(WARNINGS_JSON))).toMatchObject({
      warnings: 0,
      alerts: 0,
      messages: 0,
    });

    // IPMA raises Coimbra's orange to red: everyone in Coimbra hears about it.
    const raised = WARNINGS_JSON.map((w) =>
      w.awarenessLevelID === 'orange' ? { ...w, awarenessLevelID: 'red' } : w,
    );
    const red = await runSeaAlerts(store, queue, new Date('2026-11-18T16:00:00Z'), ipma(raised));
    expect(red).toMatchObject({ warnings: 1, alerts: 2 });
    expect(
      jobs()
        .slice(-2)
        .map((j) => j.message.title),
    ).toEqual(['🔴 Aviso vermelho de agitação marítima', '🔴 Red rough sea warning']);
  });

  it('forgets warnings two days after they end', async () => {
    const store = await setup();
    const { queue } = fakeQueue();
    await runSeaAlerts(store, queue, NOW, ipma(WARNINGS_JSON));
    await runSeaAlerts(store, queue, new Date('2026-11-21T08:00:00Z'), ipma([]));
    // The yellow ended on the 18th at 18:00; the others end on the 20th.
    expect((await store.listSeen()).map((w: SeenWarning) => w.level).sort()).toEqual([
      'orange',
      'yellow',
    ]);
  });

  it('does not ask IPMA when nobody has sea alerts', async () => {
    const fetchImpl = vi.fn();
    const store = new D1Store(fakeD1());
    await store.save(sub(4, { frost: frostAt(40.54, -7.27) }), NOW);
    const { queue } = fakeQueue();
    expect(await runSeaAlerts(store, queue, NOW, fetchImpl)).toEqual({
      areas: 0,
      warnings: 0,
      alerts: 0,
      messages: 0,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('fails the run when IPMA fails, and marks nothing as seen', async () => {
    const store = await setup();
    const { queue } = fakeQueue();
    const failing = vi.fn(() => Promise.resolve(new Response('', { status: 502 })));
    await expect(runSeaAlerts(store, queue, NOW, failing)).rejects.toThrow('IPMA responded 502');
    expect(await store.listSeen()).toEqual([]);
  });

  it('marks nothing as seen when the alerts cannot be queued, so the next run retries', async () => {
    const store = await setup();
    const queue = { sendBatch: vi.fn(() => Promise.reject(new Error('queue down'))) };
    await expect(runSeaAlerts(store, queue, NOW, ipma(WARNINGS_JSON))).rejects.toThrow(
      'queue down',
    );
    expect(await store.listSeen()).toEqual([]);
  });
});
