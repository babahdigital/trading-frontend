'use client';

/**
 * React hook untuk mengelola Web Push subscription lifecycle.
 *
 * 2026-05-20 — Phase 1 mobile prereq scaffold.
 * Pak directive: siapkan infrastructure tapi tidak invoke prompt sampai
 * PWA go-live. Hook ini disabled by default (gated `NEXT_PUBLIC_ENABLE_WEB_PUSH`).
 *
 * Lifecycle:
 *   1. Register service worker (sw.js)
 *   2. Fetch VAPID public key dari /api/notifications/push/vapid-public
 *   3. registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })
 *   4. POST subscription ke /api/notifications/push/subscribe
 *
 * Usage:
 *   const { isSupported, isSubscribed, status, subscribe, unsubscribe } = usePushNotifications();
 *
 * Saat PWA siap go-live, panggil `subscribe(['signal_alert', 'kill_switch'])` dari
 * tombol UI "Enable notifications" di portal dashboard atau onboarding step.
 */
import { useEffect, useState, useCallback } from 'react';

type Status = 'idle' | 'unsupported' | 'denied' | 'permission_required' | 'subscribing' | 'subscribed' | 'error';

interface UsePushNotificationsReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  status: Status;
  error: string | null;
  subscribe: (topics?: string[]) => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const supported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
    setIsSupported(supported);

    if (!supported) {
      setStatus('unsupported');
      return;
    }

    // Check existing subscription
    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager.getSubscription().then((sub) => {
        if (sub) {
          setIsSubscribed(true);
          setStatus('subscribed');
        } else {
          const perm = Notification.permission;
          if (perm === 'denied') setStatus('denied');
          else if (perm === 'default') setStatus('permission_required');
          else setStatus('idle');
        }
      });
    }).catch(() => {
      // SW belum register; skip — hook caller akan trigger register via subscribe()
    });
  }, []);

  const subscribe = useCallback(async (topics: string[] = ['signal_alert']): Promise<boolean> => {
    setError(null);

    if (!isSupported) {
      setStatus('unsupported');
      setError('Browser tidak mendukung notifikasi push.');
      return false;
    }

    // Permission gate
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      setStatus(perm === 'denied' ? 'denied' : 'permission_required');
      setError(perm === 'denied'
        ? 'Izin notifikasi ditolak. Aktifkan dari pengaturan browser.'
        : 'Izin notifikasi diperlukan.');
      return false;
    }

    setStatus('subscribing');

    try {
      // 1. Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      // 2. Fetch VAPID public key
      const vapidRes = await fetch('/api/notifications/push/vapid-public');
      if (!vapidRes.ok) {
        const body = await vapidRes.json().catch(() => ({}));
        throw new Error(body.message || 'VAPID key tidak tersedia.');
      }
      const { publicKey } = await vapidRes.json();
      if (!publicKey) throw new Error('VAPID key kosong.');

      // 3. Subscribe via pushManager
      // Cast to BufferSource — PushSubscriptionOptionsInit type-strict
      // sebab DOM types kadang lag dibanding runtime Uint8Array support.
      const applicationServerKey = urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      // 4. POST ke server
      const subRes = await fetch('/api/notifications/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh') as ArrayBuffer))),
            auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth') as ArrayBuffer))),
          },
          topics,
        }),
      });

      if (!subRes.ok) {
        await subscription.unsubscribe().catch(() => {});
        throw new Error('Server menolak subscription.');
      }

      setIsSubscribed(true);
      setStatus('subscribed');
      return true;
    } catch (err) {
      setStatus('error');
      const msg = err instanceof Error ? err.message : 'Gagal subscribe push.';
      setError(msg);
      return false;
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setIsSubscribed(false);
        return true;
      }
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await fetch(`/api/notifications/push/subscribe?endpoint=${encodeURIComponent(endpoint)}`, {
        method: 'DELETE',
      });
      setIsSubscribed(false);
      setStatus('idle');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal unsubscribe.');
      return false;
    }
  }, [isSupported]);

  return { isSupported, isSubscribed, status, error, subscribe, unsubscribe };
}
