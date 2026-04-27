'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ShieldCheck, FileCheck, AlertCircle, Clock, XCircle, Loader2, IdCard } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KycSummary {
  id?: string;
  status: 'NOT_SUBMITTED' | 'PENDING_REVIEW' | 'ADDITIONAL_INFO_REQUIRED' | 'APPROVED' | 'REJECTED';
  fullName?: string;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

interface FormData {
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  occupation: string;
  sourceOfFunds: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  documentType: 'KTP' | 'PASSPORT' | 'SIM' | 'NPWP';
  documentNumber: string;
  investmentExperience: 'novice' | 'intermediate' | 'advanced' | 'professional';
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  expectedMonthlyVolume: 'lt_10k' | '10k_50k' | '50k_250k' | 'gt_250k';
}

const STATUS_META: Record<string, { tone: string; icon: typeof ShieldCheck; labelKey: string; descKey: string }> = {
  NOT_SUBMITTED: {
    tone: 'border-amber-500/30 bg-amber-500/5 text-amber-300',
    icon: AlertCircle,
    labelKey: 'status_not_submitted_label',
    descKey: 'status_not_submitted_desc',
  },
  PENDING_REVIEW: {
    tone: 'border-blue-500/30 bg-blue-500/5 text-blue-300',
    icon: Clock,
    labelKey: 'status_pending_review_label',
    descKey: 'status_pending_review_desc',
  },
  ADDITIONAL_INFO_REQUIRED: {
    tone: 'border-amber-500/30 bg-amber-500/5 text-amber-300',
    icon: FileCheck,
    labelKey: 'status_additional_info_label',
    descKey: 'status_additional_info_desc',
  },
  APPROVED: {
    tone: 'border-green-500/30 bg-green-500/5 text-green-300',
    icon: ShieldCheck,
    labelKey: 'status_approved_label',
    descKey: 'status_approved_desc',
  },
  REJECTED: {
    tone: 'border-red-500/30 bg-red-500/5 text-red-300',
    icon: XCircle,
    labelKey: 'status_rejected_label',
    descKey: 'status_rejected_desc',
  },
};

const initialForm: FormData = {
  fullName: '',
  dateOfBirth: '',
  nationality: 'ID',
  occupation: '',
  sourceOfFunds: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  province: '',
  postalCode: '',
  country: 'ID',
  documentType: 'KTP',
  documentNumber: '',
  investmentExperience: 'novice',
  riskTolerance: 'moderate',
  expectedMonthlyVolume: 'lt_10k',
};

export default function KycPage() {
  const t = useTranslations('portal.kyc');
  const locale = useLocale();
  const { getAuthHeaders } = useAuth();
  const [summary, setSummary] = useState<KycSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormData>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/kyc/status', { headers: getAuthHeaders() });
        if (res.ok) {
          const body = await res.json();
          setSummary(body.kyc);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [getAuthHeaders]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/kyc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
      setSummary({ status: 'PENDING_REVIEW', submittedAt: body.submittedAt });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  const status = summary?.status ?? 'NOT_SUBMITTED';
  const meta = STATUS_META[status];
  const StatusIcon = meta.icon;
  const showForm = status === 'NOT_SUBMITTED' || status === 'REJECTED' || status === 'ADDITIONAL_INFO_REQUIRED';

  if (loading) {
    return <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-32 rounded-md bg-white/5 animate-pulse" />)}</div>;
  }

  const dateLocale = locale === 'id' ? 'id-ID' : 'en-US';

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
          <IdCard className="h-6 w-6 sm:h-7 sm:w-7 text-amber-400" />
          {t('page_title')}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          {t('page_subtitle')}
        </p>
      </div>

      <Card className={cn('border-2', meta.tone)}>
        <CardContent className="p-5 flex items-start gap-3">
          <StatusIcon className="h-6 w-6 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-bold">{t(meta.labelKey)}</p>
            <p className="text-sm opacity-90 mt-0.5">{t(meta.descKey)}</p>
            {summary?.rejectionReason && (
              <div className="mt-3 p-3 rounded bg-red-500/10 border border-red-500/30 text-sm">
                <span className="font-semibold">{t('rejection_reason_label')} </span>{summary.rejectionReason}
              </div>
            )}
            {summary?.submittedAt && (
              <p className="text-xs mt-2 opacity-70 font-mono">
                {t('submitted_at', { timestamp: new Date(summary.submittedAt).toLocaleString(dateLocale) })}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {showForm && (
        <form onSubmit={submit} className="space-y-6">
          {error && <div className="p-3 rounded-md border border-red-500/30 bg-red-500/5 text-red-300 text-sm">{error}</div>}

          {/* Personal data */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="font-semibold">{t('section_personal')}</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label={t('field_full_name')} required value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} />
                <Field label={t('field_date_of_birth')} type="date" required value={form.dateOfBirth} onChange={(v) => setForm({ ...form, dateOfBirth: v })} />
                <Field label={t('field_nationality')} value={form.nationality} onChange={(v) => setForm({ ...form, nationality: v })} />
                <Field label={t('field_occupation')} required value={form.occupation} onChange={(v) => setForm({ ...form, occupation: v })} />
              </div>
              <Field label={t('field_source_of_funds')} required textarea rows={3} value={form.sourceOfFunds} onChange={(v) => setForm({ ...form, sourceOfFunds: v })} hint={t('field_source_of_funds_hint')} />
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="font-semibold">{t('section_address')}</h2>
              <Field label={t('field_address_line1')} required value={form.addressLine1} onChange={(v) => setForm({ ...form, addressLine1: v })} />
              <Field label={t('field_address_line2')} value={form.addressLine2} onChange={(v) => setForm({ ...form, addressLine2: v })} />
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Field label={t('field_city')} required value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
                <Field label={t('field_province')} required value={form.province} onChange={(v) => setForm({ ...form, province: v })} />
                <Field label={t('field_postal_code')} required value={form.postalCode} onChange={(v) => setForm({ ...form, postalCode: v })} />
                <Field label={t('field_country')} value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
              </div>
            </CardContent>
          </Card>

          {/* Document */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="font-semibold">{t('section_document')}</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Select label={t('field_document_type')} value={form.documentType} onChange={(v) => setForm({ ...form, documentType: v as FormData['documentType'] })}
                  options={[
                    { value: 'KTP', label: t('doc_ktp') },
                    { value: 'PASSPORT', label: t('doc_passport') },
                    { value: 'SIM', label: t('doc_sim') },
                    { value: 'NPWP', label: t('doc_npwp') },
                  ]} />
                <Field label={t('field_document_number')} required value={form.documentNumber} onChange={(v) => setForm({ ...form, documentNumber: v })} />
              </div>
              <p className="text-xs text-muted-foreground">
                {t('doc_upload_note')}
              </p>
            </CardContent>
          </Card>

          {/* Risk profile */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="font-semibold">{t('section_risk_profile')}</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                <Select label={t('field_investment_experience')} value={form.investmentExperience} onChange={(v) => setForm({ ...form, investmentExperience: v as FormData['investmentExperience'] })}
                  options={[
                    { value: 'novice', label: t('exp_novice') },
                    { value: 'intermediate', label: t('exp_intermediate') },
                    { value: 'advanced', label: t('exp_advanced') },
                    { value: 'professional', label: t('exp_professional') },
                  ]} />
                <Select label={t('field_risk_tolerance')} value={form.riskTolerance} onChange={(v) => setForm({ ...form, riskTolerance: v as FormData['riskTolerance'] })}
                  options={[
                    { value: 'conservative', label: t('risk_conservative') },
                    { value: 'moderate', label: t('risk_moderate') },
                    { value: 'aggressive', label: t('risk_aggressive') },
                  ]} />
                <Select label={t('field_expected_volume')} value={form.expectedMonthlyVolume} onChange={(v) => setForm({ ...form, expectedMonthlyVolume: v as FormData['expectedMonthlyVolume'] })}
                  options={[
                    { value: 'lt_10k', label: t('vol_lt_10k') },
                    { value: '10k_50k', label: t('vol_10k_50k') },
                    { value: '50k_250k', label: t('vol_50k_250k') },
                    { value: 'gt_250k', label: t('vol_gt_250k') },
                  ]} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t('submit_button')}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({
  label, value, onChange, type = 'text', required, textarea, rows, hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  textarea?: boolean;
  rows?: number;
  hint?: string;
}) {
  const baseInputCls = 'w-full text-sm rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {textarea ? (
        <textarea
          required={required}
          rows={rows ?? 3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(baseInputCls, 'resize-y')}
        />
      ) : (
        <input
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={baseInputCls}
        />
      )}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function Select({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-card">{o.label}</option>
        ))}
      </select>
    </div>
  );
}
