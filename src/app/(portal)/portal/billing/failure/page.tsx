'use client';

/**
 * Payment failure landing — gateway declined card / customer canceled /
 * insufficient funds. Display reason kalau ada (dari query) + actionable
 * retry CTA. No charge applied — safe to retry.
 */
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { AlertOctagon, ArrowRight, RotateCcw } from 'lucide-react';
import { useLocale } from 'next-intl';

function FailureInner() {
  const params = useSearchParams();
  const orderId = params.get('order_id');
  const reason = params.get('reason');
  const locale = useLocale() as 'id' | 'en';
  const isEn = locale === 'en';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center bg-background">
      <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30 mb-6">
        <AlertOctagon className="h-9 w-9 text-rose-600 dark:text-rose-400" />
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold mb-3">
        {isEn ? 'Payment Failed' : 'Pembayaran Gagal'}
      </h1>

      <p className="text-muted-foreground max-w-md leading-relaxed mb-2">
        {isEn
          ? 'Your payment did not go through. No charge was applied — you can safely try again or use a different method.'
          : 'Pembayaran Anda tidak berhasil. Tidak ada biaya yang dipotong — Anda bisa mencoba lagi atau pakai metode lain.'}
      </p>

      {reason && (
        <p className="text-xs text-red-300/70 mt-2 max-w-md">
          {isEn ? 'Reason' : 'Alasan'}: {reason}
        </p>
      )}

      {orderId && (
        <p className="text-xs text-muted-foreground/70 font-mono mt-2">
          Order ID: {orderId}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mt-10">
        <Link href="/portal/billing/upgrade" className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-md">
          <RotateCcw className="w-4 h-4" /> {isEn ? 'Try Again' : 'Coba Lagi'}
        </Link>
        <Link href="/contact?subject=payment-issue" className="btn-secondary inline-flex items-center gap-2 px-6 py-3 rounded-md">
          {isEn ? 'Contact Support' : 'Hubungi Support'} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <p className="text-xs text-muted-foreground/60 mt-12">
        {isEn
          ? 'If the issue persists, our team is here to help.'
          : 'Jika masalah berlanjut, tim kami siap membantu.'}
      </p>
    </div>
  );
}

export default function PaymentFailurePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <FailureInner />
    </Suspense>
  );
}
