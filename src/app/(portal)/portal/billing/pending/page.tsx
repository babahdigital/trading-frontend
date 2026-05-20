'use client';

/**
 * Payment pending landing — customer abandoned Midtrans flow or chose
 * deferred payment method (bank transfer, QRIS dengan VA pending).
 * Show actionable next step (retry / pay later via VA instructions).
 */
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { Clock, ArrowRight } from 'lucide-react';
import { useLocale } from 'next-intl';

function PendingInner() {
  const params = useSearchParams();
  const orderId = params.get('order_id');
  const locale = useLocale() as 'id' | 'en';
  const isEn = locale === 'en';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center bg-background">
      <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30 mb-6">
        <Clock className="h-9 w-9 text-amber-400" />
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold mb-3">
        {isEn ? 'Payment Pending' : 'Pembayaran Pending'}
      </h1>

      <p className="text-muted-foreground max-w-md leading-relaxed mb-2">
        {isEn
          ? 'Your payment is awaiting completion. If you chose bank transfer or QRIS, please complete it before the 24-hour expiry.'
          : 'Pembayaran Anda menunggu penyelesaian. Jika memilih transfer bank atau QRIS, selesaikan sebelum batas waktu 24 jam.'}
      </p>

      {orderId && (
        <p className="text-xs text-muted-foreground/70 font-mono mt-2">
          Order ID: {orderId}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mt-10">
        <Link href="/portal/billing/upgrade" className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-md">
          {isEn ? 'Retry Payment' : 'Coba Ulang Pembayaran'} <ArrowRight className="w-4 h-4" />
        </Link>
        <Link href="/portal" className="btn-secondary inline-flex items-center gap-2 px-6 py-3 rounded-md">
          {isEn ? 'Back to Portal' : 'Kembali ke Portal'}
        </Link>
      </div>

      <p className="text-xs text-muted-foreground/60 mt-12">
        {isEn
          ? 'You will receive an email confirmation when the payment clears.'
          : 'Anda akan menerima email konfirmasi saat pembayaran berhasil.'}
      </p>
    </div>
  );
}

export default function PaymentPendingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <PendingInner />
    </Suspense>
  );
}
