'use client';

/**
 * Payment success landing — Midtrans/Xendit redirect customer here after
 * `finish_redirect_url`. Polls subscription status until backend webhook
 * upgrades tier (typically <30s). Display real-time payment state +
 * actionable next steps.
 */
import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { CheckCircle2, Loader2, ArrowRight, Receipt } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { useLocale } from 'next-intl';
import { formatCurrency } from '@/lib/format-locale';
import type { Locale } from '@/lib/format-locale';

interface InvoiceStatus {
  status: 'PAID' | 'DUE' | 'CANCELED' | 'EXPIRED';
  number: string;
  amountUsd: number;
  tier?: string;
  paidAt?: string | null;
}

function SuccessInner() {
  const params = useSearchParams();
  const orderId = params.get('order_id');
  const locale = useLocale() as Locale;
  const isEn = locale === 'en';
  const { getAuthHeaders } = useAuth();
  const [status, setStatus] = useState<InvoiceStatus | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const sessionRefreshed = useRef(false);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    let timer: NodeJS.Timeout | null = null;

    const poll = async () => {
      try {
        const res = await fetch(`/api/portal/billing/invoice/${encodeURIComponent(orderId)}`, {
          headers: getAuthHeaders(),
        });
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json()) as InvoiceStatus;
          setStatus(data);
          setLoading(false);

          // Saat PAID terdeteksi pertama kali — invalidate session cache
          // (forceful /api/auth/me re-fetch) supaya SubscriptionExpiryBanner
          // + nav portal pickup tier baru tanpa harus hard-refresh. Plus
          // clear KYC draft + chat lead supaya tidak stale per audit.
          if (data.status === 'PAID' && !sessionRefreshed.current) {
            sessionRefreshed.current = true;
            try {
              // Refetch session — drop sessionStorage cache supaya nav portal
              // load latest activeSubscription.
              sessionStorage.removeItem('user');
              await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
            } catch { /* network glitch ignored */ }
            // Clear billing-related draft state
            try {
              localStorage.removeItem('billing.checkout.draft');
              localStorage.removeItem('kyc.draft.v1');
            } catch { /* localStorage disabled */ }
          }

          // Keep polling kalau masih DUE — webhook may update soon
          if (data.status === 'DUE' && pollCount < 10) {
            timer = setTimeout(poll, 3000);
            setPollCount((c) => c + 1);
          }
        } else {
          setLoading(false);
        }
      } catch {
        setLoading(false);
      }
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderId, getAuthHeaders, pollCount]);

  const isPaid = status?.status === 'PAID';
  const isStillProcessing = status?.status === 'DUE';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center bg-background">
      <div
        className={`inline-flex h-20 w-20 items-center justify-center rounded-full border mb-6 ${
          isPaid
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-amber-500/10 border-amber-500/30'
        }`}
      >
        {isPaid ? (
          <CheckCircle2 className="h-9 w-9 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <Loader2 className="h-9 w-9 text-amber-600 dark:text-amber-400 animate-spin" />
        )}
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold mb-3">
        {isPaid
          ? isEn ? 'Payment confirmed' : 'Pembayaran terkonfirmasi'
          : isStillProcessing
            ? isEn ? 'Processing your payment…' : 'Memproses pembayaran…'
            : isEn ? 'Thank you' : 'Terima kasih'}
      </h1>

      <p className="text-muted-foreground max-w-md leading-relaxed mb-2">
        {isPaid
          ? isEn
            ? 'Your subscription is now active. Akses penuh tersedia di portal.'
            : 'Langganan Anda aktif. Akses penuh tersedia di portal.'
          : isStillProcessing
            ? isEn
              ? 'We received your payment. The bank confirmation takes a few seconds — this page auto-refreshes.'
              : 'Kami menerima pembayaran Anda. Konfirmasi bank butuh beberapa detik — halaman ini refresh otomatis.'
            : loading
              ? isEn ? 'Verifying with payment provider…' : 'Memverifikasi dengan penyedia pembayaran…'
              : isEn ? 'Payment is being verified. You will receive an email when confirmed.' : 'Pembayaran sedang diverifikasi. Anda akan menerima email saat dikonfirmasi.'}
      </p>

      {status && (
        <div className="mt-6 inline-flex items-center gap-3 rounded-lg border border-border/60 bg-card px-5 py-3 text-sm font-mono">
          <Receipt className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-foreground/60">Invoice:</span>
          <span className="font-semibold">{status.number}</span>
          <span className="text-foreground/40">·</span>
          <span className="text-amber-600 dark:text-amber-400 tabular-nums">{formatCurrency(status.amountUsd, 'USD', locale)}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mt-10">
        {isPaid ? (
          <Link href="/portal" className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-md">
            {isEn ? 'Open Portal' : 'Buka Portal'} <ArrowRight className="w-4 h-4" />
          </Link>
        ) : (
          <Link href="/portal/billing/upgrade" className="btn-secondary inline-flex items-center gap-2 px-6 py-3 rounded-md">
            {isEn ? 'View Billing' : 'Lihat Tagihan'}
          </Link>
        )}
        <Link href="/contact" className="text-foreground/50 hover:text-amber-400 transition-colors text-sm self-center">
          {isEn ? 'Need help?' : 'Butuh bantuan?'}
        </Link>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SuccessInner />
    </Suspense>
  );
}
