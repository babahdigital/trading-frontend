'use client';

/**
 * Checkout — transparent breakdown SEBELUM redirect ke gateway.
 *
 * Refactor 2026-05-21 (Pak Abdullah directive math transparency): sebelumnya
 * auto-redirect tanpa show angka. Sekarang dua-fase:
 *   1) Create invoice via POST /api/billing/checkout (mount)
 *   2) Display breakdown card: tier · harga normal · diskon · total
 *   3) User klik "Bayar Sekarang" → redirect ke gateway hosted page
 *
 * Bila ada deep-link tier yang demo/free → langsung skip (caller decide).
 * Error state preserved (retry + back + demo fallback).
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Loader2, AlertCircle, ArrowLeft, ShieldCheck, Sparkles, RefreshCw, Receipt, ArrowRight, Tag, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { PaymentProvider } from '@/components/checkout/checkout-button';

function resolveDemoLink(service: 'signal' | 'crypto' | 'vps', locale: string): string | null {
  if (service === 'crypto') return `/${locale}/register?service=crypto&tier=demo&from=checkout`;
  if (service === 'signal') return `/${locale}/demo?product=robot-meta&from=checkout`;
  return null;
}

interface CheckoutAutoStartProps {
  tier: string;
  provider: PaymentProvider;
  service: 'signal' | 'crypto' | 'vps';
  locale: string;
}

interface InvoiceResponse {
  orderId: string;
  provider: 'xendit' | 'midtrans';
  invoiceUrl?: string;
  redirectUrl?: string;
  invoiceId?: string;
  snapToken?: string;
  amountIdr: number;
  originalAmountIdr: number;
  discount?: {
    id: string;
    slug: string;
    discountType: 'PERCENT' | 'FIXED_IDR';
    discountValue: number;
    discountPercent?: number;
    discountFixedIdr?: number;
  } | null;
}

const TIER_LABEL: Record<string, { id: string; en: string }> = {
  SIGNAL_STARTER: { id: 'Tier 1 · Swing (MT5 Signal)',  en: 'Tier 1 · Swing (MT5 Signal)' },
  SIGNAL_PRO:     { id: 'Tier 2 · Scalping (MT5 Signal)', en: 'Tier 2 · Scalping (MT5 Signal)' },
  SIGNAL_VIP:     { id: 'Tier 3 · All-In (MT5 Signal)',  en: 'Tier 3 · All-In (MT5 Signal)' },
  CRYPTO_STARTER: { id: 'Crypto Starter — Binance Bot',  en: 'Crypto Starter — Binance Bot' },
  CRYPTO_ACTIVE:  { id: 'Crypto Active — Binance Bot',   en: 'Crypto Active — Binance Bot' },
  CRYPTO_PRO:     { id: 'Crypto Pro — Binance Bot',      en: 'Crypto Pro — Binance Bot' },
  CRYPTO_HNWI:    { id: 'Crypto HNWI — Binance Bot',     en: 'Crypto HNWI — Binance Bot' },
  VPS_STANDARD:   { id: 'VPS License Only — Setup',      en: 'VPS License Only — Setup' },
  VPS_PREMIUM:    { id: 'VPS Hybrid — Setup',            en: 'VPS Hybrid — Setup' },
  VPS_DEDICATED:  { id: 'VPS Full Turnkey — Setup',      en: 'VPS Full Turnkey — Setup' },
};

function fmtIdr(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

export function CheckoutAutoStart({ tier, provider, service, locale }: CheckoutAutoStartProps) {
  const t = useTranslations('checkout');
  const [status, setStatus] = useState<'loading' | 'ready' | 'redirecting' | 'error'>('loading');
  const [invoice, setInvoice] = useState<InvoiceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);
  const isEn = locale === 'en';

  useEffect(() => {
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

        const rawText = await res.text();
        let body: Partial<InvoiceResponse> & { message?: string; error?: string } = {};
        try {
          body = rawText ? JSON.parse(rawText) : {};
        } catch {
          body = { error: 'server_error', message: rawText.slice(0, 200) || `HTTP ${res.status}` };
        }
        if (!res.ok) {
          throw new Error(body.message || body.error || `HTTP ${res.status}`);
        }

        if (!body.invoiceUrl && !body.redirectUrl) {
          throw new Error(t('invalid_response'));
        }

        setInvoice(body as InvoiceResponse);
        setStatus('ready');
      } catch (err) {
        setError(err instanceof Error ? err.message : t('network_error'));
        setStatus('error');
      }
    })();
  }, [tier, provider, service, locale, t]);

  // ─── ERROR STATE ─────────────────────────────────────────
  if (status === 'error') {
    const demoLink = resolveDemoLink(service, locale);
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h1 className="font-semibold text-lg mb-1">
                {isEn ? 'Checkout error' : 'Gangguan checkout'}
              </h1>
              <p className="text-sm text-muted-foreground break-words">{error}</p>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button asChild variant="outline" size="sm" className="flex-1">
              <Link href={`/${locale}/pricing`}>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                {isEn ? 'Back to pricing' : 'Kembali ke pricing'}
              </Link>
            </Button>
            <Button type="button" size="sm" className="flex-1" onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-1.5" />
              {isEn ? 'Retry' : 'Coba lagi'}
            </Button>
          </div>
          {demoLink && (
            <div className="pt-4 mt-2 border-t border-border/60">
              <div className="rounded-md bg-amber-500/5 border border-amber-500/20 p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold mb-1">
                      {isEn ? 'Not sure yet? Try the demo first.' : 'Belum yakin? Coba demo dulu.'}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                      {isEn
                        ? service === 'crypto'
                          ? '30 days free · $5,000 sim wallet · no credit card · no real-capital risk.'
                          : '7-day MT5 demo · full signal preview · no credit card · risk-free.'
                        : service === 'crypto'
                          ? '30 hari gratis · wallet simulasi $5.000 · tanpa kartu kredit · tanpa risiko.'
                          : 'Demo MT5 7 hari · preview signal lengkap · tanpa kartu kredit · zero risk.'}
                    </p>
                    <Button asChild variant="default" size="sm" className="w-full bg-amber-500 hover:bg-amber-600 text-amber-950">
                      <Link href={demoLink}>
                        <Sparkles className="w-4 h-4 mr-1.5" />
                        {isEn ? 'Try Demo Free' : 'Coba Demo Gratis'}
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ─── LOADING STATE ───────────────────────────────────────
  if (status === 'loading' || status === 'redirecting') {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-8 space-y-4 text-center">
          <Loader2 className="w-10 h-10 mx-auto animate-spin text-amber-500" />
          <h1 className="font-semibold text-lg">
            {status === 'redirecting' ? t('redirect_payment') : t('processing')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEn ? 'Preparing your secure checkout…' : 'Menyiapkan pembayaran aman…'}
          </p>
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-2 border-t border-border/60">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t('secure_checkout')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── READY STATE — show breakdown + Pay button ────────────
  if (!invoice) return null;
  const tierLabel = TIER_LABEL[tier]?.[isEn ? 'en' : 'id'] ?? tier;
  const hasDiscount = invoice.discount != null && invoice.amountIdr < invoice.originalAmountIdr;
  const discountAmount = invoice.originalAmountIdr - invoice.amountIdr;
  const handlePay = () => {
    setStatus('redirecting');
    const target = invoice.invoiceUrl ?? invoice.redirectUrl;
    if (target) window.location.assign(target);
  };

  return (
    <Card className="w-full max-w-lg">
      <CardContent className="p-6 sm:p-7 space-y-5">
        {/* Header */}
        <div className="flex items-start gap-3 pb-4 border-b border-border/60">
          <div className="shrink-0 rounded-xl bg-amber-500/10 border border-amber-500/30 p-2.5">
            <Receipt className="h-5 w-5 text-amber-500" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-amber-600 dark:text-amber-400 font-semibold mb-1">
              {isEn ? 'Order Summary' : 'Ringkasan Pesanan'}
            </p>
            <h1 className="font-display text-xl font-bold leading-tight">
              {isEn ? 'Confirm your purchase' : 'Konfirmasi pembelian'}
            </h1>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              {isEn ? 'Order' : 'Order'} #{invoice.orderId}
            </p>
          </div>
        </div>

        {/* Item */}
        <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">{tierLabel}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {tier.startsWith('VPS_')
                  ? (isEn ? 'One-time setup' : 'Setup sekali bayar')
                  : (isEn ? '1 Month subscription' : '1 Bulan langganan')}
              </p>
            </div>
            <span className="text-sm font-mono tabular-nums shrink-0">{fmtIdr(invoice.originalAmountIdr)}</span>
          </div>
        </div>

        {/* Breakdown lines */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{isEn ? 'Subtotal' : 'Subtotal'}</span>
            <span className="font-mono tabular-nums">{fmtIdr(invoice.originalAmountIdr)}</span>
          </div>
          {hasDiscount && invoice.discount && (
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <span className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" aria-hidden />
                <span>
                  {isEn ? 'Discount' : 'Diskon'}
                  {invoice.discount.discountType === 'PERCENT' && (
                    <span className="ml-1 text-xs">({invoice.discount.discountValue}%)</span>
                  )}
                </span>
              </span>
              <span className="font-mono tabular-nums">−{fmtIdr(discountAmount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-3 border-t border-border/60">
            <span className="font-semibold">{isEn ? 'Total Payment' : 'Total Pembayaran'}</span>
            <span className="font-display text-2xl font-bold tabular-nums">{fmtIdr(invoice.amountIdr)}</span>
          </div>
        </div>

        {/* Discount celebration banner kalau ada diskon */}
        {hasDiscount && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs flex items-start gap-2">
            <Tag className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden />
            <span className="text-emerald-800 dark:text-emerald-200">
              {isEn
                ? `You're saving ${fmtIdr(discountAmount)} with this promo.`
                : `Anda hemat ${fmtIdr(discountAmount)} dengan promo ini.`}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href={`/${locale}/pricing`}>
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              {isEn ? 'Cancel' : 'Batal'}
            </Link>
          </Button>
          <Button
            type="button"
            size="sm"
            className="flex-1 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-amber-950 font-semibold shadow-md"
            onClick={handlePay}
          >
            {isEn ? 'Pay now' : 'Bayar sekarang'}
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>

        {/* Security note */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pt-3 border-t border-border/60">
          <Lock className="h-3 w-3" aria-hidden />
          <span>{isEn ? 'Secure payment · 256-bit SSL · multiple Indonesian banks & e-wallets' : 'Pembayaran aman · SSL 256-bit · bank & e-wallet Indonesia'}</span>
        </div>
      </CardContent>
    </Card>
  );
}
