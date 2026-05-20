'use client';

/**
 * Subscription expiry warning banner.
 *
 * 2026-05-20 — Phase A polish. Surface saat subscription < 7 hari dari
 * expiry. Reduce churn — customer dapat early warning sebelum
 * auto-suspend yang otomatis blok trading.
 *
 * Tier:
 * - daysRemaining > 7: hide banner (no noise)
 * - 4-7 days: amber gentle (Info icon)
 * - 1-3 days: orange urgent (AlertCircle icon)
 * - expired (≤0): red blocking (AlertOctagon)
 * - autoRenew true: extra hint "auto-renew aktif"
 *
 * CTA: "Perpanjang" → /portal/billing/upgrade.
 * Dismissible per session (kecuali expired — itu critical).
 */
import { useState, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { AlertCircle, AlertOctagon, Info, X, ArrowRight, RefreshCw } from 'lucide-react';

const DISMISS_KEY_PREFIX = 'babah.sub_expiry_dismissed.';

interface SubscriptionInfo {
  tier: string;
  expiresAt: string;
  daysRemaining: number;
  autoRenew: boolean;
}

export function SubscriptionExpiryBanner({ subscription }: { subscription: SubscriptionInfo | null }) {
  const locale = useLocale() as 'id' | 'en';
  const isEn = locale === 'en';
  const days = subscription?.daysRemaining ?? Infinity;

  // Compute dismiss key per-day-bucket — customer dismissed di hari 6,
  // banner muncul lagi di hari 3 (urgency tier change).
  const dismissBucket = days <= 0 ? 'expired' : days <= 3 ? 'urgent' : 'warn';
  const dismissKey = subscription ? `${DISMISS_KEY_PREFIX}${dismissBucket}` : '';

  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined' || !dismissKey) return false;
    try {
      return sessionStorage.getItem(dismissKey) === '1';
    } catch {
      return false;
    }
  });

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      sessionStorage.setItem(dismissKey, '1');
    } catch { /* empty */ }
  }, [dismissKey]);

  // Hide kalau no sub, >7 days remaining, atau dismissed (kecuali expired)
  if (!subscription) return null;
  if (days > 7) return null;
  if (dismissed && days > 0) return null;

  const isExpired = days <= 0;
  const isUrgent = days >= 1 && days <= 3;

  const tone = isExpired
    ? 'border-red-500/40 bg-red-500/10 text-red-200'
    : isUrgent
      ? 'border-orange-500/40 bg-orange-500/10 text-orange-200'
      : 'border-amber-500/30 bg-amber-500/5 text-amber-200';

  const Icon = isExpired ? AlertOctagon : isUrgent ? AlertCircle : Info;

  const title = isExpired
    ? isEn ? 'Subscription expired' : 'Langganan kadaluwarsa'
    : isEn ? `Subscription expires in ${days} day${days > 1 ? 's' : ''}` : `Langganan habis dalam ${days} hari`;

  const body = isExpired
    ? isEn
      ? 'Your access has been suspended. Renew now to resume trading.'
      : 'Akses Anda di-suspend. Perpanjang sekarang untuk lanjut trading.'
    : isEn
      ? `Renew before ${new Date(subscription.expiresAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} to avoid service interruption.`
      : `Perpanjang sebelum ${new Date(subscription.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} untuk menghindari gangguan layanan.`;

  return (
    <div className={`mb-6 rounded-lg border p-4 flex items-start gap-3 ${tone}`}>
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold mb-1">{title}</p>
        <p className="text-xs leading-relaxed opacity-90 mb-3">{body}</p>
        {subscription.autoRenew && !isExpired && (
          <div className="flex items-center gap-1.5 text-xs opacity-80 mb-3">
            <RefreshCw className="w-3 h-3" />
            <span>{isEn ? 'Auto-renew is enabled' : 'Auto-renew aktif'}</span>
          </div>
        )}
        <Link
          href="/portal/billing/upgrade"
          className="inline-flex items-center gap-1.5 text-xs font-semibold underline hover:no-underline"
        >
          {isEn ? 'Renew now' : 'Perpanjang sekarang'}
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      {!isExpired && (
        <button onClick={dismiss} aria-label="Close" className="opacity-60 hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
