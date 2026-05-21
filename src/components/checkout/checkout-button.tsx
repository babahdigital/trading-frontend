'use client';

/**
 * CheckoutButton — generic self-serve checkout trigger.
 *
 * Pak Abdullah direction 2026-05-21: Xendit jadi default provider untuk
 * semua tier (multi-currency display, clean API, dan forex backend juga
 * akan migrate ke Xendit eventually). Midtrans tetap available sebagai
 * fallback kalau customer prefer atau Xendit down — pass `preferredProvider`
 * prop atau use ProviderSelector wrapper.
 *
 * Flow:
 *   1. Click → POST /api/billing/checkout dengan tier + provider
 *   2. Backend create invoice (Xendit) atau snap transaction (Midtrans)
 *   3. FE redirect customer ke gateway hosted page (invoiceUrl / redirectUrl)
 *   4. Customer complete payment di gateway page
 *   5. Gateway webhook → /api/billing/webhook/{provider} update DB +
 *      cancel/activate subscription via lifecycle.ts
 *   6. Customer redirect back ke /portal/billing/{success,pending,failure}
 *
 * Auth required: kalau unauthenticated → redirect ke /register?service=...
 * dengan tier preserve di query supaya signup flow continue checkout.
 */
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PaymentProvider = 'midtrans' | 'xendit';

interface CheckoutButtonProps {
  /** Tier slug yang match TIER_PRICES di /api/billing/checkout */
  tier: string;
  /** Force specific provider; default = xendit */
  preferredProvider?: PaymentProvider;
  /** Service slug untuk /register fallback (signal | crypto | vps) */
  service?: 'signal' | 'crypto' | 'vps';
  children?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'sm' | 'default' | 'lg';
  showArrow?: boolean;
  fullWidth?: boolean;
}

export function CheckoutButton({
  tier,
  preferredProvider = 'xendit',
  service = 'crypto',
  children,
  className,
  variant = 'default',
  size = 'default',
  showArrow = true,
  fullWidth = false,
}: CheckoutButtonProps) {
  const locale = useLocale();
  const t = useTranslations('checkout');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ tier, provider: preferredProvider }),
      });

      // Unauthenticated → redirect signup flow dengan tier preserve
      if (res.status === 401) {
        const tierSlug = tier.toLowerCase().replace(/^(crypto|signal|vps)_/, '');
        window.location.href = `/${locale}/register?service=${service}&tier=${tierSlug}&from=checkout`;
        return;
      }

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.message || body.error || `HTTP ${res.status}`);
      }

      // Provider-specific redirect
      if (body.invoiceUrl) {
        // Xendit hosted invoice page (multi-currency display)
        window.location.assign(body.invoiceUrl);
      } else if (body.redirectUrl) {
        // Midtrans Snap redirect
        window.location.assign(body.redirectUrl);
      } else {
        throw new Error(t('invalid_response'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('network_error'));
      setLoading(false);
    }
  }

  const defaultLabel = locale === 'en' ? 'Subscribe' : 'Berlangganan';

  return (
    <div className={cn(fullWidth && 'w-full')}>
      <Button
        type="button"
        onClick={handleClick}
        disabled={loading}
        variant={variant}
        size={size}
        className={cn(fullWidth && 'w-full', className)}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t('processing')}
          </>
        ) : (
          <>
            {children ?? defaultLabel}
            {showArrow && <ArrowRight className="w-4 h-4 ml-2" />}
          </>
        )}
      </Button>
      {error && (
        <p className="text-xs text-rose-600 dark:text-rose-400 mt-1.5" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
