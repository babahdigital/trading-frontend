/**
 * BabahAlgo service worker.
 *
 * 2026-05-20 — Phase 1 mobile prereq scaffold.
 * Currently handles 2 responsibilities:
 *   1. Push notification event → display system notification
 *   2. Notification click → focus existing tab atau open URL
 *
 * Caching strategy DEFER (Phase 1 PWA go-live) — saat ini service worker
 * tidak intercept fetch atau cache asset. Pak directive: siapkan
 * infrastructure dulu, polish system, baru ship PWA.
 *
 * Activate via env: NEXT_PUBLIC_ENABLE_SERVICE_WORKER='1'.
 */

self.addEventListener('install', (event) => {
  // Skip waiting jadi worker langsung aktif begitu update available
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Push event handler — show system notification dari payload yang
 * di-encrypted oleh server (Web Push protocol payload).
 *
 * Server kirim payload JSON: { title, body, icon, badge, tag, url, topic }
 */
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'BabahAlgo', body: event.data.text() };
  }

  const title = payload.title || 'BabahAlgo';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/logo/babahalgo-icon-256.png',
    badge: payload.badge || '/logo/babahalgo-icon-64.png',
    tag: payload.tag || payload.topic || 'babahalgo',
    data: {
      url: payload.url || '/',
      topic: payload.topic || 'general',
      ts: Date.now(),
    },
    // requireInteraction true buat critical alert (kill-switch, margin call)
    requireInteraction: payload.topic === 'kill_switch' || payload.topic === 'margin_call',
    // Vibrate pattern khusus signal alert (single short pulse)
    vibrate: payload.topic === 'signal_alert' ? [120] : [80, 40, 80],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/**
 * Click event → focus existing tab kalau ada, else open new tab ke URL
 * yang di-include di payload.data.url.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab kalau URL match base origin
      for (const client of clientList) {
        if ('focus' in client && client.url.includes(self.location.origin)) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // No existing tab → open baru
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});

/**
 * Push subscription change — browser rotate keys, kita perlu re-subscribe
 * di server. Defer implementation sampai PWA go-live.
 */
self.addEventListener('pushsubscriptionchange', (event) => {
  // TODO Phase 1 PWA: post new subscription ke /api/notifications/push/subscribe
  // dengan oldEndpoint identifier untuk replace di DB.
  event.waitUntil(Promise.resolve());
});
