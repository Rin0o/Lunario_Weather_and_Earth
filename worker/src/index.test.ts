// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { generateVapidKeys } from '../../scripts/lib/vapid.ts';
import worker, { handleRequest, originAllowed, pushSender, type Env } from './index.ts';
import { D1Store } from './store.ts';
import { BODY } from './subscription.test.ts';
import { fakeD1 } from './test/fakeD1.ts';
import { decryptAes128gcm } from './test/webPushDecrypt.ts';

const ORIGIN = 'https://lunario-4w2.pages.dev';
const env = (): Env => ({
  DB: fakeD1(),
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
        latitude: 40.54,
        longitude: -7.27,
        crops: ['Tomate', 'Feijão-verde'],
      }),
    ]);

    await handleRequest(request('POST', { ...BODY, crops: [], language: 'en' }), e, now);
    expect(await store.list()).toEqual([expect.objectContaining({ crops: [], language: 'en' })]);
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
    vi.restoreAllMocks();
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
      expect.objectContaining({ endpoint }),
      expect.objectContaining({ title: '🧪 Frost alerts test', tag: 'frost-test' }),
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
    log.mockRestore();
    expect(await store.count()).toBe(1);
    expect((await test(e, sender(410))).status).toBe(410);
    expect(await store.count()).toBe(0);
  });
});

describe('push sending', () => {
  it('posts a message the browser can decrypt (RFC 8291), signed with VAPID (RFC 8292)', async () => {
    const vapid = await generateVapidKeys();
    // The subscriber's key pair and auth secret, as a browser creates them.
    const browser = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
      'deriveBits',
    ])) as CryptoKeyPair;
    const raw = new Uint8Array(
      (await crypto.subtle.exportKey('raw', browser.publicKey)) as ArrayBuffer,
    );
    const authSecret = crypto.getRandomValues(new Uint8Array(16));
    const b64url = (bytes: Uint8Array) =>
      btoa(String.fromCharCode(...bytes))
        .replaceAll('+', '-')
        .replaceAll('/', '_')
        .replace(/=+$/, '');

    const fetchImpl = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(() =>
      Promise.resolve(new Response(null, { status: 201 })),
    );
    const sender = pushSender(
      { ...env(), VAPID_PUBLIC_KEY: vapid.publicKey, VAPID_PRIVATE_KEY: vapid.privateKey },
      fetchImpl as unknown as typeof fetch,
    );
    const message = { title: '❄️ Risco de geada esta noite', body: 'Proteja: Tomate.', tag: 't' };
    const status = await sender.send(
      {
        endpoint: 'https://push.example/send/1',
        p256dh: b64url(raw),
        auth: b64url(authSecret),
        latitude: 40.54,
        longitude: -7.27,
        crops: [],
        language: 'pt-PT',
      },
      message,
    );

    expect(status).toBe(201);
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe('https://push.example/send/1');
    const headers = new Headers(init?.headers);
    expect(headers.get('Content-Encoding')).toBe('aes128gcm');
    expect(headers.get('Authorization')).toMatch(
      new RegExp(String.raw`^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=${vapid.publicKey}$`),
    );
    expect(headers.get('TTL')).toBe('43200');
    expect(headers.get('Urgency')).toBe('high');
    expect(headers.get('Topic')).toBe('frost');

    const plaintext = await decryptAes128gcm(
      new Uint8Array(init?.body as Uint8Array),
      browser.privateKey,
      raw,
      authSecret,
    );
    expect(JSON.parse(plaintext)).toEqual({ ...message, url: '/' });
  });
});

describe('push refusals', () => {
  it('logs the status and the short reason, not the endpoint', async () => {
    const vapid = await generateVapidKeys();
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const fetchImpl = vi.fn(() =>
      Promise.resolve(new Response('{"errno":109,"message":"Invalid VAPID"}', { status: 401 })),
    );
    const browser = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
      'deriveBits',
    ])) as CryptoKeyPair;
    const raw = new Uint8Array(
      (await crypto.subtle.exportKey('raw', browser.publicKey)) as ArrayBuffer,
    );
    const b64url = (bytes: Uint8Array) =>
      btoa(String.fromCharCode(...bytes))
        .replaceAll('+', '-')
        .replaceAll('/', '_')
        .replace(/=+$/, '');
    const sender = pushSender(
      { ...env(), VAPID_PUBLIC_KEY: vapid.publicKey, VAPID_PRIVATE_KEY: vapid.privateKey },
      fetchImpl as unknown as typeof fetch,
    );
    const status = await sender.send(
      {
        endpoint: 'https://push.example/secret-endpoint',
        p256dh: b64url(raw),
        auth: b64url(crypto.getRandomValues(new Uint8Array(16))),
        latitude: 40.54,
        longitude: -7.27,
        crops: [],
        language: 'pt-PT',
      },
      { title: 't', body: 'b', tag: 'x' },
    );
    expect(status).toBe(401);
    const line = String(log.mock.calls[0]?.[0]);
    expect(JSON.parse(line)).toEqual({
      job: 'push',
      status: 401,
      reason: '{"errno":109,"message":"Invalid VAPID"}',
    });
    expect(line).not.toContain('secret-endpoint');
    log.mockRestore();
  });
});

describe('scheduled', () => {
  it('runs the alerts and logs counts only', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await worker.scheduled(
      { scheduledTime: Date.parse('2026-11-17T18:00:00Z'), cron: '0 18 * * *', noRetry: vi.fn() },
      env(),
    );
    expect(log).toHaveBeenCalledWith(
      JSON.stringify({ job: 'frost-alerts', places: 0, sent: 0, removed: 0, failed: 0 }),
    );
    log.mockRestore();
  });
});
