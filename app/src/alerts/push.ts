/**
 * Alerts on the phone with the app closed: frost (RF-14, D-33) and sea agitation (RF-21,
 * D-37). One Web Push subscription, registered with the lunario-alerts Worker, which checks
 * the forecast and IPMA's warnings and notifies when there is something to say.
 *
 * Only while the user has turned them on, the Worker receives the push subscription and the
 * language, plus, for frost, the location rounded to ~1 km and the names of the
 * frost-sensitive crops in the garden, and, for the sea, the district of the chosen port.
 * Turning everything off deletes all of it.
 */
import type { Location } from '../astro/location.ts';
import type { Catalog } from '../catalog/types.ts';
import { roundCoordinate, sensitiveCropsInGarden } from '../frost/frost.ts';
import { getMeta, listPlantings, setMeta, type MetaKey } from '../garden/db.ts';
import { intlLocale } from '../i18n/format.ts';
import type { Language } from '../i18n/language.ts';

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

export type AlertKind = 'frost' | 'sea';
export type AlertsState = 'off' | 'on' | 'unsupported' | 'blocked';

const ON_KEY: Record<AlertKind, MetaKey> = { frost: 'frostAlerts', sea: 'seaAlerts' };

export interface AlertsContext {
  location: Pick<Location, 'latitude' | 'longitude'>;
  /** IPMA warning area of the sea port (D-35): the coastal district, e.g. 'AVR'. */
  seaArea: string;
  language: Language;
  source: Catalog;
  platform?: PushPlatform;
  fetchImpl?: typeof fetch;
}

export interface AlertChoices {
  frost: { latitude: number; longitude: number; crops: string[] } | null;
  sea: { area: string; yellow: boolean } | null;
}

export function base64urlToBytes(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text.replaceAll('-', '+').replaceAll('_', '/'));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** The body the Worker expects (worker/src/subscription.ts). */
export function alertsBody(
  subscription: PushSubscriptionJSON,
  choices: AlertChoices,
  language: Language,
) {
  return {
    subscription: {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.keys?.p256dh, auth: subscription.keys?.auth },
    },
    language,
    frost: choices.frost,
    sea: choices.sea,
  };
}

const isOn = async (kind: AlertKind) => (await getMeta(ON_KEY[kind])) === 'on';

/** The state to show before anything is sent: what the device and the saved choice allow. */
export async function alertsState(
  kind: AlertKind,
  platform: PushPlatform = browserPush,
): Promise<AlertsState> {
  if (!platform.supported()) return 'unsupported';
  if (!(await isOn(kind))) return 'off';
  return platform.permission() === 'denied' ? 'blocked' : 'on';
}

/** Whether yellow sea warnings count too (off by omission: they are frequent in winter). */
export async function seaYellow(): Promise<boolean> {
  return (await getMeta('seaAlertsYellow')) === 'on';
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

/** What to send for the alerts that are on: nothing about the frost unless frost is on. */
async function choices(context: AlertsContext): Promise<AlertChoices> {
  const { location, language, source, seaArea } = context;
  const frost = (await isOn('frost'))
    ? {
        latitude: roundCoordinate(location.latitude),
        longitude: roundCoordinate(location.longitude),
        crops: sensitiveCropsInGarden(
          await listPlantings(),
          source,
          (crop) => (language === 'en' ? crop.name.en : crop.name.pt),
          intlLocale(language),
        ),
      }
    : null;
  const sea = (await isOn('sea')) ? { area: seaArea, yellow: await seaYellow() } : null;
  return { frost, sea };
}

/**
 * Sends the subscription to the Worker if any alerts are on and anything changed since the
 * last time (location, garden crops, port, language, the choices, or the browser's
 * subscription). Cheap otherwise.
 */
export async function syncAlerts(context: AlertsContext, force = false): Promise<void> {
  const { platform = browserPush, fetchImpl = fetch } = context;
  if (!platform.supported() || platform.permission() !== 'granted') return;
  const chosen = await choices(context);
  if (!chosen.frost && !chosen.sea) return;

  const subscription = await subscribe(await platform.pushManager());
  const body = alertsBody(subscription.toJSON(), chosen, context.language);
  const sent = JSON.stringify(body);
  if (force || sent !== (await getMeta('alertsSent'))) {
    await request('POST', body, fetchImpl);
    await setMeta('alertsSent', sent);
  }
}

/** Asks for permission and registers with the Worker. On failure, these alerts stay off. */
export async function enableAlerts(kind: AlertKind, context: AlertsContext): Promise<AlertsState> {
  const platform = context.platform ?? browserPush;
  if (!platform.supported()) return 'unsupported';
  const permission = await platform.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off';
  await setMeta(ON_KEY[kind], 'on');
  try {
    await syncAlerts(context, true);
  } catch (error) {
    await setMeta(ON_KEY[kind], 'off');
    throw error;
  }
  return 'on';
}

/**
 * Turns one kind of alerts off. With the other kind still on, the Worker is told what is
 * left (if offline, the next sync tells it). Otherwise it deletes the subscription and the
 * browser drops it.
 */
export async function disableAlerts(kind: AlertKind, context: AlertsContext): Promise<void> {
  const { platform = browserPush, fetchImpl = fetch } = context;
  await setMeta(ON_KEY[kind], 'off');
  const other: AlertKind = kind === 'frost' ? 'sea' : 'frost';
  if (await isOn(other)) {
    await syncAlerts(context).catch(() => undefined);
    return;
  }
  await setMeta('alertsSent', '');
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

/** Counts yellow sea warnings too, or stops counting them. On failure, nothing changes. */
export async function setSeaYellow(on: boolean, context: AlertsContext): Promise<void> {
  const before = await seaYellow();
  await setMeta('seaAlertsYellow', on ? 'on' : 'off');
  try {
    await syncAlerts(context);
  } catch (error) {
    await setMeta('seaAlertsYellow', before ? 'on' : 'off');
    throw error;
  }
}
