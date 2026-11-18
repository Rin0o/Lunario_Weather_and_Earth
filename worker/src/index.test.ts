// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import worker, {
  FROST_CRON,
  handleQueue,
  handleRequest,
  handleScheduled,
  originAllowed,
  type Env,
} from './index.ts';
import { pushJob, type PushJob } from './push.ts';
import { D1Store } from './store.ts';
import { BODY, BOTH_BODY } from './subscription.test.ts';
import { fakeD1 } from './test/fakeD1.ts';
import { fakeQueue } from './test/fakes.ts';

const ORIGIN = 'https://lunario-4w2.pages.dev';
const env = (queue = fakeQueue().queue): Env => ({
  DB: fakeD1(),
  PUSH_QUEUE: queue as unknown as Env['PUSH_QUEUE'],
  VAPID_PUBLIC_KEY: '',
  VAPID_PRIVATE_KEY: '',
  ALLOWED_ORIGINS: `${ORIGIN},https://*.lunario-4w2.pages.dev`,
  ADMIN_CONTACT: ORIGIN,
});

const request = (method: string, body?: unknown, origin = ORIGIN, path = '/subscriptions') =>
  new Request(`https://lunario-alerts.example.workers.dev${path}`, {
    method,
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('originAllowed', () => {
  const allowed = 'https://lunario-4w2.pages.dev,https://*.lunario-4w2.pages.dev';
  it('accepts the app and its previews only', () => {
    expect(originAllowed('https://lunario-4w2.pages.dev', allowed)).toBe(true);
    expect(originAllowed('https://feat-x.lunario-4w2.pages.dev', allowed)).toBe(true);
    expect(originAllowed('https://evil.example', allowed)).toBe(false);
    expect(originAllowed('https://lunario-4w2.pages.dev.evil.example', allowed)).toBe(false);
    expect(originAllowed('http://feat-x.lunario-4w2.pages.dev', allowed)).toBe(false);
    expect(originAllowed(null, allowed)).toBe(false);
  });
});

describe('subscriptions API', () => {
  it('saves a subscription, updates it, and deletes it', async () => {
    const e = env();
    const store = new D1Store(e.DB);
    const now = new Date('2026-11-17T10:00:00Z');

    const created = await handleRequest(request('POST', BODY), e, now);
    expect(created.status).toBe(204);
    expect(created.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    expect(await store.list()).toEqual([
      expect.objectContaining({
        frost: { latitude: 40.54, longitude: -7.27, crops: ['Tomate', 'Feijão-verde'] },
        sea: null,
      }),
    ]);

    // Sea alerts added, then frost alerts turned off: the location is gone from the server.
    await handleRequest(request('POST', BOTH_BODY), e, now);
    expect(await store.list()).toEqual([
      expect.objectContaining({ sea: { area: 'AVR', yellow: false } }),
    ]);
    await handleRequest(
      request('POST', {
        ...BOTH_BODY,
        frost: null,
        sea: { area: 'AVR', yellow: true },
        language: 'en',
      }),
      e,
      now,
    );
    expect(await store.list()).toEqual([
      expect.objectContaining({ frost: null, sea: { area: 'AVR', yellow: true }, language: 'en' }),
    ]);
    expect(await store.count()).toBe(1);

    const deleted = await handleRequest(
      request('DELETE', { endpoint: BODY.subscription.endpoint }),
      e,
      now,
    );
    expect(deleted.status).toBe(204);
    expect(await store.count()).toBe(0);
  });

  it('answers the CORS preflight for the app', async () => {
    const res = await handleRequest(request('OPTIONS'), env());
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('POST, DELETE, OPTIONS');
  });

  it('refuses other origins, paths, methods and bad bodies', async () => {
    expect((await handleRequest(request('POST', BODY, 'https://evil.example'), env())).status).toBe(
      403,
    );
    expect((await handleRequest(request('POST', BODY, ORIGIN, '/other'), env())).status).toBe(404);
    expect((await handleRequest(request('PUT', BODY), env())).status).toBe(405);
    expect((await handleRequest(request('POST', 'not json'), env())).status).toBe(400);
    expect((await handleRequest(request('POST', 'x'.repeat(5000)), env())).status).toBe(400);
    const invalid = await handleRequest(request('POST', { ...BODY, language: 'fr' }), env());
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({ error: 'language must be one of pt-PT, en' });
    expect((await handleRequest(request('DELETE', {}), env())).status).toBe(400);
  });

  it('refuses new subscriptions when full, but still updates existing ones', async () => {
    const e = env();
    await handleRequest(request('POST', BODY), e);
    vi.spyOn(D1Store.prototype, 'count').mockResolvedValue(5000);
    const other = {
      ...BODY,
      subscription: { ...BODY.subscription, endpoint: 'https://push.example/new' },
    };
    expect((await handleRequest(request('POST', other), e)).status).toBe(503);
    expect((await handleRequest(request('POST', BODY), e)).status).toBe(204);
  });
});

describe('test notification', () => {
  const endpoint = BODY.subscription.endpoint;
  const sender = (status: number | Error) => ({
    send: vi.fn(() => (status instanceof Error ? Promise.reject(status) : Promise.resolve(status))),
  });
  const test = (e: Env, s: ReturnType<typeof sender>, body: unknown = { endpoint }) =>
    handleRequest(request('POST', body, ORIGIN, '/subscriptions/test'), e, new Date(), s);

  it('sends a test in the subscriber language, to saved subscriptions only', async () => {
    const e = env();
    const ok = sender(201);
    expect((await test(e, ok)).status).toBe(404);
    expect(ok.send).not.toHaveBeenCalled();

    await handleRequest(request('POST', { ...BODY, language: 'en' }), e);
    const res = await test(e, ok);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    expect(ok.send).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint,
        message: expect.objectContaining({ title: '🧪 Alerts test', tag: 'alerts-test' }),
      }),
    );
  });

  it('refuses other origins, methods and bodies', async () => {
    const e = env();
    const ok = sender(201);
    const other = request('POST', { endpoint }, 'https://evil.example', '/subscriptions/test');
    expect((await handleRequest(other, e, new Date(), ok)).status).toBe(403);
    const get = request('PUT', { endpoint }, ORIGIN, '/subscriptions/test');
    expect((await handleRequest(get, e, new Date(), ok)).status).toBe(405);
    expect((await test(e, ok, {})).status).toBe(400);
    expect(ok.send).not.toHaveBeenCalled();
  });

  it('deletes an expired subscription and reports push failures', async () => {
    const e = env();
    const store = new D1Store(e.DB);
    await handleRequest(request('POST', BODY), e);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const refused = await test(e, sender(401));
    expect(refused.status).toBe(502);
    expect(await refused.json()).toEqual({ error: 'push service refused', status: 401 });
    expect(log).toHaveBeenCalledWith(JSON.stringify({ job: 'test-alert', status: 401 }));
    expect((await test(e, sender(new Error('network')))).status).toBe(502);
    expect(await store.count()).toBe(1);
    expect((await test(e, sender(410))).status).toBe(410);
    expect(await store.count()).toBe(0);
  });
});

describe('scheduled', () => {
  const run = (cron: string, iso: string, e = env()) =>
    worker.scheduled({ scheduledTime: Date.parse(iso), cron, noRetry: vi.fn() }, e);

  it('runs the frost check on its cron and logs counts only', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await run(FROST_CRON, '2026-11-17T18:00:00Z');
    expect(log).toHaveBeenCalledWith(
      JSON.stringify({ job: 'frost-alerts', places: 0, alerts: 0, messages: 0 }),
    );
  });

  it('runs the sea check on the other cron, only at the right local hour', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const sea = '0 7,8,11,12,15,16,19,20 * * *';
    await run(sea, '2026-11-18T07:00:00Z'); // 07:00 in winter: the summer slot, skipped
    expect(log).not.toHaveBeenCalled();
    await run(sea, '2026-11-18T08:00:00Z');
    expect(log).toHaveBeenCalledWith(
      JSON.stringify({ job: 'sea-alerts', areas: 0, warnings: 0, alerts: 0, messages: 0 }),
    );
  });

  it('queues the sea alerts of the subscribers', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const { queue, jobs } = fakeQueue();
    const e = env(queue);
    await handleRequest(request('POST', BOTH_BODY), e);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            text: '',
            awarenessTypeName: 'Agitação Marítima',
            idAreaAviso: 'AVR',
            startTime: '2026-11-18T12:00:00',
            awarenessLevelID: 'red',
            endTime: '2026-11-19T00:00:00',
          },
        ]),
      ),
    );
    await handleScheduled('0 7,8,11,12,15,16,19,20 * * *', e, new Date('2026-11-18T08:00:00Z'));
    expect(jobs().map((j) => j.message.title)).toEqual(['🔴 Aviso vermelho de agitação marítima']);
  });
});

describe('queue', () => {
  it('sends each batch, acknowledges it whatever happened, and drops dead subscriptions', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const e = env();
    const store = new D1Store(e.DB);
    await handleRequest(request('POST', BODY), e);
    const message = { title: 't', body: 'b', tag: 'x', url: '/' };
    const body: PushJob[] = [
      pushJob(
        { endpoint: 'https://push.example/other', p256dh: 'p', auth: 'a' },
        message,
        'sea',
        60,
      ),
      pushJob({ endpoint: BODY.subscription.endpoint, p256dh: 'p', auth: 'a' }, message, 'sea', 60),
    ];
    const ack = vi.fn();
    const send = vi.fn((job: PushJob) =>
      Promise.resolve(job.endpoint === BODY.subscription.endpoint ? 410 : 201),
    );
    await handleQueue({ messages: [{ body, ack }] } as unknown as MessageBatch<PushJob[]>, e, {
      send,
    });
    expect(send).toHaveBeenCalledTimes(2);
    expect(ack).toHaveBeenCalledTimes(1);
    expect(await store.count()).toBe(0);
    expect(log).toHaveBeenCalledWith(
      JSON.stringify({ job: 'push-batch', sent: 1, removed: 1, failed: 0 }),
    );
  });
});
