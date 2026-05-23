'use client';

/**
 * KYC status display card — shows current verification status, rejection reason,
 * submitted timestamp, and (for PENDING_REVIEW) a submitted-info preview.
 */
import { useTranslations } from 'next-intl';
import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/format-locale';
import type { Locale } from '@/lib/format-locale';
import { STATUS_META } from './types';
import type { KycSummary } from './types';

export interface KycStatusCardProps {
  summary: KycSummary | null;
  locale: Locale;
}

export function KycStatusCard({ summary, locale }: KycStatusCardProps) {
  const t = useTranslations('portal.kyc');
  const isEn = locale === 'en';
  const status = summary?.status ?? 'NOT_SUBMITTED';
  const meta = STATUS_META[status];
  const StatusIcon = meta.icon;

  return (
    <>
      {/* Status badge */}
      <Card className={cn('border-2', meta.tone)}>
        <CardContent className="p-5 flex items-start gap-3">
          <StatusIcon className="h-6 w-6 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-bold">{t(meta.labelKey)}</p>
            <p className="text-sm opacity-90 mt-0.5">{t(meta.descKey)}</p>
            {summary?.rejectionReason && (
              <div className="mt-3 p-3 rounded bg-rose-500/10 border border-rose-500/30 text-sm">
                <span className="font-semibold">{t('rejection_reason_label')} </span>{summary.rejectionReason}
              </div>
            )}
            {summary?.submittedAt && (
              <p className="text-xs mt-2 opacity-70 font-mono">
                {t('submitted_at', { timestamp: formatDateTime(summary.submittedAt, locale) })}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submitted info preview (saat PENDING_REVIEW) */}
      {status === 'PENDING_REVIEW' && summary?.fullName && (
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              {isEn ? 'Submitted information' : 'Informasi yang dikirim'}
            </h2>
            <dl className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">{t('field_full_name')}</dt>
                <dd className="font-medium">{summary.fullName}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}
    </>
  );
}
