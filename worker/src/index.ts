/**
 * Lunário alerts Worker: frost (RF-14, RF-17, D-33) and sea agitation (RF-21, D-37).
 *   POST   /subscriptions  turn alerts on, or update what they are for
 *   DELETE /subscriptions  turn all alerts off (deletes the row)
 *   POST   /subscriptions/test  send a test notification to that subscription
 *   cron 0 18 * * *        check tonight's frost for every frost subscriber
 *   cron 0 7,8,11,…        check IPMA's sea warnings at 08, 12, 16 and 20 h in Portugal
 *   queue lunario-push     send the notifications the crons queued, a few per invocation
 */
import { runFrostAlerts } from './frost.ts';
import { deliver, pushSender, testJob, type PushEnv, type PushJob, type Sender } from './push.ts';
import { runSeaAlerts, seaCheckDue } from './sea.ts';
import { D1Store, MAX_SUBSCRIPTIONS } from './store.ts';
import { parseEndpoint, parseSubscription } from './subscription.ts';

export interface Env extends PushEnv {
  DB: D1Database;
  /** The notifications to send, in batches (push.ts). */
  PUSH_QUEUE: Queue<PushJob[]>;
  /** Comma-separated origins allowed to subscribe; `https://*.example.dev` matches previews. */
  ALLOWED_ORIGINS: string;
}

/** The cron of the frost check (wrangler.jsonc); any other cron is the sea check. */
export const FROST_CRON = '0 18 * * *';

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
    const status = await sender.send(testJob(sub)).catch(() => 0);
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

export async function handleScheduled(cron: string, env: Env, now: Date): Promise<void> {
  const store = new D1Store(env.DB);
  // Counts only: never log endpoints or locations.
  if (cron === FROST_CRON) {
    const result = await runFrostAlerts(store, env.PUSH_QUEUE, now, fetch);
    console.log(JSON.stringify({ job: 'frost-alerts', ...result }));
  } else if (seaCheckDue(now)) {
    const result = await runSeaAlerts(store, env.PUSH_QUEUE, now, fetch);
    console.log(JSON.stringify({ job: 'sea-alerts', ...result }));
  }
}

export async function handleQueue(
  batch: MessageBatch<PushJob[]>,
  env: Env,
  sender: Sender = pushSender(env),
): Promise<void> {
  const store = new D1Store(env.DB);
  for (const message of batch.messages) {
    const result = await deliver(message.body, sender, store);
    // Acknowledged whatever happened: a retry would send the same alert twice.
    message.ack();
    console.log(JSON.stringify({ job: 'push-batch', ...result }));
  }
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },

  scheduled(controller: ScheduledController, env: Env): Promise<void> {
    return handleScheduled(controller.cron, env, new Date(controller.scheduledTime));
  },

  queue(batch: MessageBatch<PushJob[]>, env: Env): Promise<void> {
    return handleQueue(batch, env);
  },
} satisfies ExportedHandler<Env, PushJob[]>;
