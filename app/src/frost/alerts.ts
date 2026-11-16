/**
 * Frost alerts on the phone (RF-14, D-33): a Web Push subscription registered with the
 * lunario-alerts Worker, which checks the forecast every evening and notifies on frost risk.
 *
 * Only while the user has turned them on, the Worker receives the push subscription, the
 * location rounded to ~1 km, the names of the frost-sensitive crops in the garden and the
 * language. Turning them off deletes all of it.
 */
import type { Location } from '../astro/location.ts';
import type { Catalog } from '../catalog/types.ts';
import { getMeta, listPlantings, setMeta } from '../garden/db.ts';
import { intlLocale } from '../i18n/format.ts';
import type { Language } from '../i18n/language.ts';
import { roundCoordinate, sensitiveCropsInGarden } from './frost.ts';

/** The Worker (worker/wrangler.jsonc); also allowed in the CSP connect-src (public/_headers). */
export const ALERTS_URL = 'https://lunario-alerts.31rino.workers.dev';
/** VAPID public key (RFC 8292), the same as in worker/wrangler.jsonc. Not a secret. */
export const VAPID_PUBLIC_KEY =
  'BD4kJdSx-E1iAQ4TCGGGXmhnGM2U3CDbpsGVV1hucZrPCyj_pae2dEnnHhGjHXUWV-g7YRv_T5zvUlhWBHrcwu0';

/** What the app needs from the browser; a fake replaces it in tests. */
export interface PushPlatform {
  supported(): boolean;
  permission(): NotificationPermission;
  requestPermission(): Promise<NotificationPermission>;
  /** The service worker's push manager; rejects when no service worker becomes active. */
  pushManager(): Promise<PushManager>;
}

const SERVICE_WORKER_WAIT_MS = 10_000;

export const browserPush: PushPlatform = {
  supported: () =>
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof PushManager !== 'undefined' &&
    typeof Notification !== 'undefined',
  permission: () => Notification.permission,
  requestPermission: () => Notification.requestPermission(),
  pushManager: () =>
    // `ready` never settles without a service worker (e.g. the dev server), hence the wait.
    new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('No active service worker')),
        SERVICE_WORKER_WAIT_MS,
      );
      void navigator.serviceWorker.ready.then((registration) => {
        clearTimeout(timer);
        resolve(registration.pushManager);
      }, reject);
    }),
};

export type AlertsState = 'off' | 'on' | 'unsupported' | 'blocked';

export interface AlertsContext {
  location: Pick<Location, 'latitude' | 'longitude'>;
  language: Language;
  source: Catalog;
  platform?: PushPlatform;
  fetchImpl?: typeof fetch;
}

export function base64urlToBytes(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text.replaceAll('-', '+').replaceAll('_', '/'));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** The body the Worker expects (worker/src/subscription.ts), with the location rounded here. */
export function alertsBody(
  subscription: PushSubscriptionJSON,
  location: AlertsContext['location'],
  crops: string[],
  language: Language,
) {
  return {
    subscription: {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.keys?.p256dh, auth: subscription.keys?.auth },
    },
    latitude: roundCoordinate(location.latitude),
    longitude: roundCoordinate(location.longitude),
    crops,
    language,
  };
}

/** The state to show before anything is sent: what the device and the saved choice allow. */
export async function frostAlertsState(platform: PushPlatform = browserPush): Promise<AlertsState> {
  if (!platform.supported()) return 'unsupported';
  if ((await getMeta('frostAlerts')) !== 'on') return 'off';
  return platform.permission() === 'denied' ? 'blocked' : 'on';
}

async function subscribe(pushManager: PushManager): Promise<PushSubscription> {
  const options = {
    userVisibleOnly: true,
    applicationServerKey: base64urlToBytes(VAPID_PUBLIC_KEY),
  };
  try {
    return await pushManager.subscribe(options);
  } catch (error) {
    // Subscribed earlier with another key: drop that subscription and start again.
    const old = await pushManager.getSubscription();
    if (!old) throw error;
    await old.unsubscribe();
    return pushManager.subscribe(options);
  }
}

async function request(
  method: 'POST' | 'DELETE',
  body: unknown,
  fetchImpl: typeof fetch,
): Promise<void> {
  const response = await fetchImpl(`${ALERTS_URL}/subscriptions`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Alerts server answered ${response.status}`);
}

/**
 * Sends the subscription to the Worker if alerts are on and anything changed since the last
 * time (location, garden crops, language, or the browser's subscription). Cheap otherwise.
 */
export async function syncFrostAlerts(
  { location, language, source, platform = browserPush, fetchImpl = fetch }: AlertsContext,
  force = false,
): Promise<AlertsState> {
  const state = await frostAlertsState(platform);
  if (state !== 'on' || platform.permission() !== 'granted') return state;

  const subscription = await subscribe(await platform.pushManager());
  const crops = sensitiveCropsInGarden(
    await listPlantings(),
    source,
    (crop) => (language === 'en' ? crop.name.en : crop.name.pt),
    intlLocale(language),
  );
  const body = alertsBody(subscription.toJSON(), location, crops, language);
  const sent = JSON.stringify(body);
  if (force || sent !== (await getMeta('frostAlertsSent'))) {
    await request('POST', body, fetchImpl);
    await setMeta('frostAlertsSent', sent);
  }
  return 'on';
}

/** Asks for permission and registers with the Worker. On failure, alerts stay off. */
export async function enableFrostAlerts(context: AlertsContext): Promise<AlertsState> {
  const platform = context.platform ?? browserPush;
  if (!platform.supported()) return 'unsupported';
  const permission = await platform.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off';
  await setMeta('frostAlerts', 'on');
  try {
    return await syncFrostAlerts(context, true);
  } catch (error) {
    await setMeta('frostAlerts', 'off');
    throw error;
  }
}

/**
 * Asks the Worker to send a test notification to this phone, after making sure it has the
 * current subscription. Throws when alerts are not on or the send fails.
 */
export async function sendTestAlert(context: AlertsContext): Promise<void> {
  const { platform = browserPush, fetchImpl = fetch } = context;
  if ((await syncFrostAlerts(context)) !== 'on') throw new Error('Alerts are not on');
  const subscription = await (await platform.pushManager()).getSubscription();
  if (!subscription) throw new Error('No push subscription');
  const response = await fetchImpl(`${ALERTS_URL}/subscriptions/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  if (!response.ok) {
    // Unknown or expired on the server: send everything again on the next sync.
    if (response.status === 404 || response.status === 410) await setMeta('frostAlertsSent', '');
    throw new Error(`Alerts server answered ${response.status}`);
  }
}

/** Turns alerts off: the Worker deletes the subscription and the browser drops it. */
export async function disableFrostAlerts({
  platform = browserPush,
  fetchImpl = fetch,
}: Pick<AlertsContext, 'platform' | 'fetchImpl'> = {}): Promise<void> {
  await setMeta('frostAlerts', 'off');
  await setMeta('frostAlertsSent', '');
  if (!platform.supported()) return;
  const subscription = await (await platform.pushManager()).getSubscription();
  if (!subscription) return;
  try {
    await request('DELETE', { endpoint: subscription.endpoint }, fetchImpl);
  } catch {
    // Offline or server down: once unsubscribed below, the push service refuses the Worker's
    // next message for this phone and the Worker deletes the row then.
  }
  await subscription.unsubscribe();
}
