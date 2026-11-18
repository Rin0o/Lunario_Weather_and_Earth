import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { catalog } from '../catalog/catalog.ts';
import { addPlanting, getMeta, setMeta } from '../garden/db.ts';
import { KEYS, fakePlatform } from '../test/fakePush.ts';
import {
  ALERTS_URL,
  VAPID_PUBLIC_KEY,
  alertsBody,
  alertsState,
  base64urlToBytes,
  browserPush,
  disableAlerts,
  enableAlerts,
  seaYellow,
  setSeaYellow,
  syncAlerts,
  type AlertsContext,
} from './push.ts';

const GUARDA = { latitude: 40.53731, longitude: -7.26759 };

const okFetch = () =>
  vi.fn<(url: string, init: RequestInit) => Promise<Response>>(() =>
    Promise.resolve(new Response(null, { status: 204 })),
  );
const sentBody = (fetchImpl: ReturnType<typeof okFetch>, call = 0) =>
  JSON.parse(String(fetchImpl.mock.calls[call]?.[1].body)) as Record<string, unknown>;

function setup(permission: NotificationPermission = 'default') {
  const fake = fakePlatform(permission);
  const fetchImpl = okFetch();
  const context: AlertsContext = {
    location: GUARDA,
    seaArea: 'AVR',
    language: 'pt-PT',
    source: catalog,
    platform: fake.platform,
    fetchImpl: fetchImpl as unknown as typeof fetch,
  };
  return { ...fake, fetchImpl, context };
}

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

describe('alerts', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  it('decodes the VAPID key into the 65-byte point the browser expects', () => {
    const key = base64urlToBytes(VAPID_PUBLIC_KEY);
    expect(key).toHaveLength(65);
    expect(key[0]).toBe(4);
  });

  it('builds the body the Worker reads', () => {
    const body = alertsBody(
      { endpoint: 'https://p/1', keys: KEYS },
      { frost: null, sea: { area: 'AVR', yellow: false } },
      'en',
    );
    expect(body).toEqual({
      subscription: { endpoint: 'https://p/1', keys: KEYS },
      language: 'en',
      frost: null,
      sea: { area: 'AVR', yellow: false },
    });
  });

  it('frost on: asks permission, subscribes with the key and sends the garden crops, no sea', async () => {
    await addPlanting({ cropId: 'tomate', action: 'SV', date: '2026-10-01', notes: '' });
    await addPlanting({ cropId: 'alface', action: 'SV', date: '2026-10-01', notes: '' });
    const { platform, pushManager, fetchImpl, context } = setup();

    expect(await enableAlerts('frost', context)).toBe('on');
    expect(platform.requestPermission).toHaveBeenCalled();
    const options = pushManager.subscribe.mock.calls[0]?.[0];
    expect(options?.userVisibleOnly).toBe(true);
    expect(options?.applicationServerKey).toEqual(base64urlToBytes(VAPID_PUBLIC_KEY));
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(`${ALERTS_URL}/subscriptions`);
    expect(fetchImpl.mock.calls[0]?.[1].method).toBe('POST');
    // Lettuce is not frost-sensitive; the location never leaves the phone unrounded.
    expect(sentBody(fetchImpl)).toMatchObject({
      language: 'pt-PT',
      frost: { latitude: 40.54, longitude: -7.27, crops: ['Tomate'] },
      sea: null,
    });
    expect(await alertsState('frost', platform)).toBe('on');
    expect(await alertsState('sea', platform)).toBe('off');
  });

  it('sea on alone: sends the district only, never the location', async () => {
    await addPlanting({ cropId: 'tomate', action: 'SV', date: '2026-10-01', notes: '' });
    const { fetchImpl, context } = setup();
    expect(await enableAlerts('sea', context)).toBe('on');
    expect(sentBody(fetchImpl)).toEqual({
      subscription: { endpoint: 'https://push.example/send/1', keys: KEYS },
      language: 'pt-PT',
      frost: null,
      sea: { area: 'AVR', yellow: false },
    });
  });

  it('both on: one subscription for both; yellow warnings only when asked', async () => {
    const { fetchImpl, context } = setup();
    await enableAlerts('frost', context);
    await enableAlerts('sea', context);
    expect(sentBody(fetchImpl, 1)).toMatchObject({
      frost: { latitude: 40.54 },
      sea: { area: 'AVR', yellow: false },
    });

    await setSeaYellow(true, context);
    expect(await seaYellow()).toBe(true);
    expect(sentBody(fetchImpl, 2)).toMatchObject({ sea: { area: 'AVR', yellow: true } });
  });

  it('keeps the yellow choice as it was when the server cannot be told', async () => {
    const { context } = setup('granted');
    await setMeta('seaAlerts', 'on');
    const failing = vi.fn(() => Promise.resolve(new Response(null, { status: 503 })));
    await expect(setSeaYellow(true, { ...context, fetchImpl: failing })).rejects.toThrow('503');
    expect(await seaYellow()).toBe(false);
  });

  it('sends again only when something changed', async () => {
    const { replace, fetchImpl, context } = setup('granted');
    await enableAlerts('frost', context);
    await syncAlerts(context);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    await syncAlerts({ ...context, language: 'en' });
    expect(sentBody(fetchImpl, 1)).toMatchObject({ language: 'en', frost: { crops: [] } });

    await addPlanting({ cropId: 'pimento', action: 'TR', date: '2026-10-01', notes: '' });
    await syncAlerts({ ...context, language: 'en' });
    expect(sentBody(fetchImpl, 2)).toMatchObject({ frost: { crops: ['Sweet pepper'] } });

    const moved = {
      ...context,
      language: 'en' as const,
      location: { latitude: 41.3, longitude: -7.74 },
    };
    await syncAlerts(moved);
    expect(sentBody(fetchImpl, 3)).toMatchObject({ frost: { latitude: 41.3, longitude: -7.74 } });

    // The port's district only matters once sea alerts are on.
    await syncAlerts({ ...moved, seaArea: 'PTO' });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    await enableAlerts('sea', { ...moved, seaArea: 'PTO' });
    await syncAlerts({ ...moved, seaArea: 'LSB' });
    expect(sentBody(fetchImpl, 5)).toMatchObject({ sea: { area: 'LSB' } });

    // The browser renewed the subscription: the Worker must learn the new endpoint.
    replace('https://push.example/send/2');
    await syncAlerts({ ...moved, seaArea: 'LSB' });
    expect(sentBody(fetchImpl, 6)).toMatchObject({
      subscription: { endpoint: 'https://push.example/send/2' },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(7);
  });

  it('does nothing while off, unsupported or blocked', async () => {
    const { platform, setPermission, fetchImpl, context } = setup('granted');
    await syncAlerts(context);
    await setMeta('frostAlerts', 'on');
    setPermission('denied');
    expect(await alertsState('frost', platform)).toBe('blocked');
    await syncAlerts(context);
    const unsupported = { ...platform, supported: () => false };
    expect(await alertsState('sea', unsupported)).toBe('unsupported');
    await syncAlerts({ ...context, platform: unsupported });
    expect(await enableAlerts('sea', { ...context, platform: unsupported })).toBe('unsupported');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('stays off when permission is refused or the server fails', async () => {
    const { context } = setup();
    const denied = fakePlatform('denied').platform;
    expect(await enableAlerts('frost', { ...context, platform: denied })).toBe('blocked');

    const dismissed = fakePlatform('default').platform;
    dismissed.requestPermission = () => Promise.resolve('default');
    expect(await enableAlerts('sea', { ...context, platform: dismissed })).toBe('off');

    const failing = vi.fn(() => Promise.resolve(new Response(null, { status: 503 })));
    await expect(enableAlerts('sea', { ...context, fetchImpl: failing })).rejects.toThrow('503');
    expect(await getMeta('seaAlerts')).toBe('off');
  });

  it('subscribes again when the browser holds a subscription with another key', async () => {
    const { pushManager, unsubscribe, replace, fetchImpl, context } = setup('granted');
    replace('https://push.example/old');
    pushManager.subscribe.mockRejectedValueOnce(new DOMException('key', 'InvalidStateError'));
    await setMeta('frostAlerts', 'on');
    await syncAlerts(context);
    expect(unsubscribe).toHaveBeenCalled();
    expect(sentBody(fetchImpl)).toMatchObject({
      subscription: { endpoint: 'https://push.example/send/1' },
    });
  });

  it('one kind off with the other on: tells the Worker what is left, keeps the subscription', async () => {
    const { unsubscribe, fetchImpl, context } = setup('granted');
    await enableAlerts('frost', context);
    await enableAlerts('sea', context);
    await disableAlerts('frost', context);
    expect(fetchImpl.mock.calls[2]?.[1].method).toBe('POST');
    expect(sentBody(fetchImpl, 2)).toMatchObject({ frost: null, sea: { area: 'AVR' } });
    expect(unsubscribe).not.toHaveBeenCalled();

    // Offline: still off here, and the next sync tells the Worker.
    await enableAlerts('frost', context);
    const offline = vi.fn(() => Promise.reject(new TypeError('offline')));
    await disableAlerts('sea', { ...context, fetchImpl: offline });
    expect(await alertsState('sea', context.platform)).toBe('off');
    await syncAlerts(context);
    expect(sentBody(fetchImpl, 4)).toMatchObject({ frost: { latitude: 40.54 }, sea: null });
  });

  it('all off: deletes on the server and drops the subscription, even offline', async () => {
    const { platform, unsubscribe, context } = setup('granted');
    await enableAlerts('sea', context);

    const fetchImpl = okFetch();
    await disableAlerts('sea', { ...context, fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(fetchImpl.mock.calls[0]?.[1].method).toBe('DELETE');
    expect(sentBody(fetchImpl)).toEqual({ endpoint: 'https://push.example/send/1' });
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(await alertsState('sea', platform)).toBe('off');
    expect(await getMeta('alertsSent')).toBe('');

    // Offline this time: still unsubscribed locally.
    await enableAlerts('frost', context);
    await disableAlerts('frost', {
      ...context,
      fetchImpl: vi.fn(() => Promise.reject(new TypeError())),
    });
    expect(unsubscribe).toHaveBeenCalledTimes(2);

    // Nothing to drop, or no push at all: just off.
    await disableAlerts('frost', context);
    await disableAlerts('sea', { ...context, platform: { ...platform, supported: () => false } });
    expect(await getMeta('frostAlerts')).toBe('off');
  });
});
