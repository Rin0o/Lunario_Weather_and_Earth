/** Test doubles shared by the Worker tests. */
import { vi } from 'vitest';
import type { PushJob, PushQueue } from '../push.ts';
import type { Subscription } from '../subscription.ts';

/** Subscription `n` (endpoint `https://push.example/<n>`), frost and sea off unless given. */
export const sub = (n: number, extra: Partial<Subscription> = {}): Subscription => ({
  endpoint: `https://push.example/${n}`,
  p256dh: 'p',
  auth: 'a',
  language: 'pt-PT',
  frost: null,
  sea: null,
  ...extra,
});

export const frostAt = (latitude: number, longitude: number, crops: string[] = []) => ({
  latitude,
  longitude,
  crops,
});

/** A queue that keeps what it was given: one entry per `sendBatch` call. */
export function fakeQueue() {
  const batches: PushJob[][][] = [];
  const queue: PushQueue & { sendBatch: ReturnType<typeof vi.fn> } = {
    sendBatch: vi.fn((messages: Iterable<MessageSendRequest<PushJob[]>>) => {
      batches.push([...messages].map((m) => m.body));
      return Promise.resolve();
    }),
  };
  /** Every queued push, in order. */
  const jobs = () => batches.flat(2);
  return { queue, batches, jobs };
}
