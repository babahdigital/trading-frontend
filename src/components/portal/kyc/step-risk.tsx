'use client';

/**
 * KYC Step 3 — Risk profile: investment experience, risk tolerance,
 * expected monthly volume, and a review summary before submit.
 */
import { useTranslations } from 'next-intl';
import { BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SummaryRow } from './form-fields';
import type { StepProps, KycFormData } from './types';

export function StepRisk({ form, onChange, locale }: StepProps) {
  const t = useTranslations('portal.kyc');
  const isEn = locale === 'en';

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-amber-600 dark:text-amber-400" /> {t('section_risk_profile')}
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Select
            label={t('field_investment_experience')}
            value={form.investmentExperience}
            onChange={(v) => onChange({ investmentExperience: v as KycFormData['investmentExperience'] })}
            options={[
              { value: 'novice', label: t('exp_novice') },
              { value: 'intermediate', label: t('exp_intermediate') },
              { value: 'advanced', label: t('exp_advanced') },
              { value: 'professional', label: t('exp_professional') },
            ]}
          />
          <Select
            label={t('field_risk_tolerance')}
            value={form.riskTolerance}
            onChange={(v) => onChange({ riskTolerance: v as KycFormData['riskTolerance'] })}
            options={[
              { value: 'conservative', label: t('risk_conservative') },
              { value: 'moderate', label: t('risk_moderate') },
              { value: 'aggressive', label: t('risk_aggressive') },
            ]}
          />
          <Select
            label={t('field_expected_volume')}
            value={form.expectedMonthlyVolume}
            onChange={(v) => onChange({ expectedMonthlyVolume: v as KycFormData['expectedMonthlyVolume'] })}
            options={[
              { value: 'lt_10k', label: t('vol_lt_10k') },
              { value: '10k_50k', label: t('vol_10k_50k') },
              { value: '50k_250k', label: t('vol_50k_250k') },
              { value: 'gt_250k', label: t('vol_gt_250k') },
            ]}
          />
        </div>

        {/* Review summary before submit */}
        <div className="mt-4 pt-4 border-t border-border/60">
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
            {isEn ? 'Review summary' : 'Ringkasan'}
          </h3>
          <dl className="grid sm:grid-cols-2 gap-2 text-xs">
            <SummaryRow label={t('field_full_name')} value={form.fullName} />
            <SummaryRow label={t('field_date_of_birth')} value={form.dateOfBirth} />
            <SummaryRow label={t('field_document_type')} value={form.documentType} />
            <SummaryRow label={t('field_document_number')} value={form.documentNumber} mono />
            <SummaryRow label={t('field_country')} value={form.country} />
            <SummaryRow label={t('field_city')} value={form.city} />
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}
