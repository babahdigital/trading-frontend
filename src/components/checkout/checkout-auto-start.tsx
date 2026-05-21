'use client';

/**
 * Auto-start checkout — triggers POST /api/billing/checkout on mount
 * dan redirect ke gateway hosted page.
 *
 * UX:
 *   - Loading spinner + "Memproses pembayaran…" message
 *   - 401 → redirect ke /register dengan tier preserve
 *   - Error → display message + retry button + link kembali ke /pricing
 *
 * Idempotency: kalau user reload page setelah checkout already created,
 * backend will return existing invoice (idempotency key per session).
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Loader2, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { PaymentProvider } from '@/components/checkout/checkout-button';

interface CheckoutAutoStartProps {
  tier: string;
  provider: PaymentProvider;
  service: 'signal' | 'crypto' | 'vps';
  locale: string;
}

export function CheckoutAutoStart({ tier, provider, service, locale }: CheckoutAutoStartProps) {
  const t = useTranslations('checkout');
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);
  const isEn = locale === 'en';

  useEffect(() => {
    // Guard against double-fire di StrictMode dev + page revisit
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const res = await fetch('/api/billing/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ tier, provider }),
        });

        if (res.status === 401) {
          const tierSlug = tier.toLowerCase().replace(/^(crypto|signal|vps)_/, '');
          window.location.href = `/${locale}/register?service=${service}&tier=${tierSlug}&from=checkout`;
          return;
        }

        const body = await res.json();
        if (!res.ok) {
          throw new Error(body.message || body.error || `HTTP ${res.status}`);
        }

        setStatus('redirecting');

        if (body.invoiceUrl) {
          window.location.assign(body.invoiceUrl);
        } else if (body.redirectUrl) {
          window.location.assign(body.redirectUrl);
        } else {
          throw new Error(t('invalid_response'));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('network_error'));
        setStatus('error');
      }
    })();
  }, [tier, provider, service, locale, t]);

  if (status === 'error') {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <h1 className="font-semibold text-lg mb-1">
                {isEn ? 'Checkout error' : 'Gangguan checkout'}
              </h1>
              <p className="text-sm text-muted-foreground break-words">{error}</p>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/${locale}/pricing`}>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                {isEn ? 'Back to pricing' : 'Kembali ke pricing'}
              </Link>
            </Button>
            <Button type="button" size="sm" onClick={() => window.location.reload()}>
              {isEn ? 'Retry' : 'Coba lagi'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardContent className="p-8 space-y-4 text-center">
        <Loader2 className="w-10 h-10 mx-auto animate-spin text-amber-500" />
        <h1 className="font-semibold text-lg">
          {status === 'redirecting' ? t('redirect_payment') : t('processing')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isEn
            ? `Preparing your secure checkout via ${provider === 'xendit' ? 'Xendit' : 'Midtrans'}…`
            : `Menyiapkan checkout aman via ${provider === 'xendit' ? 'Xendit' : 'Midtrans'}…`}
        </p>
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-2 border-t border-border/60">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{t('secure_checkout')}</span>
        </div>
      </CardContent>
    </Card>
  );
}
