'use client';

/**
 * DemoCtaButton — auth-aware demo activation CTA.
 *
 * Behavior:
 *   - Unauth user: redirect ke /register?service=X&mode=demo (signup first)
 *   - Auth user: POST /api/portal/demo/activate?service=X → redirect /portal
 *
 * Pak Abdullah directive 2026-05-21: user logged-in click "Coba demo"
 * jangan redirect /register lagi — langsung activate dari API.
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DemoCtaButtonProps {
  service: 'signal' | 'crypto';
  className?: string;
  children: React.ReactNode;
  /** Optional trailing icon (e.g. ArrowRight) */
  trailingIcon?: LucideIcon;
}

export function DemoCtaButton({ service, className, children, trailingIcon: Icon }: DemoCtaButtonProps) {
  const router = useRouter();
  const locale = useLocale();
  const [authResolved, setAuthResolved] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEn = locale === 'en';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
        // /api/auth/me sekarang return 200 with {user: null} untuk guest
        // supaya tidak clutter console 401. Cek data.user untuk derive login state.
        const data = res.ok ? await res.json().catch(() => null) : null;
        if (!cancelled) {
          setLoggedIn(Boolean(data?.user?.id));
          setAuthResolved(true);
        }
      } catch {
        if (!cancelled) {
          setAuthResolved(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    setError(null);

    // Unauth → guest signup flow (existing behavior preserved)
    if (!loggedIn) {
      router.push(`/${locale}/register?service=${service}&mode=demo`);
      return;
    }

    // Auth → activate demo via API + redirect ke portal
    setLoading(true);
    try {
      const res = await fetch(`/api/portal/demo/activate?service=${service}`, {
        method: 'POST',
        credentials: 'same-origin',
      });
      const body = await res.json();
      if (!res.ok) {
        // 409 already_subscribed → redirect tetap ke portal (user lihat existing sub)
        if (res.status === 409) {
          router.push(service === 'signal' ? '/portal' : '/portal/crypto');
          return;
        }
        throw new Error(body.message || body.error || 'activation_failed');
      }
      router.push(body.redirectTo || '/portal');
    } catch (err) {
      setError(err instanceof Error ? err.message : (isEn ? 'Activation failed' : 'Gagal aktivasi'));
      setLoading(false);
    }
  }

  // SSR-safe: sebelum auth resolved, render disabled/link untuk avoid hydration mismatch
  const buttonContent = (
    <>
      {loading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
      {children}
      {!loading && Icon && <Icon className="w-4 h-4 ml-1.5" />}
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || !authResolved}
        className={cn('inline-flex items-center justify-center gap-2 transition-colors', className)}
      >
        {buttonContent}
      </button>
      {error && (
        <p className="text-xs text-rose-600 dark:text-rose-400 mt-2" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
