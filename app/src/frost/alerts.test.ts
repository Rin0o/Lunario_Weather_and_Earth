import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { catalog } from '../catalog/catalog.ts';
import { addPlanting, getMeta, setMeta } from '../garden/db.ts';
import {
  ALERTS_URL,
  VAPID_PUBLIC_KEY,
  alertsBody,
  base64urlToBytes,
  browserPush,
  disableFrostAlerts,
  enableFrostAlerts,
  frostAlertsState,
  syncFrostAlerts,
} from './alerts.ts';
import { KEYS, fakePlatform } from '../test/fakePush.ts';

const GUARDA = { latitude: 40.53731, longitude: -7.26759 };

const okFetch = () =>
  vi.fn<(url: string, init: RequestInit) => Promise<Response>>(() =>
    Promise.resolve(new Response(null, { status: 204 })),
  );
const sentBody = (fetchImpl: ReturnType<typeof okFetch>, call = 0) =>
  JSON.parse(String(fetchImpl.mock.calls[call]?.[1].body)) as Record<string, unknown>;

describe('browserPush', () => {
  it('reads support and permission from the browser', async () => {
    expect(browserPush.supported()).toBe(false); // jsdom has no Push API
    const requestPermission = vi.fn(() => Promise.resolve('granted'));
    vi.stubGlobal('PushManager', function PushManager() {});
    vi.stubGlobal('Notification', { permission: 'default', requestPermission });
    const pushManager = {};
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { ready: Promise.resolve({ pushManager }) },
    });
    try {
      expect(browserPush.supported()).toBe(true);
      expect(browserPush.permission()).toBe('default');
      expect(await browserPush.requestPermission()).toBe('granted');
      expect(await browserPush.pushManager()).toBe(pushManager);
    } finally {
      Reflect.deleteProperty(navigator, 'serviceWorker');
    }
  });

  it('gives up when no service worker becomes active', async () => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { ready: new Promise(() => undefined) },
    });
    try {
      const waiting = expect(browserPush.pushManager()).rejects.toThrow('No active service worker');
      await vi.advanceTimersByTimeAsync(10_000);
      await waiting;
    } finally {
      Reflect.deleteProperty(navigator, 'serviceWorker');
      vi.useRealTimers();
    }
  });
});

describe('frost alerts', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  it('decodes the VAPID key into the 65-byte point the browser expects', () => {
    const key = base64urlToBytes(VAPID_PUBLIC_KEY);
    expect(key).toHaveLength(65);
    expect(key[0]).toBe(4);
  });

  it('rounds the location in the body it sends', () => {
    const body = alertsBody({ endpoint: 'https://p/1', keys: KEYS }, GUARDA, ['Tomate'], 'pt-PT');
    expect(body).toEqual({
      subscription: { endpoint: 'https://p/1', keys: KEYS },
      latitude: 40.54,
      longitude: -7.27,
      crops: ['Tomate'],
      language: 'pt-PT',
    });
  });

  it('turns on: asks permission, subscribes with the key and sends the garden crops', async () => {
    await addPlanting({ cropId: 'tomate', action: 'SV', date: '2026-10-01', notes: '' });
    await addPlanting({ cropId: 'alface', action: 'SV', date: '2026-10-01', notes: '' });
    const { platform, pushManager } = fakePlatform();
    const fetchImpl = okFetch();

    const state = await enableFrostAlerts({
      location: GUARDA,
      language: 'pt-PT',
      source: catalog,
      platform,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(state).toBe('on');
    expect(platform.requestPermission).toHaveBeenCalled();
    const options = pushManager.subscribe.mock.calls[0]?.[0];
    expect(options?.userVisibleOnly).toBe(true);
    expect(options?.applicationServerKey).toEqual(base64urlToBytes(VAPID_PUBLIC_KEY));
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(`${ALERTS_URL}/subscriptions`);
    expect(fetchImpl.mock.calls[0]?.[1].method).toBe('POST');
    // Lettuce is not frost-sensitive; the location never leaves the phone unrounded.
    expect(sentBody(fetchImpl)).toMatchObject({
      latitude: 40.54,
      longitude: -7.27,
      crops: ['Tomate'],
      language: 'pt-PT',
    });
    expect(await frostAlertsState(platform)).toBe('on');
  });

  it('sends again only when something changed', async () => {
    const { platform, replace } = fakePlatform('granted');
    const fetchImpl = okFetch();
    const context = {
      location: GUARDA,
      language: 'pt-PT' as const,
      source: catalog,
      platform,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    };
    await enableFrostAlerts(context);
    await syncFrostAlerts(context);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    await syncFrostAlerts({ ...context, language: 'en' });
    expect(sentBody(fetchImpl, 1)).toMatchObject({ language: 'en', crops: [] });

    await addPlanting({ cropId: 'pimento', action: 'TR', date: '2026-10-01', notes: '' });
    await syncFrostAlerts({ ...context, language: 'en' });
    expect(sentBody(fetchImpl, 2)).toMatchObject({ crops: ['Sweet pepper'] });

    await syncFrostAlerts({
      ...context,
      language: 'en',
      location: { latitude: 41.3, longitude: -7.74 },
    });
    expect(sentBody(fetchImpl, 3)).toMatchObject({ latitude: 41.3, longitude: -7.74 });

    // The browser renewed the subscription: the Worker must learn the new endpoint.
    replace('https://push.example/send/2');
    await syncFrostAlerts({
      ...context,
      language: 'en',
      location: { latitude: 41.3, longitude: -7.74 },
    });
    expect(sentBody(fetchImpl, 4)).toMatchObject({
      subscription: { endpoint: 'https://push.example/send/2' },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(5);
  });

  it('does nothing while off, unsupported or blocked', async () => {
    const fetchImpl = okFetch();
    const base = { location: GUARDA, language: 'pt-PT' as const, source: catalog };
    const { platform, setPermission } = fakePlatform('granted');
    const fetchFn = fetchImpl as unknown as typeof fetch;

    expect(await syncFrostAlerts({ ...base, platform, fetchImpl: fetchFn })).toBe('off');
    await setMeta('frostAlerts', 'on');
    setPermission('denied');
    expect(await syncFrostAlerts({ ...base, platform, fetchImpl: fetchFn })).toBe('blocked');
    const unsupported = { ...platform, supported: () => false };
    expect(await syncFrostAlerts({ ...base, platform: unsupported, fetchImpl: fetchFn })).toBe(
      'unsupported',
    );
    expect(await enableFrostAlerts({ ...base, platform: unsupported })).toBe('unsupported');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('stays off when permission is refused or the server fails', async () => {
    const base = { location: GUARDA, language: 'pt-PT' as const, source: catalog };
    const denied = fakePlatform('denied').platform;
    expect(await enableFrostAlerts({ ...base, platform: denied })).toBe('blocked');

    const dismissed = fakePlatform('default').platform;
    dismissed.requestPermission = () => Promise.resolve('default');
    expect(await enableFrostAlerts({ ...base, platform: dismissed })).toBe('off');

    const failing = vi.fn(() => Promise.resolve(new Response(null, { status: 503 })));
    await expect(
      enableFrostAlerts({ ...base, platform: fakePlatform().platform, fetchImpl: failing }),
    ).rejects.toThrow('503');
    expect(await getMeta('frostAlerts')).toBe('off');
  });

  it('subscribes again when the browser holds a subscription with another key', async () => {
    const { platform, pushManager, unsubscribe, replace } = fakePlatform('granted');
    replace('https://push.example/old');
    pushManager.subscribe.mockRejectedValueOnce(new DOMException('key', 'InvalidStateError'));
    await setMeta('frostAlerts', 'on');
    const fetchImpl = okFetch();
    await syncFrostAlerts({
      location: GUARDA,
      language: 'pt-PT',
      source: catalog,
      platform,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(unsubscribe).toHaveBeenCalled();
    expect(sentBody(fetchImpl)).toMatchObject({
      subscription: { endpoint: 'https://push.example/send/1' },
    });
  });

  it('turns off: deletes on the server and drops the subscription, even offline', async () => {
    const { platform, unsubscribe } = fakePlatform('granted');
    const context = { location: GUARDA, language: 'pt-PT' as const, source: catalog, platform };
    await enableFrostAlerts({ ...context, fetchImpl: okFetch() as unknown as typeof fetch });

    const fetchImpl = okFetch();
    await disableFrostAlerts({ platform, fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(fetchImpl.mock.calls[0]?.[1].method).toBe('DELETE');
    expect(sentBody(fetchImpl)).toEqual({ endpoint: 'https://push.example/send/1' });
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(await frostAlertsState(platform)).toBe('off');
    expect(await getMeta('frostAlertsSent')).toBe('');

    // Offline this time: still unsubscribed locally.
    await enableFrostAlerts({ ...context, fetchImpl: okFetch() as unknown as typeof fetch });
    await disableFrostAlerts({ platform, fetchImpl: vi.fn(() => Promise.reject(new TypeError())) });
    expect(unsubscribe).toHaveBeenCalledTimes(2);

    // Nothing to drop, or no push at all: just off.
    await disableFrostAlerts({ platform });
    await disableFrostAlerts({ platform: { ...platform, supported: () => false } });
    expect(await getMeta('frostAlerts')).toBe('off');
  });
});
