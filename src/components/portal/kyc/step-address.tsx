'use client';

/**
 * KYC Step 1 — Address fields: line1, line2, city, province, postal code, country.
 */
import { useTranslations } from 'next-intl';
import { MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Field, Select } from './form-fields';
import { COUNTRY_OPTIONS, ID_PROVINCES } from './types';
import type { StepProps } from './types';

export function StepAddress({ form, onChange, errors, showErrors, locale }: StepProps) {
  const t = useTranslations('portal.kyc');
  void locale; // locale available for future i18n within step

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400" /> {t('section_address')}
        </h2>
        <Field
          label={t('field_address_line1')}
          required
          value={form.addressLine1}
          onChange={(v) => onChange({ addressLine1: v })}
          error={showErrors ? errors.addressLine1 : undefined}
          autoComplete="address-line1"
        />
        <Field
          label={t('field_address_line2')}
          value={form.addressLine2}
          onChange={(v) => onChange({ addressLine2: v })}
          autoComplete="address-line2"
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field
            label={t('field_city')}
            required
            value={form.city}
            onChange={(v) => onChange({ city: v })}
            error={showErrors ? errors.city : undefined}
            autoComplete="address-level2"
          />
          {form.country === 'ID' ? (
            <Select
              label={t('field_province')}
              value={form.province}
              onChange={(v) => onChange({ province: v })}
              options={[{ value: '', label: '—' }, ...ID_PROVINCES.map((p) => ({ value: p, label: p }))]}
            />
          ) : (
            <Field
              label={t('field_province')}
              required
              value={form.province}
              onChange={(v) => onChange({ province: v })}
              error={showErrors ? errors.province : undefined}
            />
          )}
          <Field
            label={t('field_postal_code')}
            required
            value={form.postalCode}
            onChange={(v) => onChange({ postalCode: v.replace(/[^\d]/g, '') })}
            error={showErrors ? errors.postalCode : undefined}
            inputMode="numeric"
            autoComplete="postal-code"
          />
          <Select
            label={t('field_country')}
            value={form.country}
            onChange={(v) => onChange({ country: v })}
            options={COUNTRY_OPTIONS}
          />
        </div>
      </CardContent>
    </Card>
  );
}
