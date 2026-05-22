'use client';

/**
 * E-wallet inline display + popup window UX.
 *
 * Strategy: open Xendit checkout_url di small popup window (500×700).
 * Customer authorize di e-wallet (push notif ke aplikasi, atau web login),
 * parent window poll status. Saat SUCCEEDED, popup auto-close + parent
 * redirect ke success.
 *
 * Mobile: kalau ada deeplink_url, render button "Buka aplikasi GoPay" yang
 * langsung deep-link ke app. Fallback ke popup web checkout.
 *
 * Supported channels (per Xendit /ewallets/charges):
 *   ID: GoPay, OVO, DANA, ShopeePay, LinkAja, AstraPay
 *   PH: GrabPay, GCash, Maya
 *   MY: GrabPay, TouchNGo
 *   SG: GrabPay
 */
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, AlertOctagon, ExternalLink, Smartphone, RefreshCw, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

interface EwalletDisplayProps {
  orderId: string;
  method: string;
  actionUrl: string;
  deeplinkUrl?: string | null;
  amountIdr: number;
  currency?: string;
  chargeAmount?: number;
  locale: string;
  onSucceeded: () => void;
  onFailed: (reason?: string) => void;
}

type PollStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED';

const WALLET_INFO: Record<string, { name: string; color: string; logo: string; country: string }> = {
  GOPAY:      { name: 'GoPay',      color: '#00AED6', logo: 'G',  country: 'ID' },
  OVO:        { name: 'OVO',        color: '#4C2A86', logo: 'O',  country: 'ID' },
  DANA:       { name: 'DANA',       color: '#118EEA', logo: 'D',  country: 'ID' },
  SHOPEEPAY:  { name: 'ShopeePay',  color: '#EE4D2D', logo: 'S',  country: 'ID' },
  LINKAJA:    { name: 'LinkAja',    color: '#E32024', logo: 'L',  country: 'ID' },
  ASTRAPAY:   { name: 'AstraPay',   color: '#00529C', logo: 'A',  country: 'ID' },
  GRABPAY_PH: { name: 'GrabPay',    color: '#00B14F', logo: 'G',  country: 'PH' },
  GRABPAY_MY: { name: 'GrabPay',    color: '#00B14F', logo: 'G',  country: 'MY' },
  GRABPAY_SG: { name: 'GrabPay',    color: '#00B14F', logo: 'G',  country: 'SG' },
  GCASH_PH:   { name: 'GCash',      color: '#007DFF', logo: 'G',  country: 'PH' },
  PAYMAYA_PH: { name: 'Maya',       color: '#7BD234', logo: 'M',  country: 'PH' },
  TOUCHNGO_MY:{ name: "Touch 'n Go",color: '#E32024', logo: 'T',  country: 'MY' },
};

function fmtCurrency(amount: number, currency: string): string {
  if (currency === 'IDR') return 'Rp ' + amount.toLocaleString('id-ID', { maximumFractionDigits: 0 });
  if (currency === 'USD') return '$' + amount.toFixed(2);
  if (currency === 'SGD') return 'S$' + amount.toFixed(2);
  if (currency === 'MYR') return 'RM ' + amount.toFixed(2);
  if (currency === 'PHP') return '₱' + amount.toFixed(2);
  return amount.toFixed(2) + ' ' + currency;
}

export function EwalletDisplay({
  orderId, method, actionUrl, deeplinkUrl, amountIdr, currency, chargeAmount,
  locale, onSucceeded, onFailed,
}: EwalletDisplayProps) {
  const isEn = locale === 'en';
  const wallet = WALLET_INFO[method] ?? { name: method, color: '#475569', logo: 'E', country: 'ID' };
  const displayCurrency = currency ?? 'IDR';
  const displayAmount = chargeAmount ?? amountIdr;
  const [status, setStatus] = useState<PollStatus>('PENDING');
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const popupRef = useRef<Window | null>(null);
  const pollTimer = useRef<number | null>(null);
  const tickTimer = useRef<number | null>(null);

  // Open popup on mount (first attempt — Chrome may block if not user-initiated)
  useEffect(() => {
    const popup = window.open(
      actionUrl,
      'xendit-ewallet-checkout',
      'width=500,height=720,resizable,scrollbars=yes',
    );
    if (popup) {
      popupRef.current = popup;
      try { popup.focus(); } catch { /* ignore */ }
    } else {
      // Browser blocked popup — necessary state update untuk render fallback button.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPopupBlocked(true);
    }
    return () => {
      try { popupRef.current?.close(); } catch { /* ignore */ }
    };
  }, [actionUrl]);

  // Elapsed-time ticker
  useEffect(() => {
    if (status !== 'PENDING') return;
    tickTimer.current = window.setInterval(() => setSecondsElapsed((s) => s + 1), 1000);
    return () => { if (tickTimer.current) clearInterval(tickTimer.current); };
  }, [status]);

  // Polling
  useEffect(() => {
    if (status !== 'PENDING') return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/billing/poll-status?orderId=${encodeURIComponent(orderId)}`, {
          credentials: 'same-origin', cache: 'no-store',
        });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json() as { status: PollStatus };
          if (data.status === 'SUCCEEDED') {
            setStatus('SUCCEEDED');
            try { popupRef.current?.close(); } catch { /* ignore */ }
            onSucceeded();
            return;
          }
          if (data.status === 'FAILED' || data.status === 'EXPIRED') {
            setStatus(data.status);
            try { popupRef.current?.close(); } catch { /* ignore */ }
            onFailed(data.status);
            return;
          }
        }
      } catch { /* keep polling */ }
      // Auto-fail kalau elapsed >15 menit (e-wallet usually expires in ~15min)
      if (!cancelled && secondsElapsed > 900) {
        setStatus('EXPIRED');
        onFailed('EXPIRED');
        return;
      }
      if (!cancelled) pollTimer.current = window.setTimeout(poll, 3000);
    };
    pollTimer.current = window.setTimeout(poll, 2000);

    return () => {
      cancelled = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [orderId, status, secondsElapsed, onSucceeded, onFailed]);

  function reopenPopup() {
    const popup = window.open(actionUrl, 'xendit-ewallet-checkout', 'width=500,height=720,resizable,scrollbars=yes');
    if (popup) {
      popupRef.current = popup;
      setPopupBlocked(false);
      try { popup.focus(); } catch { /* ignore */ }
    } else {
      setPopupBlocked(true);
    }
  }

  const isSettled = status === 'SUCCEEDED';
  const isErrored = status === 'FAILED' || status === 'EXPIRED';

  return (
    <div className="space-y-5">
      {/* Wallet header card */}
      <div className={cn(
        'relative rounded-2xl border-2 overflow-hidden transition-colors',
        isSettled ? 'border-emerald-500 bg-emerald-500/5'
          : isErrored ? 'border-rose-500/40 bg-rose-500/5'
          : 'border-amber-500/30 bg-amber-500/[0.03]',
      )}>
        {/* Status bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 bg-card/60">
          <div className="flex items-center gap-2">
            {isSettled ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {isEn ? 'PAYMENT CONFIRMED' : 'PEMBAYARAN DIKONFIRMASI'}
                </span>
              </>
            ) : isErrored ? (
              <>
                <AlertOctagon className="h-4 w-4 text-rose-500" />
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  {status === 'EXPIRED' ? (isEn ? 'EXPIRED' : 'KEDALUWARSA') : (isEn ? 'FAILED' : 'GAGAL')}
                </span>
              </>
            ) : (
              <>
                <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  {isEn ? 'WAITING FOR APPROVAL' : 'MENUNGGU PERSETUJUAN'}
                </span>
              </>
            )}
          </div>
          {status === 'PENDING' && (
            <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums text-foreground/70">
              <Clock className="h-3.5 w-3.5" />
              <span>{Math.floor(secondsElapsed / 60)}:{String(secondsElapsed % 60).padStart(2, '0')}</span>
            </div>
          )}
        </div>

        {/* Wallet badge */}
        <div className="px-5 py-5 flex items-center gap-4 border-b border-border/30">
          <div
            className="h-14 w-14 rounded-xl flex items-center justify-center text-white font-bold text-2xl shrink-0"
            style={{ backgroundColor: wallet.color }}
          >
            {wallet.logo}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/70 font-mono font-semibold">
              {isEn ? 'E-Wallet' : 'E-Wallet'} · {wallet.country}
            </p>
            <h3 className="font-bold text-lg sm:text-xl">{wallet.name}</h3>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">Order #{orderId}</p>
          </div>
        </div>

        {/* Amount */}
        <div className="px-5 py-4 text-center">
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/70 font-mono font-semibold mb-1">
            {isEn ? 'Charge Amount' : 'Nominal Pembayaran'}
          </p>
          <p className="font-display text-2xl sm:text-3xl font-bold tabular-nums">
            {fmtCurrency(displayAmount, displayCurrency)}
          </p>
        </div>

        {/* Success overlay */}
        {isSettled && (
          <div className="absolute inset-0 bg-emerald-500/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-white">
            <CheckCircle2 className="h-20 w-20" strokeWidth={2.5} />
            <p className="font-bold text-lg">{isEn ? 'Payment Confirmed' : 'Pembayaran Dikonfirmasi'}</p>
          </div>
        )}
      </div>

      {/* Action buttons (popup blocked OR mobile deep-link) */}
      {!isSettled && !isErrored && (
        <div className="space-y-3">
          {/* Mobile deeplink (kalau ada) */}
          {deeplinkUrl && (
            <a
              href={deeplinkUrl}
              className={cn(
                'flex items-center justify-center gap-2 w-full rounded-xl px-5 py-3.5',
                'text-sm font-bold transition-all md:hidden',
                'shadow-lg',
              )}
              style={{ backgroundColor: wallet.color, color: 'white' }}
            >
              <Smartphone className="h-4 w-4" />
              {isEn ? `Open ${wallet.name} app` : `Buka aplikasi ${wallet.name}`}
            </a>
          )}

          {/* Popup re-open button (kalau ke-block atau closed) */}
          {popupBlocked ? (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs">
              <p className="font-semibold text-amber-700 dark:text-amber-300 mb-2">
                {isEn ? 'Popup blocked by browser' : 'Popup diblokir browser'}
              </p>
              <Button type="button" size="sm" onClick={reopenPopup} className="w-full">
                <ExternalLink className="h-4 w-4 mr-1.5" />
                {isEn ? `Open ${wallet.name} checkout` : `Buka checkout ${wallet.name}`}
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={reopenPopup} className="w-full">
              <ExternalLink className="h-4 w-4 mr-1.5" />
              {isEn ? 'Re-open checkout window' : 'Buka ulang jendela checkout'}
            </Button>
          )}

          {/* Instructions */}
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <ol className="space-y-2 text-xs sm:text-sm text-foreground/80">
              {[
                isEn
                  ? `A checkout window opened for ${wallet.name}.`
                  : `Jendela checkout ${wallet.name} sudah terbuka.`,
                isEn
                  ? `Approve the payment in your ${wallet.name} app or web login.`
                  : `Setujui pembayaran di aplikasi ${wallet.name} atau login web.`,
                isEn
                  ? 'This page auto-updates when payment is confirmed.'
                  : 'Halaman ini akan update otomatis saat pembayaran berhasil.',
              ].map((step, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[11px] font-bold">{i + 1}</span>
                  <span className="leading-snug">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* Errored retry */}
      {isErrored && (
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href="/portal">
              {isEn ? 'Back to portal' : 'Kembali ke portal'}
            </Link>
          </Button>
          <Button type="button" size="sm" className="flex-1" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            {isEn ? 'Try again' : 'Coba lagi'}
          </Button>
        </div>
      )}
    </div>
  );
}
