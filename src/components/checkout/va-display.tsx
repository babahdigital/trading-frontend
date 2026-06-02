'use client';

/**
 * Virtual Account inline display + status polling.
 *
 * Customer copy nomor VA, transfer via mobile banking / ATM / internet
 * banking. Polling tiap 5s sampai SUCCEEDED/FAILED/EXPIRED.
 *
 * Per-bank instructions di-render dari static mapping (BCA/BNI/BRI/dll).
 */
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, AlertOctagon, Copy, Check, Clock, Building2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { BANK_INFO } from '@/lib/design/payment-brand-colors';

interface VaDisplayProps {
  orderId: string;
  accountNumber: string;
  bankCode: string;
  amountIdr: number;
  expiresAt?: string | null;
  locale: string;
  onSucceeded: () => void;
  onFailed: (reason?: string) => void;
}

type PollStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED';

const BANK_INSTRUCTIONS: Record<string, { id: string[]; en: string[] }> = {
  BCA: {
    id: [
      'Buka aplikasi BCA Mobile atau KlikBCA Individual.',
      'Pilih menu "m-Transfer" → "BCA Virtual Account".',
      'Masukkan nomor VA di atas, konfirmasi nama "BabahAlgo", lalu konfirmasi nominal.',
      'Masukkan PIN BCA untuk konfirmasi pembayaran.',
    ],
    en: [
      'Open BCA Mobile or KlikBCA Individual.',
      'Tap "m-Transfer" → "BCA Virtual Account".',
      'Enter the VA number above, confirm name "BabahAlgo", then confirm the amount.',
      'Enter your BCA PIN to confirm payment.',
    ],
  },
  BNI: {
    id: [
      'Buka BNI Mobile Banking, pilih "Transfer" → "Virtual Account Billing".',
      'Pilih rekening debit, masukkan nomor VA.',
      'Konfirmasi nama "BabahAlgo" dan nominal.',
      'Masukkan password transaksi.',
    ],
    en: [
      'Open BNI Mobile Banking, choose "Transfer" → "Virtual Account Billing".',
      'Select debit account, enter VA number.',
      'Confirm name "BabahAlgo" and amount.',
      'Enter transaction password.',
    ],
  },
  BRI: {
    id: [
      'Buka BRImo, pilih "BRIVA" di menu utama.',
      'Masukkan nomor VA, konfirmasi nama dan nominal.',
      'Masukkan PIN untuk konfirmasi pembayaran.',
    ],
    en: [
      'Open BRImo, choose "BRIVA" on main menu.',
      'Enter VA number, confirm name and amount.',
      'Enter PIN to confirm payment.',
    ],
  },
  MANDIRI: {
    id: [
      'Buka Livin\' by Mandiri, pilih "Bayar" → "Multipayment".',
      'Pilih penyedia "Xendit 88608", masukkan nomor VA.',
      'Konfirmasi nominal dan masukkan PIN.',
    ],
    en: [
      'Open Livin\' by Mandiri, choose "Pay" → "Multipayment".',
      'Select biller "Xendit 88608", enter VA number.',
      'Confirm amount and enter PIN.',
    ],
  },
  BSI: {
    id: [
      'Buka BSI Mobile, pilih "Pembayaran" → "Institusi".',
      'Cari "Xendit" atau gunakan kode institusi 9007.',
      'Masukkan nomor VA dan konfirmasi pembayaran.',
    ],
    en: [
      'Open BSI Mobile, choose "Payment" → "Institution".',
      'Search "Xendit" or use institution code 9007.',
      'Enter VA number and confirm payment.',
    ],
  },
  PERMATA: {
    id: [
      'Buka PermataMobile X, pilih "Pembayaran" → "Virtual Account".',
      'Masukkan nomor VA, konfirmasi nama dan nominal.',
      'Masukkan password transaksi.',
    ],
    en: [
      'Open PermataMobile X, choose "Payment" → "Virtual Account".',
      'Enter VA number, confirm name and amount.',
      'Enter transaction password.',
    ],
  },
};

function fmtIdr(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

function fmtCountdownHM(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function VaDisplay({ orderId, accountNumber, bankCode, amountIdr, expiresAt, locale, onSucceeded, onFailed }: VaDisplayProps) {
  const isEn = locale === 'en';
  const bank = BANK_INFO[bankCode] ?? { name: bankCode, color: '#475569', logoLetter: bankCode[0] ?? 'B' };
  const instructions = BANK_INSTRUCTIONS[bankCode]?.[isEn ? 'en' : 'id'] ?? [];

  const [status, setStatus] = useState<PollStatus>('PENDING');
  const [copied, setCopied] = useState<'account' | 'amount' | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(() => {
    if (!expiresAt) return 24 * 60 * 60 * 1000;
    return Math.max(0, new Date(expiresAt).getTime() - Date.now());
  });
  const pollTimer = useRef<number | null>(null);
  const tickTimer = useRef<number | null>(null);

  // Countdown
  useEffect(() => {
    tickTimer.current = window.setInterval(() => {
      setRemainingMs((prev) => {
        const next = prev - 1000;
        if (next <= 0 && status === 'PENDING') setStatus('EXPIRED');
        return Math.max(0, next);
      });
    }, 1000);
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
            onSucceeded();
            return;
          }
          if (data.status === 'FAILED' || data.status === 'EXPIRED') {
            setStatus(data.status);
            onFailed(data.status);
            return;
          }
        }
      } catch { /* keep polling */ }
      if (!cancelled) pollTimer.current = window.setTimeout(poll, 5000);
    };
    pollTimer.current = window.setTimeout(poll, 3000);

    return () => {
      cancelled = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [orderId, status, onSucceeded, onFailed]);

  async function copyToClipboard(text: string, which: 'account' | 'amount') {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch { /* clipboard blocked — ignore */ }
  }

  const isSettled = status === 'SUCCEEDED';
  const isErrored = status === 'FAILED' || status === 'EXPIRED';

  return (
    <div className="space-y-5">
      {/* VA Card */}
      <div className={cn(
        'relative rounded-2xl border-2 overflow-hidden transition-colors',
        isSettled ? 'border-emerald-500 bg-emerald-500/5'
          : isErrored ? 'border-rose-500/40 bg-rose-500/5'
          : 'border-amber-500/30 bg-amber-500/[0.03]',
      )}>
        {/* Status header */}
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
                  {status === 'EXPIRED' ? (isEn ? 'EXPIRED' : 'KEDALUWARSA') : (isEn ? 'FAILED' : 'GAGAL')}
                </span>
              </>
            ) : (
              <>
                <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  {isEn ? 'WAITING FOR TRANSFER' : 'MENUNGGU TRANSFER'}
                </span>
              </>
            )}
          </div>
          {status === 'PENDING' && (
            <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums text-foreground/70">
              <Clock className="h-3.5 w-3.5" />
              <span>{fmtCountdownHM(remainingMs)}</span>
            </div>
          )}
        </div>

        {/* Bank header */}
        <div className="px-5 py-4 flex items-center gap-3 border-b border-border/30">
          <div
            className="h-11 w-11 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0"
            style={{ backgroundColor: bank.color }}
          >
            <Building2 className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/70 font-mono font-semibold">
              {isEn ? 'Virtual Account' : 'Virtual Account'}
            </p>
            <p className="font-bold text-sm sm:text-base">{bank.name}</p>
          </div>
        </div>

        {/* VA Number */}
        <div className="px-5 py-4 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/70 font-mono font-semibold mb-1.5">
              {isEn ? 'Account Number' : 'Nomor Virtual Account'}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-lg sm:text-xl font-bold tracking-wider tabular-nums bg-muted/40 rounded-lg px-3 py-2 select-all">
                {accountNumber}
              </code>
              <Button
                type="button" variant="outline" size="sm"
                onClick={() => copyToClipboard(accountNumber, 'account')}
                disabled={isSettled || isErrored}
                className="shrink-0"
              >
                {copied === 'account' ? (
                  <><Check className="h-4 w-4 mr-1 text-emerald-500" /> {isEn ? 'Copied' : 'Disalin'}</>
                ) : (
                  <><Copy className="h-4 w-4 mr-1" /> {isEn ? 'Copy' : 'Salin'}</>
                )}
              </Button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/70 font-mono font-semibold mb-1.5">
              {isEn ? 'Exact Amount' : 'Nominal Tepat'}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-lg sm:text-xl font-bold tabular-nums bg-muted/40 rounded-lg px-3 py-2 select-all">
                {fmtIdr(amountIdr)}
              </code>
              <Button
                type="button" variant="outline" size="sm"
                onClick={() => copyToClipboard(String(amountIdr), 'amount')}
                disabled={isSettled || isErrored}
                className="shrink-0"
              >
                {copied === 'amount' ? (
                  <><Check className="h-4 w-4 mr-1 text-emerald-500" /> {isEn ? 'Copied' : 'Disalin'}</>
                ) : (
                  <><Copy className="h-4 w-4 mr-1" /> {isEn ? 'Copy' : 'Salin'}</>
                )}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
              {isEn
                ? 'Transfer the exact amount above. Different amount will not be accepted.'
                : 'Transfer dengan nominal tepat di atas. Nominal berbeda tidak diterima.'}
            </p>
          </div>

          <p className="text-[11px] text-muted-foreground font-mono pt-2 border-t border-border/40">
            Order #{orderId}
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

      {/* Instructions */}
      {!isSettled && !isErrored && instructions.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card/40 p-5">
          <h3 className="text-sm font-bold mb-3">
            {isEn ? `How to pay via ${bank.name}` : `Cara bayar via ${bank.name}`}
          </h3>
          <ol className="space-y-2 text-xs sm:text-sm text-foreground/80">
            {instructions.map((step, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[11px] font-bold">{i + 1}</span>
                <span className="leading-snug">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Errored — Retry */}
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
