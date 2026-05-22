'use client';

/**
 * Inline checkout orchestrator (true Stripe-like, 2026-05-22).
 *
 * Customer NEVER leaves babahalgo.com — Card / QRIS / VA semua rendered
 * di domain kita. Card via Xendit.js client tokenization (PCI-safe),
 * QRIS via qr_codes API, VA via callback_virtual_accounts API.
 *
 * State machine:
 *   picking → user pilih method, lihat order summary
 *   card_form → render <CardForm> (Xendit.js tokenize → server charge)
 *   qris → render <QrisDisplay> (QR + polling)
 *   va → render <VaDisplay> (account number + polling)
 *   success → redirect /portal/billing/success?order_id=...
 *   failed → show error + retry CTA
 *
 * E-wallet (OVO/DANA/ShopeePay/LinkAja) defer ke phase berikutnya
 * (butuh popup window deep-link pattern; akan diaktifkan setelah QRIS/VA
 * battle-tested di production).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Loader2, AlertCircle, ArrowLeft, ShieldCheck, Sparkles, RefreshCw,
  Receipt, ArrowRight, Tag, Lock, CreditCard, QrCode, Building2,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CardForm } from './card-form';
import { QrisDisplay } from './qris-display';
import { VaDisplay } from './va-display';

export type PaymentMethodCode =
  | 'CREDIT_CARD' | 'QRIS'
  | 'BCA' | 'BNI' | 'BSI' | 'BRI' | 'MANDIRI' | 'PERMATA';

type MethodCategory = 'card' | 'qris' | 'va';

interface MethodOption {
  code: PaymentMethodCode;
  category: MethodCategory;
  labelId: string;
  labelEn: string;
  hint?: { id: string; en: string };
}

const METHODS: MethodOption[] = [
  { code: 'CREDIT_CARD', category: 'card',
    labelId: 'Kartu Kredit / Debit',
    labelEn: 'Credit / Debit Card',
    hint: { id: 'Visa · Mastercard · JCB · AMEX', en: 'Visa · Mastercard · JCB · AMEX' } },
  { code: 'QRIS', category: 'qris',
    labelId: 'QRIS — GoPay, OVO, DANA, ShopeePay, semua bank',
    labelEn: 'QRIS — GoPay, OVO, DANA, ShopeePay, all banks',
    hint: {
      id: 'Scan dari aplikasi e-wallet manapun: GoPay · OVO · DANA · ShopeePay · LinkAja · BCA · Mandiri · BNI · BRI',
      en: 'Scan with any e-wallet app: GoPay · OVO · DANA · ShopeePay · LinkAja · BCA · Mandiri · BNI · BRI',
    } },
  { code: 'BCA', category: 'va', labelId: 'BCA Virtual Account', labelEn: 'BCA Virtual Account' },
  { code: 'BNI', category: 'va', labelId: 'BNI Virtual Account', labelEn: 'BNI Virtual Account' },
  { code: 'BRI', category: 'va', labelId: 'BRI Virtual Account', labelEn: 'BRI Virtual Account' },
  { code: 'MANDIRI', category: 'va', labelId: 'Mandiri Virtual Account', labelEn: 'Mandiri Virtual Account' },
  { code: 'BSI', category: 'va', labelId: 'BSI Virtual Account', labelEn: 'BSI Virtual Account' },
  { code: 'PERMATA', category: 'va', labelId: 'Permata Virtual Account', labelEn: 'Permata Virtual Account' },
];

function resolveDemoLink(service: 'signal' | 'crypto' | 'vps', locale: string): string | null {
  if (service === 'crypto') return `/${locale}/register?service=crypto&tier=demo&from=checkout`;
  if (service === 'signal') return `/${locale}/demo?product=robot-meta&from=checkout`;
  return null;
}

interface InlineCheckoutProps {
  tier: string;
  service: 'signal' | 'crypto' | 'vps';
  locale: string;
  promoSlug?: string;
}

interface PreviewResponse {
  tier: string;
  description: string;
  originalAmountIdr: number;
  amountIdr: number;
  amountUsd: number;
  discount: {
    id: string; slug: string;
    discountValue: number;
    discountType: 'PERCENT' | 'FIXED_IDR';
  } | null;
}

interface ChargeInstrument {
  id: string;
  method: PaymentMethodCode;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED' | 'REQUIRES_ACTION';
  qrString?: string;
  accountNumber?: string;
  bankCode?: string;
  actionUrl?: string;
  expiresAt?: string;
  amountIdr: number;
}

type CheckoutState =
  | { kind: 'picking' }
  | { kind: 'creating' }
  | { kind: 'card_form' }
  | { kind: 'qris'; orderId: string; instrument: ChargeInstrument }
  | { kind: 'va'; orderId: string; instrument: ChargeInstrument }
  | { kind: 'success'; orderId: string }
  | { kind: 'failed'; reason: string };

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
function fmtUsd(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}

function CategoryIcon({ cat, className }: { cat: MethodCategory; className?: string }) {
  switch (cat) {
    case 'card': return <CreditCard className={className} aria-hidden />;
    case 'qris': return <QrCode className={className} aria-hidden />;
    case 'va': return <Building2 className={className} aria-hidden />;
  }
}

export function InlineCheckout({ tier, service, locale, promoSlug }: InlineCheckoutProps) {
  const t = useTranslations('checkout');
  const isEn = locale === 'en';
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [previewStatus, setPreviewStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [previewErr, setPreviewErr] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethodCode>('CREDIT_CARD');
  const [state, setState] = useState<CheckoutState>({ kind: 'picking' });
  const startedRef = useRef(false);

  // Locale gate — non-ID hanya Card visible
  const availableMethods = useMemo<MethodOption[]>(() => {
    return isEn ? METHODS.filter((m) => m.code === 'CREDIT_CARD') : METHODS;
  }, [isEn]);

  const grouped = useMemo(() => {
    const map = new Map<MethodCategory, MethodOption[]>();
    for (const m of availableMethods) {
      if (!map.has(m.category)) map.set(m.category, []);
      map.get(m.category)!.push(m);
    }
    return map;
  }, [availableMethods]);

  // Auto-redirect side-effect when reaching success state. Lifted to
  // top-level (Rules of Hooks — useEffect must not be inside conditional
  // render branches).
  const successOrderId = state.kind === 'success' ? state.orderId : null;
  useEffect(() => {
    if (!successOrderId) return;
    window.location.href = `/${locale}/portal/billing/success?order_id=${encodeURIComponent(successOrderId)}`;
  }, [successOrderId, locale]);

  // Fetch preview on mount
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const sp = new URLSearchParams({ tier });
        if (promoSlug) sp.set('promo', promoSlug);
        const res = await fetch(`/api/billing/preview?${sp.toString()}`, {
          credentials: 'same-origin', cache: 'no-store',
        });

        if (res.status === 401) {
          const tierSlug = tier.toLowerCase().replace(/^(crypto|signal|vps)_/, '');
          window.location.href = `/${locale}/register?service=${service}&tier=${tierSlug}&from=checkout`;
          return;
        }

        const body = await res.json();
        if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
        setPreview(body as PreviewResponse);
        setPreviewStatus('ready');
      } catch (err) {
        setPreviewErr(err instanceof Error ? err.message : t('network_error'));
        setPreviewStatus('error');
      }
    })();
  }, [tier, service, locale, promoSlug, t]);

  // ─── Action handlers ─────────────────────────────────────────────
  async function handlePay() {
    if (!preview) return;

    // CARD → render inline form (Xendit.js tokenize happens in CardForm)
    if (method === 'CREDIT_CARD') {
      setState({ kind: 'card_form' });
      return;
    }

    // QRIS / VA → POST charge → render display
    setState({ kind: 'creating' });
    try {
      const res = await fetch('/api/billing/charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `charge_${crypto.randomUUID().replaceAll('-', '_')}`,
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          tier, paymentMethod: method,
          ...(promoSlug ? { promo: promoSlug } : {}),
        }),
      });

      if (res.status === 401) {
        const tierSlug = tier.toLowerCase().replace(/^(crypto|signal|vps)_/, '');
        window.location.href = `/${locale}/register?service=${service}&tier=${tierSlug}&from=checkout`;
        return;
      }

      const body = await res.json();
      if (!res.ok) {
        setState({ kind: 'failed', reason: body?.message ?? body?.error ?? `HTTP ${res.status}` });
        return;
      }

      const orderId = body.orderId as string;
      const instrument = body.instrument as ChargeInstrument;

      if (method === 'QRIS') {
        setState({ kind: 'qris', orderId, instrument });
      } else {
        setState({ kind: 'va', orderId, instrument });
      }
    } catch (err) {
      setState({ kind: 'failed', reason: err instanceof Error ? err.message : t('network_error') });
    }
  }

  // (Auto-redirect side-effect handled via top-level useEffect — see above.)

  // ─── PREVIEW ERROR ────────────────────────────────────────────────
  if (previewStatus === 'error') {
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
              <p className="text-sm text-muted-foreground break-words">{previewErr}</p>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button asChild variant="outline" size="sm" className="flex-1">
              <Link href={`/${locale}/pricing`}>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                {isEn ? 'Back' : 'Kembali'}
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
                      {isEn ? 'Try demo first?' : 'Coba demo dulu?'}
                    </p>
                    <Button asChild size="sm" className="w-full bg-amber-500 hover:bg-amber-600 text-amber-950">
                      <Link href={demoLink}>
                        <Sparkles className="w-4 h-4 mr-1.5" />
                        {isEn ? 'Free Demo' : 'Demo Gratis'}
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

  // ─── PREVIEW LOADING ──────────────────────────────────────────────
  if (previewStatus === 'loading' || !preview) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-8 space-y-4 text-center">
          <Loader2 className="w-10 h-10 mx-auto animate-spin text-amber-500" />
          <p className="text-sm text-muted-foreground">
            {isEn ? 'Preparing your secure checkout…' : 'Menyiapkan pembayaran aman…'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const tierLabel = TIER_LABEL[tier]?.[isEn ? 'en' : 'id'] ?? tier;
  const hasDiscount = preview.discount != null && preview.amountIdr < preview.originalAmountIdr;
  const discountAmount = preview.originalAmountIdr - preview.amountIdr;

  // ─── SUCCESS state (transient before redirect) ────────────────────
  if (state.kind === 'success') {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-8 space-y-4 text-center">
          <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500" />
          <h2 className="font-bold text-xl">{isEn ? 'Payment confirmed' : 'Pembayaran dikonfirmasi'}</h2>
          <p className="text-sm text-muted-foreground">
            {isEn ? 'Redirecting to your portal…' : 'Mengalihkan ke portal Anda…'}
          </p>
          <Loader2 className="w-5 h-5 mx-auto animate-spin text-amber-500" />
        </CardContent>
      </Card>
    );
  }

  // ─── FAILED state ─────────────────────────────────────────────────
  if (state.kind === 'failed') {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h1 className="font-semibold text-lg mb-1">
                {isEn ? 'Payment failed' : 'Pembayaran gagal'}
              </h1>
              <p className="text-sm text-muted-foreground break-words">{state.reason}</p>
            </div>
          </div>
          <Button type="button" size="sm" className="w-full" onClick={() => setState({ kind: 'picking' })}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            {isEn ? 'Try again' : 'Coba lagi'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ─── QRIS / VA display ────────────────────────────────────────────
  if (state.kind === 'qris' || state.kind === 'va') {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => setState({ kind: 'picking' })}
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {isEn ? 'Cancel and choose different method' : 'Batal & pilih metode lain'}
        </button>

        {state.kind === 'qris' ? (
          <QrisDisplay
            orderId={state.orderId}
            qrString={state.instrument.qrString!}
            amountIdr={state.instrument.amountIdr}
            expiresAt={state.instrument.expiresAt}
            locale={locale}
            onSucceeded={() => setState({ kind: 'success', orderId: state.orderId })}
            onFailed={(reason) => setState({ kind: 'failed', reason: reason ?? 'Payment expired or failed' })}
          />
        ) : (
          <VaDisplay
            orderId={state.orderId}
            accountNumber={state.instrument.accountNumber!}
            bankCode={state.instrument.bankCode ?? state.instrument.method}
            amountIdr={state.instrument.amountIdr}
            expiresAt={state.instrument.expiresAt}
            locale={locale}
            onSucceeded={() => setState({ kind: 'success', orderId: state.orderId })}
            onFailed={(reason) => setState({ kind: 'failed', reason: reason ?? 'Payment expired or failed' })}
          />
        )}
      </div>
    );
  }

  // ─── CARD FORM ────────────────────────────────────────────────────
  if (state.kind === 'card_form') {
    return (
      <div className="w-full max-w-md mx-auto">
        <Card>
          <CardContent className="p-6">
            <CardForm
              amountIdr={preview.amountIdr}
              tier={tier}
              locale={locale}
              promoSlug={promoSlug}
              onSucceeded={(orderId) => setState({ kind: 'success', orderId })}
              onFailed={(reason) => setState({ kind: 'failed', reason })}
              onCancel={() => setState({ kind: 'picking' })}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── CREATING (transient between pick and qris/va) ────────────────
  if (state.kind === 'creating') {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-8 space-y-4 text-center">
          <Loader2 className="w-10 h-10 mx-auto animate-spin text-amber-500" />
          <p className="text-sm text-muted-foreground">
            {isEn ? 'Creating your payment instrument…' : 'Membuat instrumen pembayaran…'}
          </p>
        </CardContent>
      </Card>
    );
  }

  // ─── PICKING (default) ────────────────────────────────────────────
  return (
    <div className="w-full max-w-5xl">
      <div className="grid lg:grid-cols-[1fr,420px] gap-5 lg:gap-6">
        {/* Method picker (left) */}
        <Card>
          <CardContent className="p-6 sm:p-7 space-y-5">
            <div className="flex items-start gap-3 pb-4 border-b border-border/60">
              <div className="shrink-0 rounded-xl bg-amber-500/10 border border-amber-500/30 p-2.5">
                <CreditCard className="h-5 w-5 text-amber-500" aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-amber-600 dark:text-amber-400 font-semibold mb-1">
                  {isEn ? 'Payment Method' : 'Metode Pembayaran'}
                </p>
                <h1 className="font-display text-xl font-bold leading-tight">
                  {isEn ? 'Choose how to pay' : 'Pilih cara bayar'}
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  {isEn
                    ? 'Pay securely on babahalgo.com — no redirect to gateway.'
                    : 'Bayar aman di babahalgo.com — tanpa redirect ke gateway eksternal.'}
                </p>
              </div>
            </div>

            {isEn ? (
              <MethodCardLarge
                option={availableMethods[0]}
                selected={method === availableMethods[0].code}
                onSelect={() => setMethod(availableMethods[0].code)}
                isEn
              />
            ) : (
              <div className="space-y-5">
                {grouped.get('card') && (
                  <MethodGroup
                    title={isEn ? 'Card' : 'Kartu'}
                    options={grouped.get('card')!}
                    method={method} setMethod={setMethod}
                    isEn={isEn} columns={1}
                  />
                )}
                {grouped.get('qris') && (
                  <MethodGroup
                    title={isEn ? 'QR Code' : 'QR Code'}
                    options={grouped.get('qris')!}
                    method={method} setMethod={setMethod}
                    isEn={isEn} columns={1}
                  />
                )}
                {grouped.get('va') && (
                  <MethodGroup
                    title={isEn ? 'Bank Transfer (Virtual Account)' : 'Transfer Bank (Virtual Account)'}
                    options={grouped.get('va')!}
                    method={method} setMethod={setMethod}
                    isEn={isEn} columns={2} compact
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order summary (right, sticky) */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-border/60">
                <Receipt className="h-4 w-4 text-amber-500" aria-hidden />
                <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-amber-600 dark:text-amber-400 font-semibold">
                  {isEn ? 'Order Summary' : 'Ringkasan Pesanan'}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-semibold leading-tight">{tierLabel}</p>
                <p className="text-[11px] text-muted-foreground">
                  {tier.startsWith('VPS_')
                    ? (isEn ? 'One-time setup' : 'Setup sekali bayar')
                    : (isEn ? '1 Month subscription' : '1 Bulan langganan')}
                </p>
              </div>

              <div className="space-y-2 text-sm pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{isEn ? 'Subtotal' : 'Subtotal'}</span>
                  <span className="font-mono tabular-nums">{fmtIdr(preview.originalAmountIdr)}</span>
                </div>
                {hasDiscount && preview.discount && (
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                    <span className="flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5" aria-hidden />
                      <span>
                        {isEn ? 'Discount' : 'Diskon'}
                        {preview.discount.discountType === 'PERCENT' && (
                          <span className="ml-1 text-xs">({preview.discount.discountValue}%)</span>
                        )}
                      </span>
                    </span>
                    <span className="font-mono tabular-nums">−{fmtIdr(discountAmount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-border/60">
                  <span className="font-semibold">{isEn ? 'Total' : 'Total'}</span>
                  <div className="text-right">
                    <span className="font-display text-2xl font-bold tabular-nums block">{fmtIdr(preview.amountIdr)}</span>
                    {isEn && (
                      <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
                        ≈ {fmtUsd(preview.amountUsd)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

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

              <Button
                type="button" size="lg"
                onClick={handlePay}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-amber-950 font-bold shadow-lg shadow-amber-500/20"
              >
                <Lock className="w-4 h-4 mr-1.5" aria-hidden />
                {isEn ? `Pay ${fmtIdr(preview.amountIdr)}` : `Bayar ${fmtIdr(preview.amountIdr)}`}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>

              <Button asChild variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-foreground">
                <Link href={`/${locale}/pricing`}>
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  {isEn ? 'Cancel' : 'Batal'}
                </Link>
              </Button>

              <div className="space-y-2 pt-3 border-t border-border/60">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
                  <span>{isEn ? 'PCI DSS Level 1 · 256-bit SSL encryption' : 'PCI DSS Level 1 · enkripsi SSL 256-bit'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
                  <span>{isEn ? 'Powered by Xendit · OJK licensed' : 'Powered by Xendit · berizin OJK'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

interface MethodCardLargeProps {
  option: MethodOption;
  selected: boolean;
  onSelect: () => void;
  isEn: boolean;
}

function MethodCardLarge({ option, selected, onSelect, isEn }: MethodCardLargeProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'w-full text-left rounded-xl border-2 p-5 transition-all',
        'flex items-center gap-4',
        selected
          ? 'border-amber-500 bg-amber-500/5 shadow-md shadow-amber-500/10'
          : 'border-border bg-card/40 hover:border-border/80 hover:bg-card/70',
      )}
    >
      <div className={cn(
        'h-12 w-12 rounded-xl flex items-center justify-center shrink-0',
        selected ? 'bg-amber-500/15 text-amber-500' : 'bg-muted/40 text-muted-foreground',
      )}>
        <CategoryIcon cat={option.category} className="h-6 w-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm sm:text-base font-bold leading-tight">
          {isEn ? option.labelEn : option.labelId}
        </p>
        {option.hint && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {isEn ? option.hint.en : option.hint.id}
          </p>
        )}
      </div>
      <div className={cn(
        'h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors',
        selected ? 'border-amber-500 bg-amber-500' : 'border-muted-foreground/40',
      )}>
        {selected && <div className="h-2 w-2 rounded-full bg-amber-950" />}
      </div>
    </button>
  );
}

interface MethodGroupProps {
  title: string;
  options: MethodOption[];
  method: PaymentMethodCode;
  setMethod: (m: PaymentMethodCode) => void;
  isEn: boolean;
  columns: 1 | 2 | 3;
  compact?: boolean;
}

function MethodGroup({ title, options, method, setMethod, isEn, columns, compact }: MethodGroupProps) {
  const gridCls = columns === 1 ? 'grid-cols-1'
                : columns === 2 ? 'grid-cols-1 sm:grid-cols-2'
                : 'grid-cols-1 sm:grid-cols-3';
  return (
    <div>
      <h2 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80 font-mono font-semibold mb-2">
        {title}
      </h2>
      <div className={cn('grid gap-2', gridCls)}>
        {options.map((opt) => {
          const selected = method === opt.code;
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => setMethod(opt.code)}
              aria-pressed={selected}
              className={cn(
                'text-left rounded-lg border-2 transition-all flex items-center gap-3',
                compact ? 'px-3 py-2.5' : 'px-4 py-3',
                selected
                  ? 'border-amber-500 bg-amber-500/5 shadow-sm shadow-amber-500/10'
                  : 'border-border bg-card/40 hover:border-border/80 hover:bg-card/60',
              )}
            >
              <div className={cn(
                'rounded-md flex items-center justify-center shrink-0',
                compact ? 'h-8 w-8' : 'h-10 w-10',
                selected ? 'bg-amber-500/15 text-amber-500' : 'bg-muted/40 text-muted-foreground',
              )}>
                <CategoryIcon cat={opt.category} className={cn(compact ? 'h-4 w-4' : 'h-5 w-5')} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('font-semibold leading-tight', compact ? 'text-xs sm:text-sm' : 'text-sm')}>
                  {isEn ? opt.labelEn : opt.labelId}
                </p>
                {opt.hint && !compact && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {isEn ? opt.hint.en : opt.hint.id}
                  </p>
                )}
              </div>
              {selected && (
                <CheckCircle2 className={cn('text-amber-500 shrink-0', compact ? 'h-4 w-4' : 'h-5 w-5')} aria-hidden />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
