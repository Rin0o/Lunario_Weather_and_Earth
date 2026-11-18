// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { generateVapidKeys } from '../../scripts/lib/vapid.ts';
import {
  deliver,
  enqueue,
  padJson,
  PUSHES_PER_MESSAGE,
  pushJob,
  pushSender,
  testJob,
  type PushJob,
  type Sender,
} from './push.ts';
import { fakeQueue, sub } from './test/fakes.ts';
import { decryptAes128gcm } from './test/webPushDecrypt.ts';

const CONTACT = 'https://lunario-4w2.pages.dev';
const MESSAGE = { title: 't', body: 'b', tag: 'x', url: '/' };

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');

/** The subscriber's key pair and auth secret, as a browser creates them. */
async function browserKeys() {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ])) as CryptoKeyPair;
  const raw = new Uint8Array((await crypto.subtle.exportKey('raw', pair.publicKey)) as ArrayBuffer);
  const authSecret = crypto.getRandomValues(new Uint8Array(16));
  return { pair, raw, authSecret, p256dh: b64url(raw), auth: b64url(authSecret) };
}

describe('push sending', () => {
  it('posts a message the browser can decrypt (RFC 8291), signed with VAPID (RFC 8292)', async () => {
    const vapid = await generateVapidKeys();
    const browser = await browserKeys();
    const fetchImpl = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(() =>
      Promise.resolve(new Response(null, { status: 201 })),
    );
    const sender = pushSender(
      {
        VAPID_PUBLIC_KEY: vapid.publicKey,
        VAPID_PRIVATE_KEY: vapid.privateKey,
        ADMIN_CONTACT: CONTACT,
      },
      fetchImpl as unknown as typeof fetch,
    );
    const message = {
      title: '🟠 Aviso laranja de agitação marítima',
      body: 'Distrito de Coimbra, de hoje 18:00 a sexta 00:00.',
      tag: 't',
      url: '/#/mar',
    };
    const job = pushJob(
      { endpoint: 'https://push.example/send/1', p256dh: browser.p256dh, auth: browser.auth },
      message,
      'sea',
      36000,
    );

    expect(await sender.send(job)).toBe(201);
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe('https://push.example/send/1');
    const headers = new Headers(init?.headers);
    expect(headers.get('Content-Encoding')).toBe('aes128gcm');
    expect(headers.get('Authorization')).toMatch(
      new RegExp(String.raw`^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=${vapid.publicKey}$`),
    );
    expect(headers.get('TTL')).toBe('36000');
    expect(headers.get('Urgency')).toBe('high');
    expect(headers.get('Topic')).toBe('sea');

    const plaintext = await decryptAes128gcm(
      new Uint8Array(init?.body as Uint8Array),
      browser.pair.privateKey,
      browser.raw,
      browser.authSecret,
    );
    expect(JSON.parse(plaintext)).toEqual(message);
    // Padded to 256 bytes, not to 4 KB: Firefox for Android refuses big messages (413).
    expect(new TextEncoder().encode(plaintext).length % 256).toBe(0);
    expect((init?.body as Uint8Array).byteLength).toBeLessThan(512);
  });

  it('logs the status and the short reason of a refusal, not the endpoint', async () => {
    const vapid = await generateVapidKeys();
    const browser = await browserKeys();
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const fetchImpl = vi.fn(() =>
      Promise.resolve(new Response('{"errno":109,"message":"Invalid VAPID"}', { status: 401 })),
    );
    const sender = pushSender(
      {
        VAPID_PUBLIC_KEY: vapid.publicKey,
        VAPID_PRIVATE_KEY: vapid.privateKey,
        ADMIN_CONTACT: CONTACT,
      },
      fetchImpl as unknown as typeof fetch,
    );
    const job = pushJob(
      {
        endpoint: 'https://push.example/secret-endpoint',
        p256dh: browser.p256dh,
        auth: browser.auth,
      },
      MESSAGE,
      'frost',
      60,
    );
    expect(await sender.send(job)).toBe(401);
    const line = String(log.mock.calls[0]?.[0]);
    expect(JSON.parse(line)).toEqual({
      job: 'push',
      status: 401,
      reason: '{"errno":109,"message":"Invalid VAPID"}',
    });
    expect(line).not.toContain('secret-endpoint');
    log.mockRestore();
  });

  it('pads JSON to whole blocks, counting bytes not characters', () => {
    expect(padJson({ a: 1 }, 16)).toBe('{"a":1}         ');
    const accented = padJson({ t: 'geada ❄️' }, 32);
    expect(new TextEncoder().encode(accented).length).toBe(32);
    expect(JSON.parse(accented)).toEqual({ t: 'geada ❄️' });
    const exact = JSON.stringify({ a: 'xxxxxxxx' }); // 16 bytes
    expect(padJson({ a: 'xxxxxxxx' }, 16)).toBe(exact);
  });

  it('writes the test notification in the subscriber language', () => {
    expect(testJob(sub(1, { language: 'en' }))).toMatchObject({
      endpoint: 'https://push.example/1',
      message: { title: '🧪 Alerts test', tag: 'alerts-test' },
      topic: 'test',
    });
  });
});

const jobs = (n: number, endpointLength = 20): PushJob[] =>
  Array.from({ length: n }, (_, i) =>
    pushJob(
      {
        endpoint: `https://push.example/${String(i).padEnd(endpointLength, 'x')}`,
        p256dh: 'p',
        auth: 'a',
      },
      MESSAGE,
      'frost',
      60,
    ),
  );

describe('enqueue', () => {
  it('puts a few pushes in each message, all messages in one call when they fit', async () => {
    const { queue, batches } = fakeQueue();
    expect(await enqueue(queue, jobs(12))).toBe(3);
    expect(batches).toHaveLength(1);
    expect(batches[0]?.map((m) => m.length)).toEqual([PUSHES_PER_MESSAGE, PUSHES_PER_MESSAGE, 2]);
  });

  it('splits the calls at 100 messages and well under 256 KB', async () => {
    const many = fakeQueue();
    expect(await enqueue(many.queue, jobs(101 * PUSHES_PER_MESSAGE))).toBe(101);
    expect(many.batches.map((b) => b.length)).toEqual([100, 1]);

    const big = fakeQueue();
    await enqueue(big.queue, jobs(60 * PUSHES_PER_MESSAGE, 1000));
    expect(big.batches.length).toBeGreaterThan(1);
    for (const batch of big.batches) {
      expect(new TextEncoder().encode(JSON.stringify(batch)).length).toBeLessThan(256_000);
    }
    expect(big.batches.flat()).toHaveLength(60);
  });

  it('sends nothing for no pushes', async () => {
    const { queue } = fakeQueue();
    expect(await enqueue(queue, [])).toBe(0);
    expect(queue.sendBatch).not.toHaveBeenCalled();
  });
});

describe('deliver', () => {
  it('sends each push, deletes the subscriptions gone from the push service, counts failures', async () => {
    const statuses = [201, 410, 500, 404];
    let call = 0;
    const sender: Sender = {
      send: () =>
        call === 4 ? Promise.reject(new Error('network')) : Promise.resolve(statuses[call++] ?? 0),
    };
    const store = { remove: vi.fn(() => Promise.resolve()) };
    const result = await deliver(jobs(5), sender, store);
    expect(result).toEqual({ sent: 1, removed: 2, failed: 2 });
    expect(store.remove).toHaveBeenCalledTimes(2);
  });
});
