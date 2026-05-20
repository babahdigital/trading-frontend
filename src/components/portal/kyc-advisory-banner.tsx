/**
 * KycAdvisoryBanner — surface status KYC ke portal pages relevant.
 *
 * Berlaku 3-tier policy (lihat memory project_kyc_strategy_2026_05_21):
 *   - NOT_SUBMITTED / DRAFT → soft prompt: "Selesaikan verifikasi untuk
 *     aktifkan eksekusi otomatis." CTA "Mulai Verifikasi" (3 menit).
 *   - SUBMITTED → info advisory: "Verifikasi sedang ditinjau (≤24jam).
 *     Eksekusi otomatis aktif setelah disetujui." Tidak dismissible.
 *   - REJECTED → action required: "Verifikasi ditolak: {alasan}.
 *     Submit ulang dengan dokumen koreksi."
 *   - APPROVED → null (no banner; full access).
 *
 * Dismissible per session (sessionStorage flag) supaya tidak spam user.
 * Hidden state: render null = no DOM noise.
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { AlertCircle, Clock, XCircle, ArrowRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKycStatus } from '@/lib/hooks/use-kyc-status';
import { formatDateTime } from '@/lib/format-locale';
import type { Locale } from '@/lib/format-locale';

const DISMISS_KEY = 'kyc.advisory.dismissed.v1';

interface CopyBlock {
  title: string;
  body: string;
  ctaLabel: string;
}

function getCopy(status: ReturnType<typeof useKycStatus>['status'], locale: Locale, rejectionReason?: string | null): CopyBlock | null {
  const isEn = locale === 'en';
  if (status === 'APPROVED') return null;
  if (status === 'SUBMITTED') {
    return {
      title: isEn ? 'Verification under review' : 'Verifikasi sedang ditinjau',
      body: isEn
        ? 'Estimated within 24 hours. Auto-execution will activate once approved. You can keep using read-only features in the meantime.'
        : 'Estimasi ≤24 jam. Eksekusi otomatis aktif setelah disetujui. Anda tetap bisa pakai fitur read-only sambil menunggu.',
      ctaLabel: isEn ? 'Check status' : 'Cek status',
    };
  }
  if (status === 'REJECTED') {
    return {
      title: isEn ? 'Verification rejected' : 'Verifikasi ditolak',
      body: rejectionReason
        ? (isEn ? `Reason: ${rejectionReason}. Please re-submit with corrected documents.` : `Alasan: ${rejectionReason}. Silakan submit ulang dengan dokumen koreksi.`)
        : (isEn ? 'Please re-submit with corrected documents.' : 'Silakan submit ulang dengan dokumen koreksi.'),
      ctaLabel: isEn ? 'Re-submit' : 'Submit ulang',
    };
  }
  // NOT_SUBMITTED / DRAFT
  return {
    title: isEn ? 'Complete verification to unlock auto-execution' : 'Selesaikan verifikasi untuk aktifkan eksekusi otomatis',
    body: isEn
      ? '3-minute KYC step required for live trading + withdrawal (regulatory compliance). Demo + read-only features remain available.'
      : 'Verifikasi KYC ±3 menit diperlukan untuk live trading + withdrawal (compliance regulasi). Fitur demo + read-only tetap tersedia.',
    ctaLabel: isEn ? 'Start verification' : 'Mulai verifikasi',
  };
}

export function KycAdvisoryBanner() {
  const { status, kyc, loading } = useKycStatus();
  const locale = useLocale() as Locale;
  useTranslations('portal.shared'); // ensure provider mounted
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (status === 'NOT_SUBMITTED' || status === 'DRAFT') {
      try {
        const flag = sessionStorage.getItem(DISMISS_KEY);
        // Sync dismissed dari sessionStorage — external storage hydration.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (flag === 'true') setDismissed(true);
      } catch { /* localStorage disabled */ }
    } else {
      // SUBMITTED + REJECTED tidak dismissible — clear flag supaya re-appear
      setDismissed(false);
      try { sessionStorage.removeItem(DISMISS_KEY); } catch { /* ignore */ }
    }
  }, [status]);

  if (loading) return null;
  if (dismissed) return null;
  const copy = getCopy(status, locale, kyc?.rejectionReason);
  if (!copy) return null;

  // Tone per status
  const tone =
    status === 'REJECTED' ? 'danger' :
    status === 'SUBMITTED' ? 'info' :
    'warning';
  const Icon =
    status === 'REJECTED' ? XCircle :
    status === 'SUBMITTED' ? Clock :
    AlertCircle;
  const toneClass = {
    danger:  'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300',
    info:    'bg-sky-500/10 border-sky-500/30 text-sky-700 dark:text-sky-300',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300',
  }[tone];
  const isDismissible = status === 'NOT_SUBMITTED' || status === 'DRAFT';

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('rounded-lg border p-3 sm:p-4 flex items-start gap-3', toneClass)}
    >
      <Icon className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" strokeWidth={2} />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm sm:text-base">{copy.title}</div>
        <div className="text-xs sm:text-sm mt-0.5 opacity-90 leading-relaxed">{copy.body}</div>
        {status === 'SUBMITTED' && kyc?.submittedAt ? (
          <div className="text-[11px] opacity-70 mt-1 font-mono">
            {locale === 'en' ? 'Submitted' : 'Diajukan'}: {formatDateTime(kyc.submittedAt, locale)}
          </div>
        ) : null}
        <Link
          href="/portal/kyc"
          className="inline-flex items-center gap-1 mt-2 text-sm font-semibold underline underline-offset-2 hover:no-underline"
        >
          {copy.ctaLabel}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
      {isDismissible ? (
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            try { sessionStorage.setItem(DISMISS_KEY, 'true'); } catch { /* ignore */ }
          }}
          aria-label={locale === 'en' ? 'Dismiss' : 'Tutup'}
          className="shrink-0 -mr-1 -mt-1 inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-foreground/10 transition-colors"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
