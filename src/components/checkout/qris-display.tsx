'use client';

/**
 * QRIS inline display + status polling.
 *
 * Customer scan QR code via any QRIS-compatible wallet/banking app
 * (OVO, DANA, ShopeePay, BCA Mobile, Mandiri Livin, dst). Status
 * polling tiap 3s sampai SUCCEEDED/FAILED/EXPIRED.
 *
 * QR PNG di-render client-side via `qrcode` lib supaya tidak server
 * roundtrip tiap render. SVG dataURL embedded di <img>.
 */
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { CheckCircle2, Loader2, AlertOctagon, Smartphone, Clock, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

interface QrisDisplayProps {
  orderId: string;
  qrString: string;
  amountIdr: number;
  expiresAt?: string | null;
  locale: string;
  onSucceeded: () => void;
  onFailed: (reason?: string) => void;
}

type PollStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED';

function fmtIdr(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

function fmtCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function QrisDisplay({ orderId, qrString, amountIdr, expiresAt, locale, onSucceeded, onFailed }: QrisDisplayProps) {
  const isEn = locale === 'en';
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<PollStatus>('PENDING');
  const [pollErr, setPollErr] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(() => {
    if (!expiresAt) return 30 * 60 * 1000;
    return Math.max(0, new Date(expiresAt).getTime() - Date.now());
  });
  const pollTimer = useRef<number | null>(null);
  const tickTimer = useRef<number | null>(null);

  // Render QR PNG once
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(qrString, {
      errorCorrectionLevel: 'M',
      margin: 1,
      scale: 8,
      color: { dark: '#0B1220', light: '#FFFFFF' },
    }).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    }).catch(() => {
      if (!cancelled) setPollErr(isEn ? 'Failed to render QR code' : 'Gagal menampilkan QR');
    });
    return () => { cancelled = true; };
  }, [qrString, isEn]);

  // Expiry countdown ticker
  useEffect(() => {
    tickTimer.current = window.setInterval(() => {
      setRemainingMs((prev) => {
        const next = prev - 1000;
        if (next <= 0 && status === 'PENDING') {
          setStatus('EXPIRED');
        }
        return Math.max(0, next);
      });
    }, 1000);
    return () => {
      if (tickTimer.current) clearInterval(tickTimer.current);
    };
  }, [status]);

  // Status polling — every 3s while PENDING
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
            onSucceeded();
            return;
          }
          if (data.status === 'FAILED' || data.status === 'EXPIRED') {
            setStatus(data.status);
            onFailed(data.status);
            return;
          }
        }
      } catch {
        // ignore — keep polling
      }
      if (!cancelled) pollTimer.current = window.setTimeout(poll, 3000);
    };
    pollTimer.current = window.setTimeout(poll, 2000);

    return () => {
      cancelled = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [orderId, status, onSucceeded, onFailed]);

  const isSettled = status === 'SUCCEEDED';
  const isErrored = status === 'FAILED' || status === 'EXPIRED';

  return (
    <div className="space-y-5">
      {/* QR Card */}
      <div className={cn(
        'relative rounded-2xl border-2 overflow-hidden transition-colors',
        isSettled ? 'border-emerald-500 bg-emerald-500/5'
          : isErrored ? 'border-rose-500/40 bg-rose-500/5'
          : 'border-amber-500/30 bg-amber-500/[0.03]',
      )}>
        {/* Top bar with status + countdown */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 bg-card/60">
          <div className="flex items-center gap-2">
            {isSettled ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {isEn ? 'PAYMENT RECEIVED' : 'PEMBAYARAN DITERIMA'}
                </span>
              </>
            ) : isErrored ? (
              <>
                <AlertOctagon className="h-4 w-4 text-rose-500" />
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  {status === 'EXPIRED'
                    ? (isEn ? 'EXPIRED' : 'KEDALUWARSA')
                    : (isEn ? 'FAILED' : 'GAGAL')}
                </span>
              </>
            ) : (
              <>
                <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  {isEn ? 'WAITING FOR PAYMENT' : 'MENUNGGU PEMBAYARAN'}
                </span>
              </>
            )}
          </div>
          {status === 'PENDING' && (
            <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums text-foreground/70">
              <Clock className="h-3.5 w-3.5" />
              <span>{fmtCountdown(remainingMs)}</span>
            </div>
          )}
        </div>

        {/* QR */}
        <div className="p-6 flex flex-col items-center">
          {qrDataUrl ? (
            <div className="relative">
              <div className="rounded-xl bg-white p-4 shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="QRIS" className="block w-56 h-56 sm:w-64 sm:h-64" />
              </div>
              {isSettled && (
                <div className="absolute inset-0 rounded-xl bg-emerald-500/85 flex items-center justify-center backdrop-blur-sm">
                  <CheckCircle2 className="h-20 w-20 text-white" strokeWidth={2.5} />
                </div>
              )}
              {isErrored && (
                <div className="absolute inset-0 rounded-xl bg-rose-500/85 flex items-center justify-center backdrop-blur-sm">
                  <AlertOctagon className="h-20 w-20 text-white" strokeWidth={2.5} />
                </div>
              )}
            </div>
          ) : pollErr ? (
            <div className="text-sm text-rose-500 py-12">{pollErr}</div>
          ) : (
            <div className="w-56 h-56 sm:w-64 sm:h-64 bg-muted/40 animate-pulse rounded-xl" />
          )}

          {/* Amount */}
          <div className="mt-5 text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 font-mono font-semibold mb-1">
              {isEn ? 'Total Payment' : 'Total Pembayaran'}
            </p>
            <p className="font-display text-2xl sm:text-3xl font-bold tabular-nums">{fmtIdr(amountIdr)}</p>
            <p className="text-[11px] text-muted-foreground mt-1 font-mono">Order #{orderId}</p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      {!isSettled && !isErrored && (
        <div className="rounded-xl border border-border/60 bg-card/40 p-5">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-amber-500" />
            {isEn ? 'How to pay' : 'Cara bayar'}
          </h3>
          <ol className="space-y-2 text-xs sm:text-sm text-foreground/80">
            {[
              isEn ? 'Open any QRIS-compatible app: OVO, DANA, ShopeePay, BCA Mobile, Mandiri Livin, BNI Mobile, BRImo.'
                   : 'Buka aplikasi QRIS apapun: OVO, DANA, ShopeePay, BCA Mobile, Mandiri Livin, BNI Mobile, BRImo.',
              isEn ? 'Tap "Scan QR" or "Pay with QR".' : 'Pilih menu "Scan QR" atau "Bayar dengan QR".',
              isEn ? 'Scan the QR code above and confirm the amount.' : 'Scan QR di atas dan konfirmasi nominal.',
              isEn ? 'After successful payment, this page will auto-update.' : 'Setelah pembayaran berhasil, halaman ini akan otomatis update.',
            ].map((step, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[11px] font-bold">{i + 1}</span>
                <span className="leading-snug">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Errored — Retry CTA */}
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
