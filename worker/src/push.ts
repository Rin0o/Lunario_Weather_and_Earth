/**
 * Sending the notifications (D-33, D-37). The cron jobs decide who gets what and put the
 * pushes on a Cloudflare Queue in small batches; each batch is sent by its own queue
 * invocation. On the free plan an invocation has 10 ms of CPU and 50 subrequests, and one
 * push (VAPID signature + aes128gcm) takes about 1.3 ms of CPU, so a few per invocation keeps
 * every evening within the limits, whatever the number of subscribers.
 */
import { encryptNotification, vapidHeaders } from '@block65/webcrypto-web-push';
import type { Store } from './store.ts';
import type { Language, Subscription } from './subscription.ts';

export interface AlertMessage {
  title: string;
  body: string;
  /** Replaces an earlier notification with the same tag instead of piling up. */
  tag: string;
  /** Where tapping the notification opens the app (a route of the app itself). */
  url: string;
}

/** One notification for one phone, ready to send. */
export interface PushJob {
  endpoint: string;
  p256dh: string;
  auth: string;
  message: AlertMessage;
  /** A newer undelivered push with the same topic replaces the older (RFC 8030). */
  topic: string;
  /** Seconds the push service keeps it for a phone that is off. */
  ttl: number;
}

export const pushJob = (
  sub: Pick<Subscription, 'endpoint' | 'p256dh' | 'auth'>,
  message: AlertMessage,
  topic: string,
  ttl: number,
): PushJob => ({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth, message, topic, ttl });

const TEST_TEXTS: Record<Language, { title: string; body: string }> = {
  'pt-PT': {
    title: '🧪 Teste dos alertas',
    body: 'Os alertas estão a funcionar. Quando houver um aviso, chega assim.',
  },
  en: {
    title: '🧪 Alerts test',
    body: 'Alerts are working. When there is a warning, it arrives like this.',
  },
};

/** The notification sent when a test is asked for (CONTRIBUTING.md). */
export function testJob(sub: Subscription): PushJob {
  const message = { ...TEST_TEXTS[sub.language], tag: 'alerts-test', url: '/' };
  return pushJob(sub, message, 'test', 60 * 60);
}

export interface Sender {
  /** Sends one notification; returns the push service's HTTP status. */
  send(job: PushJob): Promise<number>;
}

export interface PushEnv {
  /** VAPID public key (base64url); the app subscribes with the same one. Not secret. */
  VAPID_PUBLIC_KEY: string;
  /** VAPID private key (base64url). A secret: set with `wrangler secret put`. */
  VAPID_PRIVATE_KEY: string;
  /** Contact the push services can use (a URL, not a personal address). */
  ADMIN_CONTACT: string;
}

const PAD_BLOCK = 256;

/** JSON with trailing spaces up to a multiple of `block` bytes (JSON.parse ignores them). */
export function padJson(value: unknown, block: number): string {
  const text = JSON.stringify(value);
  const bytes = new TextEncoder().encode(text).length;
  return text + ' '.repeat(Math.ceil(bytes / block) * block - bytes);
}

/** Sends through the subscriber's push service, encrypted and signed with VAPID. */
export function pushSender(env: PushEnv, fetchImpl: typeof fetch = fetch): Sender {
  return {
    async send(job: PushJob) {
      // RFC 8291 (aes128gcm) and RFC 8292 (VAPID), which every push service accepts, Apple's too.
      const subscription = {
        endpoint: job.endpoint,
        expirationTime: null,
        keys: { p256dh: job.p256dh, auth: job.auth },
      };
      const { headers } = await vapidHeaders(subscription, {
        subject: env.ADMIN_CONTACT,
        publicKey: env.VAPID_PUBLIC_KEY,
        privateKey: env.VAPID_PRIVATE_KEY,
      });
      // Not the library's padding to 4 KB: Firefox for Android relays messages base64-encoded
      // with a 4 KB limit and refuses them (413). Padding to a multiple of 256 bytes still
      // hides the exact length.
      const body = await encryptNotification(
        subscription,
        new TextEncoder().encode(padJson(job.message, PAD_BLOCK)),
        { pad: false },
      );
      const response = await fetchImpl(job.endpoint, {
        method: 'POST',
        headers: {
          ...headers,
          TTL: String(job.ttl),
          Urgency: 'high',
          Topic: job.topic,
          'Content-Encoding': 'aes128gcm',
          'Content-Type': 'application/octet-stream',
        },
        body,
      });
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

/** Pushes per queue message, each message sent by one invocation (see the top). */
export const PUSHES_PER_MESSAGE = 5;
/** Cloudflare's limits for one `sendBatch`: 100 messages and 256 KB; kept below. */
const MESSAGES_PER_SEND = 100;
const BYTES_PER_SEND = 200_000;

export interface PushQueue {
  sendBatch(messages: Iterable<MessageSendRequest<PushJob[]>>): Promise<unknown>;
}

const chunk = <T>(items: readonly T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, (i + 1) * size),
  );

/** Puts the pushes on the queue in batches; returns the number of queue messages. */
export async function enqueue(queue: PushQueue, jobs: readonly PushJob[]): Promise<number> {
  const messages = chunk(jobs, PUSHES_PER_MESSAGE);
  let pending: MessageSendRequest<PushJob[]>[] = [];
  let bytes = 0;
  for (const body of messages) {
    const size = new TextEncoder().encode(JSON.stringify(body)).length;
    if (pending.length && (pending.length >= MESSAGES_PER_SEND || bytes + size > BYTES_PER_SEND)) {
      await queue.sendBatch(pending);
      pending = [];
      bytes = 0;
    }
    pending.push({ body, contentType: 'json' });
    bytes += size;
  }
  if (pending.length) await queue.sendBatch(pending);
  return messages.length;
}

export interface DeliveryResult {
  sent: number;
  removed: number;
  failed: number;
}

/**
 * Sends a batch. Subscriptions the push service no longer knows (404, 410) are deleted;
 * other failures are only counted: no retries, so nobody gets the same alert twice.
 */
export async function deliver(
  jobs: readonly PushJob[],
  sender: Sender,
  store: Pick<Store, 'remove'>,
): Promise<DeliveryResult> {
  const result: DeliveryResult = { sent: 0, removed: 0, failed: 0 };
  for (const job of jobs) {
    let status: number;
    try {
      status = await sender.send(job);
    } catch {
      result.failed++;
      continue;
    }
    if (status === 404 || status === 410) {
      await store.remove(job.endpoint);
      result.removed++;
    } else if (status >= 200 && status < 300) {
      result.sent++;
    } else {
      result.failed++;
    }
  }
  return result;
}
