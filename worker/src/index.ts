/**
 * Lunário frost alerts Worker (RF-14, RF-17, D-33).
 *   POST   /subscriptions  turn alerts on, or update location and crops
 *   DELETE /subscriptions  turn alerts off (deletes the row)
 *   POST   /subscriptions/test  send a test notification to that subscription
 *   cron                   check tonight's frost for every subscriber and notify
 */
import { buildPushPayload } from '@block65/webcrypto-web-push';
import { runAlerts, testAlert, type AlertMessage, type Sender } from './alerts.ts';
import { D1Store, MAX_SUBSCRIPTIONS } from './store.ts';
import { parseEndpoint, parseSubscription, type Subscription } from './subscription.ts';

export interface Env {
  DB: D1Database;
  /** VAPID public key (base64url); the app subscribes with the same one. Not secret. */
  VAPID_PUBLIC_KEY: string;
  /** VAPID private key (base64url). A secret: set with `wrangler secret put`. */
  VAPID_PRIVATE_KEY: string;
  /** Comma-separated origins allowed to subscribe; `https://*.example.dev` matches previews. */
  ALLOWED_ORIGINS: string;
  /** Contact the push services can use (a URL, not a personal address). */
  ADMIN_CONTACT: string;
}

const MAX_BODY_BYTES = 4096;

export function originAllowed(origin: string | null, allowed: string): boolean {
  if (!origin) return false;
  return allowed
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
    .some((pattern) => {
      if (!pattern.includes('*')) return pattern === origin;
      const [scheme, host] = pattern.split('://*.');
      return (
        host !== undefined &&
        origin.startsWith(`${scheme}://`) &&
        origin.endsWith(`.${host}`) &&
        !origin.slice(`${scheme}://`.length, -host.length - 1).includes('/')
      );
    });
}

function corsHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

const json = (status: number, body: unknown, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

async function readBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) throw new Error('too large');
  return JSON.parse(text) as unknown;
}

export async function handleRequest(
  request: Request,
  env: Env,
  now = new Date(),
  sender: Sender = pushSender(env),
) {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  const isTest = url.pathname === '/subscriptions/test';
  if (url.pathname !== '/subscriptions' && !isTest) return json(404, { error: 'not found' });
  if (!originAllowed(origin, env.ALLOWED_ORIGINS))
    return json(403, { error: 'origin not allowed' });
  const cors = corsHeaders(origin as string);

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  let body: unknown;
  try {
    body = await readBody(request);
  } catch {
    return json(400, { error: 'body must be JSON, up to 4 KB' }, cors);
  }
  const store = new D1Store(env.DB);

  // A test notification, only to a subscription already saved, at the address the app gives:
  // endpoints are unguessable, so nobody can send it to someone else's phone.
  if (isTest) {
    if (request.method !== 'POST') return json(405, { error: 'method not allowed' }, cors);
    const endpoint = parseEndpoint(body);
    if (!endpoint) return json(400, { error: 'endpoint is missing' }, cors);
    const sub = await store.get(endpoint);
    if (!sub) return json(404, { error: 'subscription not found' }, cors);
    const status = await sender.send(sub, testAlert(sub.language)).catch(() => 0);
    if (status === 404 || status === 410) {
      await store.remove(endpoint);
      return json(410, { error: 'subscription expired' }, cors);
    }
    if (status < 200 || status >= 300) {
      // The push service's status tells a key mismatch (401/403) from other problems.
      // Status only: never log endpoints or locations.
      console.log(JSON.stringify({ job: 'test-alert', status }));
      return json(502, { error: 'push service refused', status }, cors);
    }
    return new Response(null, { status: 204, headers: cors });
  }

  if (request.method === 'POST') {
    const sub = parseSubscription(body);
    if ('error' in sub) return json(400, sub, cors);
    if (!(await store.has(sub.endpoint)) && (await store.count()) >= MAX_SUBSCRIPTIONS) {
      return json(503, { error: 'subscriptions are full' }, cors);
    }
    await store.save(sub, now);
    return new Response(null, { status: 204, headers: cors });
  }

  if (request.method === 'DELETE') {
    const endpoint = parseEndpoint(body);
    if (!endpoint) return json(400, { error: 'endpoint is missing' }, cors);
    await store.remove(endpoint);
    return new Response(null, { status: 204, headers: cors });
  }

  return json(405, { error: 'method not allowed' }, cors);
}

/** Sends through the subscriber's push service, encrypted and signed with VAPID. */
export function pushSender(env: Env, fetchImpl: typeof fetch = fetch): Sender {
  return {
    async send(sub: Subscription, message: AlertMessage) {
      // RFC 8291 (aes128gcm) and RFC 8292 (VAPID), which every push service accepts, Apple's too.
      const payload = await buildPushPayload(
        {
          data: { ...message, url: '/' },
          // Useless after the night: expire in 12 hours; a newer alert replaces an older one.
          options: { ttl: 12 * 60 * 60, urgency: 'high', topic: 'frost' },
        },
        {
          endpoint: sub.endpoint,
          expirationTime: null,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        {
          subject: env.ADMIN_CONTACT,
          publicKey: env.VAPID_PUBLIC_KEY,
          privateKey: env.VAPID_PRIVATE_KEY,
        },
      );
      const response = await fetchImpl(sub.endpoint, payload);
      if (!response.ok) {
        // The push service's short reason (e.g. Mozilla's errno, Apple's "BadJwtToken"),
        // never the endpoint.
        const reason = (await response.text().catch(() => '')).slice(0, 200);
        console.log(JSON.stringify({ job: 'push', status: response.status, reason }));
      }
      return response.status;
    },
  };
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },

  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    const result = await runAlerts(
      new D1Store(env.DB),
      pushSender(env),
      new Date(controller.scheduledTime),
      fetch,
    );
    // Counts only: never log endpoints or locations.
    console.log(JSON.stringify({ job: 'frost-alerts', ...result }));
  },
} satisfies ExportedHandler<Env>;
