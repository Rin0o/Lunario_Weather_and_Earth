import { vi } from 'vitest';
import type { PushPlatform } from '../frost/alerts.ts';

export const KEYS = {
  p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u',
  auth: 'a1',
};

/** A browser push stack in memory: one subscription at a time, like a real one. */
export function fakePlatform(permission: NotificationPermission = 'default') {
  let current: PushSubscription | null = null;
  const unsubscribe = vi.fn(() => {
    current = null;
    return Promise.resolve(true);
  });
  const make = (endpoint: string) =>
    ({
      endpoint,
      unsubscribe,
      toJSON: () => ({ endpoint, keys: KEYS }),
    }) as unknown as PushSubscription;
  const pushManager = {
    subscribe: vi.fn((options: PushSubscriptionOptionsInit) => {
      void options;
      current ??= make('https://push.example/send/1');
      return Promise.resolve(current);
    }),
    getSubscription: vi.fn(() => Promise.resolve(current)),
  };
  const platform: PushPlatform = {
    supported: () => true,
    permission: () => permission,
    requestPermission: vi.fn(() => {
      if (permission === 'default') permission = 'granted';
      return Promise.resolve(permission);
    }),
    pushManager: () => Promise.resolve(pushManager as unknown as PushManager),
  };
  return {
    platform,
    pushManager,
    unsubscribe,
    setPermission: (p: NotificationPermission) => (permission = p),
    replace: (endpoint: string) => (current = make(endpoint)),
  };
}
