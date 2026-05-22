'use client';

/**
 * Payment pending landing — customer kembali ke portal sebelum payment
 * dikonfirmasi. Re-display QR/VA dari Invoice.metadata.instrument supaya
 * customer bisa lanjut bayar tanpa harus re-create invoice.
 *
 * Polling status dilakukan oleh QrisDisplay/VaDisplay sub-component
 * sehingga UX konsisten dengan checkout flow asli.
 */
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { Clock, ArrowRight, Loader2, AlertOctagon } from 'lucide-react';
import { useLocale } from 'next-intl';
import { QrisDisplay } from '@/components/checkout/qris-display';
import { VaDisplay } from '@/components/checkout/va-display';

interface InvoiceDetail {
  id: string;
  status: 'DRAFT' | 'DUE' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED';
  amountIdr: number;
  instrument: {
    id: string;
    method: string;
    qrString?: string | null;
    accountNumber?: string | null;
    bankCode?: string | null;
    expiresAt?: string | null;
  } | null;
}

function PendingInner() {
  const params = useSearchParams();
  const orderId = params.get('order_id');
  const locale = useLocale() as 'id' | 'en';
  const isEn = locale === 'en';
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  // Initial loading hanya true kalau ada orderId untuk di-fetch. Tanpa
  // orderId, langsung render fallback CTA tanpa intermediate spinner.
  const [loading, setLoading] = useState(!!orderId);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/portal/billing/invoice/${encodeURIComponent(orderId)}?include=instrument`, {
          credentials: 'same-origin', cache: 'no-store',
        });
        if (cancelled) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as InvoiceDetail;
        setInvoice(data);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [orderId]);

  // Already paid → redirect ke success
  useEffect(() => {
    if (invoice?.status === 'PAID' && orderId) {
      window.location.href = `/${locale}/portal/billing/success?order_id=${encodeURIComponent(orderId)}`;
    }
  }, [invoice?.status, orderId, locale]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
      </div>
    );
  }

  // No instrument available → fallback generic pending UI
  const hasReusableInstrument = invoice?.status === 'DUE' && invoice.instrument &&
    (invoice.instrument.qrString || invoice.instrument.accountNumber);

  return (
    <div className="min-h-screen px-4 py-10 sm:py-14 bg-background">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30 mb-4">
            {invoice?.status === 'CANCELLED' || err ? (
              <AlertOctagon className="h-8 w-8 text-rose-500" />
            ) : (
              <Clock className="h-8 w-8 text-amber-500" />
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            {invoice?.status === 'CANCELLED'
              ? isEn ? 'Payment Expired' : 'Pembayaran Kedaluwarsa'
              : isEn ? 'Payment Pending' : 'Pembayaran Pending'}
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
            {invoice?.status === 'CANCELLED'
              ? isEn
                ? 'This invoice has expired. Please create a new payment to continue.'
                : 'Invoice ini sudah kedaluwarsa. Silakan buat pembayaran baru untuk melanjutkan.'
              : isEn
                ? 'Complete your payment using the details below. This page updates automatically once payment clears.'
                : 'Selesaikan pembayaran menggunakan detail di bawah. Halaman ini update otomatis saat pembayaran berhasil.'}
          </p>
          {orderId && (
            <p className="text-xs text-muted-foreground/70 font-mono mt-3">
              Order ID: {orderId}
            </p>
          )}
        </div>

        {/* Reusable QR / VA — let customer resume payment */}
        {hasReusableInstrument && invoice && invoice.instrument && (
          <>
            {invoice.instrument.qrString && (
              <QrisDisplay
                orderId={invoice.id}
                qrString={invoice.instrument.qrString}
                amountIdr={invoice.amountIdr}
                expiresAt={invoice.instrument.expiresAt}
                locale={locale}
                onSucceeded={() => {
                  window.location.href = `/${locale}/portal/billing/success?order_id=${encodeURIComponent(invoice.id)}`;
                }}
                onFailed={() => setInvoice((prev) => prev ? { ...prev, status: 'CANCELLED' } : prev)}
              />
            )}
            {invoice.instrument.accountNumber && invoice.instrument.bankCode && (
              <VaDisplay
                orderId={invoice.id}
                accountNumber={invoice.instrument.accountNumber}
                bankCode={invoice.instrument.bankCode}
                amountIdr={invoice.amountIdr}
                expiresAt={invoice.instrument.expiresAt}
                locale={locale}
                onSucceeded={() => {
                  window.location.href = `/${locale}/portal/billing/success?order_id=${encodeURIComponent(invoice.id)}`;
                }}
                onFailed={() => setInvoice((prev) => prev ? { ...prev, status: 'CANCELLED' } : prev)}
              />
            )}
          </>
        )}

        {/* Fallback actions kalau no instrument (legacy invoice or expired) */}
        {!hasReusableInstrument && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/portal/billing/upgrade"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold transition-colors"
            >
              {isEn ? 'Start New Payment' : 'Buat Pembayaran Baru'}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/portal"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md border border-border hover:bg-card/60 transition-colors"
            >
              {isEn ? 'Back to Portal' : 'Kembali ke Portal'}
            </Link>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground/60 pt-4 border-t border-border/40">
          {isEn
            ? 'You will receive an email confirmation when payment clears.'
            : 'Anda akan menerima email konfirmasi saat pembayaran berhasil.'}
        </p>
      </div>
    </div>
  );
}

export default function PaymentPendingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-amber-500" /></div>}>
      <PendingInner />
    </Suspense>
  );
}
