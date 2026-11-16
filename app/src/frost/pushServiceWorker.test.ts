import { describe, expect, it, vi } from 'vitest';
import source from '../../../public/push-sw.js?raw';

type Listener = (event: Record<string, unknown>) => void;

/** Runs public/push-sw.js against a fake service worker global. */
function loadServiceWorker(windows: { url: string; focus: () => Promise<unknown> }[] = []) {
  const listeners: Record<string, Listener> = {};
  const self = {
    location: { origin: 'https://lunario-4w2.pages.dev' },
    addEventListener: (type: string, listener: Listener) => (listeners[type] = listener),
    registration: { showNotification: vi.fn(() => Promise.resolve()) },
    clients: {
      matchAll: vi.fn(() => Promise.resolve(windows)),
      openWindow: vi.fn(() => Promise.resolve(null)),
    },
  };
  new Function('self', source)(self);
  const dispatch = async (type: string, event: Record<string, unknown>) => {
    let done: Promise<unknown> = Promise.resolve();
    listeners[type]?.({ ...event, waitUntil: (p: Promise<unknown>) => (done = p) });
    await done;
  };
  return { self, dispatch };
}

describe('push service worker', () => {
  it('shows the frost alert sent by the Worker', async () => {
    const { self, dispatch } = loadServiceWorker();
    const message = { title: '❄️ Risco de geada esta noite', body: 'Proteja: Tomate.', tag: 't' };
    await dispatch('push', { data: { json: () => message } });
    expect(self.registration.showNotification).toHaveBeenCalledWith(message.title, {
      body: message.body,
      tag: 't',
      icon: '/pwa-192x192.png',
      data: { url: '/' },
    });
  });

  it('still shows something for an empty or broken message', async () => {
    const { self, dispatch } = loadServiceWorker();
    await dispatch('push', {});
    await dispatch('push', {
      data: {
        json: () => {
          throw new SyntaxError('bad');
        },
      },
    });
    expect(self.registration.showNotification).toHaveBeenCalledTimes(2);
    expect(self.registration.showNotification).toHaveBeenLastCalledWith(
      'Lunário',
      expect.objectContaining({ body: '' }),
    );
  });

  it('opens the app on click, or focuses it if open, never another site', async () => {
    const close = vi.fn();
    const closed = { close, data: { url: 'https://evil.example/' } };
    const first = loadServiceWorker();
    await first.dispatch('notificationclick', { notification: closed });
    expect(close).toHaveBeenCalled();
    expect(first.self.clients.openWindow).toHaveBeenCalledWith('https://lunario-4w2.pages.dev/');

    const focus = vi.fn(() => Promise.resolve());
    const open = loadServiceWorker([{ url: 'https://lunario-4w2.pages.dev/horta', focus }]);
    await open.dispatch('notificationclick', { notification: { close, data: { url: '/' } } });
    expect(focus).toHaveBeenCalled();
    expect(open.self.clients.openWindow).not.toHaveBeenCalled();
  });
});
