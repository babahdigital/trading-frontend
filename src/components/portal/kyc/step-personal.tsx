'use client';

/**
 * KYC Step 0 — Personal data: name, DOB, nationality, occupation, source of funds.
 */
import { useTranslations } from 'next-intl';
import { User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Field, Select } from './form-fields';
import { COUNTRY_OPTIONS } from './types';
import type { StepProps } from './types';

export function StepPersonal({ form, onChange, errors, showErrors, locale }: StepProps) {
  const t = useTranslations('portal.kyc');
  const isEn = locale === 'en';

  const today = new Date().toISOString().slice(0, 10);
  const minDob = new Date();
  minDob.setFullYear(minDob.getFullYear() - 100);

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <User className="w-4 h-4 text-amber-600 dark:text-amber-400" /> {t('section_personal')}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label={t('field_full_name')}
            required
            value={form.fullName}
            onChange={(v) => onChange({ fullName: v })}
            error={showErrors ? errors.fullName : undefined}
            autoComplete="name"
          />
          <Field
            label={t('field_date_of_birth')}
            type="date"
            required
            value={form.dateOfBirth}
            onChange={(v) => onChange({ dateOfBirth: v })}
            error={showErrors ? errors.dateOfBirth : undefined}
            min={minDob.toISOString().slice(0, 10)}
            max={today}
            hint={isEn ? 'Must be 18 years or older' : 'Minimal 18 tahun'}
          />
          <Select
            label={t('field_nationality')}
            value={form.nationality}
            onChange={(v) => onChange({ nationality: v })}
            options={COUNTRY_OPTIONS}
          />
          <Field
            label={t('field_occupation')}
            required
            value={form.occupation}
            onChange={(v) => onChange({ occupation: v })}
            error={showErrors ? errors.occupation : undefined}
          />
        </div>
        <Field
          label={t('field_source_of_funds')}
          required
          textarea
          rows={3}
          value={form.sourceOfFunds}
          onChange={(v) => onChange({ sourceOfFunds: v })}
          hint={t('field_source_of_funds_hint')}
          error={showErrors ? errors.sourceOfFunds : undefined}
        />
      </CardContent>
    </Card>
  );
}
