'use client';

/**
 * Inline card form — Xendit.js client tokenization + 3DS redirect.
 *
 * Flow:
 *   1. Load Xendit.js v1 (https://js.xendit.co/v1/xendit.min.js) on mount
 *   2. Customer types card details (no card data ever hits our server — PCI)
 *   3. Submit → Xendit.card.createToken() returns token_id
 *   4. POST token_id ke /api/billing/charge → server credit_card_charges
 *   5. Response: status=SUCCEEDED → onSucceeded
 *               status=REQUIRES_ACTION → redirect ke 3DS authentication_url
 *               status=FAILED → onFailed
 *
 * PCI compliance: card number/CVV NEVER leave browser memory ke server kita.
 * Tokenization happens entirely client-side via Xendit.js SDK loaded dari
 * js.xendit.co (PCI DSS Level 1 certified).
 */
import { useEffect, useRef, useState } from 'react';
import { Loader2, CreditCard, Lock, AlertCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CardFormProps {
  amountIdr: number;
  tier: string;
  locale: string;
  promoSlug?: string;
  /** Customer email — required by Xendit Card API as card_holder_email */
  customerEmail: string;
  onSucceeded: (orderId: string) => void;
  onFailed: (reason: string) => void;
  onCancel: () => void;
}

// Xendit.js SDK global type
declare global {
  interface Window {
    Xendit?: {
      setPublishableKey: (key: string) => void;
      card: {
        createToken: (
          params: Record<string, unknown>,
          callback: (err: { message?: string; code?: string } | null, token?: XenditToken) => void,
        ) => void;
      };
    };
  }
}

interface XenditToken {
  id: string;
  status: 'APPROVED' | 'IN_REVIEW' | 'FAILED' | 'VERIFIED';
  authentication_id?: string;
  payer_authentication_url?: string;
  failure_reason?: string;
  message?: string;
}

function fmtIdr(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

function formatCardNumber(value: string): string {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
}

function detectCardBrand(num: string): 'visa' | 'mastercard' | 'amex' | 'jcb' | 'unknown' {
  const digits = num.replace(/\D/g, '');
  if (/^4/.test(digits)) return 'visa';
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return 'mastercard';
  if (/^3[47]/.test(digits)) return 'amex';
  if (/^35/.test(digits)) return 'jcb';
  return 'unknown';
}

export function CardForm({ amountIdr, tier, locale, promoSlug, customerEmail, onSucceeded, onFailed, onCancel }: CardFormProps) {
  const isEn = locale === 'en';
  const [sdkReady, setSdkReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Form state — keep card data ONLY in component memory (never persist)
  const [number, setNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvn, setCvn] = useState('');
  const [holder, setHolder] = useState('');
  const numberRef = useRef<HTMLInputElement | null>(null);

  // Load Xendit.js SDK + configure publishable key
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const cfg = await fetch('/api/billing/xendit-config', { credentials: 'same-origin' });
        if (!cfg.ok) throw new Error('Xendit config unavailable');
        const { publicKey } = await cfg.json() as { publicKey: string };

        // Inject SDK if not already present
        const existing = document.querySelector<HTMLScriptElement>('script[src*="js.xendit.co/v1/xendit.min.js"]');
        if (!existing) {
          const s = document.createElement('script');
          s.src = 'https://js.xendit.co/v1/xendit.min.js';
          s.async = true;
          s.onload = () => {
            if (cancelled) return;
            if (window.Xendit) {
              window.Xendit.setPublishableKey(publicKey);
              setSdkReady(true);
            } else {
              setErr(isEn ? 'Payment SDK failed to load' : 'Gagal memuat SDK pembayaran');
            }
          };
          s.onerror = () => !cancelled && setErr(isEn ? 'Failed to load payment SDK' : 'Gagal memuat SDK pembayaran');
          document.body.appendChild(s);
        } else if (window.Xendit) {
          window.Xendit.setPublishableKey(publicKey);
          setSdkReady(true);
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : 'Init failed');
        }
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [isEn]);

  // Card-number formatter
  function onNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNumber(formatCardNumber(e.target.value));
  }

  const brand = detectCardBrand(number);
  const digits = number.replace(/\D/g, '');
  const isCardValid = digits.length >= 13 && digits.length <= 16;
  const isExpValid = /^(0[1-9]|1[0-2])$/.test(expMonth) && /^\d{4}$/.test(expYear) && parseInt(expYear, 10) >= new Date().getFullYear();
  const isCvnValid = /^\d{3,4}$/.test(cvn);
  const isHolderValid = holder.trim().length >= 2;
  const canSubmit = sdkReady && !submitting && isCardValid && isExpValid && isCvnValid && isHolderValid;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !window.Xendit) return;
    setSubmitting(true);
    setErr(null);

    try {
      // Step 1: tokenize via Xendit.js (client-side, PCI-safe)
      const token = await new Promise<XenditToken>((resolve, reject) => {
        window.Xendit!.card.createToken({
          amount: amountIdr,
          card_number: digits,
          card_exp_month: expMonth,
          card_exp_year: expYear,
          card_cvn: cvn,
          card_holder_first_name: holder.trim().split(' ')[0] ?? holder,
          card_holder_last_name: holder.trim().split(' ').slice(1).join(' ') || holder,
          // Xendit Card API requires card_holder_email OR card_holder_phone_number.
          // We always pass email (customer logged-in user). Phone optional.
          card_holder_email: customerEmail,
          is_multiple_use: false,
          should_authenticate: true,
          currency: 'IDR',
        }, (xerr, tok) => {
          if (xerr || !tok) {
            reject(new Error(xerr?.message ?? 'Tokenization failed'));
            return;
          }
          resolve(tok);
        });
      });

      // Step 2: 3DS challenge if needed (Xendit returns auth URL we must redirect to)
      if (token.status === 'IN_REVIEW' && token.payer_authentication_url) {
        // Store pending charge context for return handler
        try {
          sessionStorage.setItem('checkout.pending_3ds', JSON.stringify({
            tokenId: token.id,
            authenticationId: token.authentication_id,
            tier, promoSlug, amountIdr,
          }));
        } catch { /* sessionStorage disabled */ }
        window.location.href = token.payer_authentication_url;
        return;
      }

      if (token.status === 'FAILED') {
        throw new Error(token.failure_reason ?? token.message ?? (isEn ? 'Card declined' : 'Kartu ditolak'));
      }

      // Step 3: POST token to /api/billing/charge
      const res = await fetch('/api/billing/charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `charge_${crypto.randomUUID().replaceAll('-', '_')}`,
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          tier,
          paymentMethod: 'CREDIT_CARD',
          tokenId: token.id,
          authenticationId: token.authentication_id,
          ...(promoSlug ? { promo: promoSlug } : {}),
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.message || body?.error || `HTTP ${res.status}`);
      }
      const instrument = body.instrument as { status: string; actionUrl?: string };

      if (instrument.status === 'SUCCEEDED') {
        onSucceeded(body.orderId as string);
      } else if (instrument.status === 'REQUIRES_ACTION' && instrument.actionUrl) {
        // Backend-side 3DS (rare since we asked for client tokenization 3DS)
        window.location.href = instrument.actionUrl;
      } else if (instrument.status === 'FAILED') {
        throw new Error(isEn ? 'Charge declined by issuer' : 'Pembayaran ditolak penerbit kartu');
      } else {
        // PENDING — server-side processing, redirect to success page polling
        onSucceeded(body.orderId as string);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setErr(msg);
      onFailed(msg);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-border/40">
        <CreditCard className="h-5 w-5 text-amber-500" aria-hidden />
        <div className="flex-1">
          <p className="font-bold text-sm">{isEn ? 'Card Details' : 'Detail Kartu'}</p>
          <p className="text-[11px] text-muted-foreground">
            {isEn ? 'Card data is tokenized client-side · PCI DSS Level 1' : 'Data kartu di-tokenize di browser · PCI DSS Level 1'}
          </p>
        </div>
      </div>

      {/* Card holder */}
      <div>
        <label className="block text-xs font-semibold mb-1.5 text-foreground/85">
          {isEn ? 'Cardholder name' : 'Nama pemegang kartu'}
        </label>
        <input
          type="text"
          autoComplete="cc-name"
          required
          value={holder}
          onChange={(e) => setHolder(e.target.value)}
          placeholder={isEn ? 'Name on card' : 'Nama pada kartu'}
          className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60"
        />
      </div>

      {/* Card number */}
      <div>
        <label className="block text-xs font-semibold mb-1.5 text-foreground/85">
          {isEn ? 'Card number' : 'Nomor kartu'}
        </label>
        <div className="relative">
          <input
            ref={numberRef}
            type="text"
            inputMode="numeric"
            autoComplete="cc-number"
            required
            value={number}
            onChange={onNumberChange}
            placeholder="1234 5678 9012 3456"
            className="w-full rounded-lg border border-border bg-background pl-3.5 pr-14 py-2.5 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60"
          />
          <span className={cn(
            'absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider',
            brand === 'unknown' ? 'text-muted-foreground/40' : 'text-amber-600 dark:text-amber-400',
          )}>
            {brand === 'unknown' ? 'CARD' : brand.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Expiry + CVN */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1.5 text-foreground/85">
            {isEn ? 'Month' : 'Bulan'}
          </label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="cc-exp-month"
            required
            maxLength={2}
            value={expMonth}
            onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
            placeholder="MM"
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-mono tabular-nums text-center focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5 text-foreground/85">
            {isEn ? 'Year' : 'Tahun'}
          </label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="cc-exp-year"
            required
            maxLength={4}
            value={expYear}
            onChange={(e) => setExpYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="YYYY"
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-mono tabular-nums text-center focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5 text-foreground/85">
            CVV
          </label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="cc-csc"
            required
            maxLength={4}
            value={cvn}
            onChange={(e) => setCvn(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="123"
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-mono tabular-nums text-center focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60"
          />
        </div>
      </div>

      {/* SDK loading state */}
      {!sdkReady && !err && (
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          {isEn ? 'Loading secure payment SDK…' : 'Memuat SDK pembayaran…'}
        </div>
      )}

      {/* Error */}
      {err && (
        <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-xs flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
          <span className="text-rose-700 dark:text-rose-200 break-words">{err}</span>
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        size="lg"
        disabled={!canSubmit}
        className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-amber-950 font-bold shadow-lg shadow-amber-500/20 disabled:opacity-60 disabled:shadow-none"
      >
        {submitting ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {isEn ? 'Processing payment…' : 'Memproses pembayaran…'}</>
        ) : (
          <><Lock className="h-4 w-4 mr-1.5" /> {isEn ? `Pay ${fmtIdr(amountIdr)}` : `Bayar ${fmtIdr(amountIdr)}`}</>
        )}
      </Button>

      {/* Back */}
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 disabled:opacity-50"
      >
        ← {isEn ? 'Choose different payment method' : 'Pilih metode pembayaran lain'}
      </button>

      {/* Trust */}
      <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/80 pt-2 border-t border-border/40">
        <ShieldCheck className="h-3 w-3 text-emerald-500" />
        <span>{isEn ? 'Tokenized via Xendit.js · 3D Secure when required' : 'Token via Xendit.js · 3D Secure jika diperlukan'}</span>
      </div>
    </form>
  );
}
