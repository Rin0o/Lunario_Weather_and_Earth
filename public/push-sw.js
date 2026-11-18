// Alert notifications: frost (RF-14, D-33) and sea agitation (RF-21, D-37). Loaded into the
// generated service worker with importScripts (vite.config.ts). The lunario-alerts Worker
// sends { title, body, tag, url }; url is a route of the app (`/`, `/#/mar`).

const FALLBACK_TITLE = 'Lunário';

self.addEventListener('push', (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    // Not JSON: show the app name rather than nothing (a push must always show something).
  }
  event.waitUntil(
    self.registration.showNotification(message.title || FALLBACK_TITLE, {
      body: message.body || '',
      tag: message.tag,
      icon: '/pwa-192x192.png',
      data: { url: message.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Only ever open the app itself, whatever the message says.
  const target = new URL(event.notification.data?.url || '/', self.location.origin);
  const url = target.origin === self.location.origin ? target.href : self.location.origin + '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      return open ? open.focus() : self.clients.openWindow(url);
    }),
  );
});
