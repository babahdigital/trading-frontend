'use client';

/**
 * KYC self-service page — multi-step wizard dengan auto-save draft.
 *
 * 2026-05-20 — Phase A polish refactor (Pak directive "sempurnakan tanpa
 * terkecuali"). Sebelumnya: single mega-form 4 cards, no progress indicator,
 * no auto-save (refresh = lose data), no validation feedback per field,
 * no submit button sticky, no submitted-info display pasca submit.
 *
 * Architecture sekarang:
 * - 4-step wizard: Personal → Address → Document → Risk Profile
 * - Progress bar + step indicator dengan validation gate per step
 * - localStorage draft auto-save per keystroke (debounced 800ms),
 *   restored on mount
 * - Date of birth: min 18 years, max today; client + server validation
 * - Indonesia province + country preset dropdown (ISO-3166 subset)
 * - Document number format pattern hint per type (KTP=16 digit dll)
 * - Sticky bottom submit/next button per step
 * - Pasca submit: render "Submitted info" card untuk verifikasi customer
 * - Loading skeleton match final layout (no jank)
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import {
  ShieldCheck, FileCheck, AlertCircle, Clock, XCircle, Loader2, IdCard,
  CheckCircle2, ArrowRight, ArrowLeft, User, MapPin, FileText, BarChart3,
  Upload, Camera, Trash2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/admin/page-header';
import { formatDateTime } from '@/lib/format-locale';
import type { Locale } from '@/lib/format-locale';

interface KycSummary {
  id?: string;
  status: 'NOT_SUBMITTED' | 'PENDING_REVIEW' | 'ADDITIONAL_INFO_REQUIRED' | 'APPROVED' | 'REJECTED';
  fullName?: string;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  hasFront?: boolean;
  hasBack?: boolean;
  hasSelfie?: boolean;
  /** Cache-bust key — bumps saat user re-upload dokumen */
  docVersion?: string;
}

type DocKind = 'front' | 'back' | 'selfie';

interface DocUploadState {
  uploading: boolean;
  uploaded: boolean;
  error: string | null;
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
  documentType: 'KTP' | 'PASSPORT' | 'SIM' | 'NPWP' | 'NATIONAL_ID' | 'DRIVER_LICENSE';
  documentNumber: string;
  investmentExperience: 'novice' | 'intermediate' | 'advanced' | 'professional';
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  expectedMonthlyVolume: 'lt_10k' | '10k_50k' | '50k_250k' | 'gt_250k';
}

const STATUS_META: Record<string, { tone: string; icon: typeof ShieldCheck; labelKey: string; descKey: string }> = {
  NOT_SUBMITTED: {
    tone: 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300',
    icon: AlertCircle,
    labelKey: 'status_not_submitted_label',
    descKey: 'status_not_submitted_desc',
  },
  PENDING_REVIEW: {
    tone: 'border-sky-500/30 bg-sky-500/5 text-sky-700 dark:text-sky-300',
    icon: Clock,
    labelKey: 'status_pending_review_label',
    descKey: 'status_pending_review_desc',
  },
  ADDITIONAL_INFO_REQUIRED: {
    tone: 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300',
    icon: FileCheck,
    labelKey: 'status_additional_info_label',
    descKey: 'status_additional_info_desc',
  },
  APPROVED: {
    tone: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300',
    icon: ShieldCheck,
    labelKey: 'status_approved_label',
    descKey: 'status_approved_desc',
  },
  REJECTED: {
    tone: 'border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-300',
    icon: XCircle,
    labelKey: 'status_rejected_label',
    descKey: 'status_rejected_desc',
  },
};

const ID_PROVINCES = [
  'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur', 'Banten',
  'Yogyakarta', 'Bali', 'Aceh', 'Sumatera Utara', 'Sumatera Barat',
  'Riau', 'Kepulauan Riau', 'Jambi', 'Sumatera Selatan', 'Bengkulu',
  'Lampung', 'Bangka Belitung', 'Kalimantan Barat', 'Kalimantan Tengah',
  'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara',
  'Sulawesi Utara', 'Sulawesi Tengah', 'Sulawesi Selatan',
  'Sulawesi Tenggara', 'Gorontalo', 'Sulawesi Barat', 'Maluku',
  'Maluku Utara', 'Papua', 'Papua Barat', 'Papua Tengah', 'Papua Pegunungan',
  'Papua Selatan', 'Papua Barat Daya', 'Nusa Tenggara Barat',
  'Nusa Tenggara Timur',
];

const COUNTRY_OPTIONS = [
  { value: 'ID', label: 'Indonesia' },
  { value: 'SG', label: 'Singapore' },
  { value: 'MY', label: 'Malaysia' },
  { value: 'TH', label: 'Thailand' },
  { value: 'PH', label: 'Philippines' },
  { value: 'VN', label: 'Vietnam' },
  { value: 'AU', label: 'Australia' },
  { value: 'JP', label: 'Japan' },
  { value: 'KR', label: 'South Korea' },
  { value: 'CN', label: 'China' },
  { value: 'HK', label: 'Hong Kong' },
  { value: 'TW', label: 'Taiwan' },
  { value: 'IN', label: 'India' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'DE', label: 'Germany' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'SA', label: 'Saudi Arabia' },
  { value: 'OTHER', label: 'Other' },
];

const DOC_NUMBER_PATTERN: Record<FormData['documentType'], { pattern: RegExp; hintId: string; hintEn: string }> = {
  KTP: {
    pattern: /^\d{16}$/,
    hintId: '16 digit NIK',
    hintEn: '16-digit NIK',
  },
  PASSPORT: {
    pattern: /^[A-Z][0-9]{7,8}$/,
    hintId: 'Format: 1 huruf + 7-8 angka (mis. A1234567)',
    hintEn: 'Format: 1 letter + 7-8 digits (e.g. A1234567)',
  },
  SIM: {
    pattern: /^\d{12,14}$/,
    hintId: '12-14 digit nomor SIM',
    hintEn: '12-14 digit SIM number',
  },
  NPWP: {
    pattern: /^\d{15,16}$/,
    hintId: '15-16 digit NPWP (boleh tanpa tanda hubung)',
    hintEn: '15-16 digit NPWP (no dashes)',
  },
  // Foreign National ID — pattern relaxed karena format bervariasi per negara
  // (US SSN 9-digit, India Aadhaar 12-digit, EU eID 8-12 alfanumerik,
  // Japanese zairyu 12-char alfanumerik, dst). Tetap require min 5 char +
  // safe alphanumerik + dash supaya tidak ada injection / whitespace abuse.
  NATIONAL_ID: {
    pattern: /^[A-Z0-9-]{5,30}$/,
    hintId: '5-30 karakter (huruf besar, angka, atau tanda hubung)',
    hintEn: '5-30 characters (uppercase letters, digits, or dashes)',
  },
  DRIVER_LICENSE: {
    pattern: /^[A-Z0-9-]{5,25}$/,
    hintId: 'Nomor SIM internasional — 5-25 karakter alfanumerik',
    hintEn: 'International driver license — 5-25 alphanumeric characters',
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

const DRAFT_KEY = 'babah.kyc.draft.v1';
const TOTAL_STEPS = 4;

function computeAge(dob: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

type StepErrors = Partial<Record<keyof FormData | 'docFront' | 'docBack' | 'docSelfie', string>>;

function validateStep(
  step: number,
  form: FormData,
  docFlags?: { hasFront: boolean; hasBack: boolean; hasSelfie: boolean },
): { valid: boolean; errors: StepErrors } {
  const errors: StepErrors = {};
  if (step === 0) {
    if (form.fullName.trim().length < 3) errors.fullName = 'Min 3 karakter';
    const age = computeAge(form.dateOfBirth);
    if (!form.dateOfBirth) errors.dateOfBirth = 'Wajib diisi';
    else if (age == null || age < 18) errors.dateOfBirth = 'Minimal 18 tahun';
    else if (age > 100) errors.dateOfBirth = 'Tanggal tidak valid';
    if (form.occupation.trim().length < 2) errors.occupation = 'Wajib diisi';
    if (form.sourceOfFunds.trim().length < 5) errors.sourceOfFunds = 'Min 5 karakter';
  } else if (step === 1) {
    if (form.addressLine1.trim().length < 5) errors.addressLine1 = 'Min 5 karakter';
    if (form.city.trim().length < 2) errors.city = 'Wajib diisi';
    if (form.province.trim().length < 2) errors.province = 'Wajib diisi';
    if (!/^\d{4,6}$/.test(form.postalCode)) errors.postalCode = '4-6 digit';
  } else if (step === 2) {
    const docMeta = DOC_NUMBER_PATTERN[form.documentType];
    if (!docMeta.pattern.test(form.documentNumber.replace(/[-\s]/g, ''))) {
      errors.documentNumber = 'Format tidak sesuai';
    }
    if (docFlags) {
      const needsBack = form.documentType === 'KTP' || form.documentType === 'SIM';
      if (!docFlags.hasFront) errors.docFront = 'Wajib upload foto depan';
      if (needsBack && !docFlags.hasBack) errors.docBack = 'Wajib upload foto belakang';
      if (!docFlags.hasSelfie) errors.docSelfie = 'Wajib upload selfie';
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export default function KycPage() {
  const t = useTranslations('portal.kyc');
  const locale = useLocale() as Locale;
  const isEn = locale === 'en';
  const { getAuthHeaders } = useAuth();
  const [summary, setSummary] = useState<KycSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormData>(initialForm);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [docState, setDocState] = useState<Record<DocKind, DocUploadState>>({
    front: { uploading: false, uploaded: false, error: null },
    back: { uploading: false, uploaded: false, error: null },
    selfie: { uploading: false, uploaded: false, error: null },
  });

  // Restore draft on mount — sync state dari localStorage (external storage).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<FormData>;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setForm((f) => ({ ...f, ...draft }));
        setDraftRestored(true);
      }
    } catch { /* empty */ }
  }, []);

  // Auto-save draft (debounced)
  useEffect(() => {
    const handle = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      } catch { /* quota / private mode */ }
    }, 800);
    return () => clearTimeout(handle);
  }, [form]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/kyc/status', { headers: getAuthHeaders() });
        if (res.ok) {
          const body = await res.json();
          setSummary(body.kyc);
          // Reflect doc uploads yang tersimpan di server ke local state.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setDocState((prev) => ({
            front: { ...prev.front, uploaded: Boolean(body.kyc?.hasFront) },
            back: { ...prev.back, uploaded: Boolean(body.kyc?.hasBack) },
            selfie: { ...prev.selfie, uploaded: Boolean(body.kyc?.hasSelfie) },
          }));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [getAuthHeaders]);

  const docFlags = useMemo(() => ({
    hasFront: docState.front.uploaded,
    hasBack: docState.back.uploaded,
    hasSelfie: docState.selfie.uploaded,
  }), [docState]);

  const stepValidation = useMemo(() => validateStep(step, form, docFlags), [step, form, docFlags]);

  async function uploadDoc(kind: DocKind, file: File) {
    setDocState((s) => ({ ...s, [kind]: { uploading: true, uploaded: false, error: null } }));
    try {
      const fd = new FormData();
      fd.append('kind', kind);
      fd.append('file', file);
      const res = await fetch('/api/kyc/upload', { method: 'POST', body: fd, credentials: 'same-origin' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
      // Bump docVersion locally so <Image> cache-busts
      setSummary((s) => ({
        ...(s ?? { status: 'NOT_SUBMITTED' as const }),
        docVersion: `${Date.now()}`,
        [kind === 'front' ? 'hasFront' : kind === 'back' ? 'hasBack' : 'hasSelfie']: true,
      }));
      setDocState((s) => ({ ...s, [kind]: { uploading: false, uploaded: true, error: null } }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'upload_failed';
      setDocState((s) => ({ ...s, [kind]: { uploading: false, uploaded: false, error: message } }));
    }
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      // Validate all steps
      for (let i = 0; i < TOTAL_STEPS - 1; i++) {
        const v = validateStep(i, form, docFlags);
        if (!v.valid) {
          setStep(i);
          setShowErrors(true);
          throw new Error(isEn ? 'Some required fields are missing' : 'Beberapa field wajib belum diisi');
        }
      }

      const res = await fetch('/api/kyc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
      setSummary({ status: 'PENDING_REVIEW', submittedAt: body.submittedAt });
      // Clear draft (sukses submit)
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* empty */ }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  function nextStep() {
    setShowErrors(true);
    if (!stepValidation.valid) return;
    setShowErrors(false);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function prevStep() {
    setShowErrors(false);
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const status = summary?.status ?? 'NOT_SUBMITTED';
  const meta = STATUS_META[status];
  const StatusIcon = meta.icon;
  const showForm = status === 'NOT_SUBMITTED' || status === 'REJECTED' || status === 'ADDITIONAL_INFO_REQUIRED';

  if (loading) {
    return <KycLoadingSkeleton />;
  }

  const today = new Date().toISOString().slice(0, 10);
  const minDob = new Date();
  minDob.setFullYear(minDob.getFullYear() - 100);

  return (
    <div className="portal-page-stack max-w-3xl pb-24">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <IdCard className="h-6 w-6 sm:h-7 sm:w-7 text-amber-600 dark:text-amber-400" />
            {t('page_title')}
          </span>
        }
        description={t('page_subtitle')}
      />

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

      {showForm && (
        <>
          {/* Draft restored notice */}
          {draftRestored && (
            <div className="rounded-md border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-700 dark:text-sky-300 flex items-start gap-2">
              <Loader2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {isEn
                  ? 'Draft restored from previous session. Auto-saved as you type.'
                  : 'Draft dipulihkan dari sesi sebelumnya. Auto-save saat Anda mengetik.'}
              </span>
            </div>
          )}

          {/* Step progress */}
          <StepIndicator step={step} isEn={isEn} />

          {error && (
            <div role="alert" className="p-3 rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-sm">
              {error}
            </div>
          )}

          {/* Step content */}
          {step === 0 && (
            <Card>
              <CardContent className="p-5 space-y-4">
                <h2 className="font-semibold flex items-center gap-2"><User className="w-4 h-4 text-amber-600 dark:text-amber-400" /> {t('section_personal')}</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field
                    label={t('field_full_name')}
                    required
                    value={form.fullName}
                    onChange={(v) => setForm({ ...form, fullName: v })}
                    error={showErrors ? stepValidation.errors.fullName : undefined}
                    autoComplete="name"
                  />
                  <Field
                    label={t('field_date_of_birth')}
                    type="date"
                    required
                    value={form.dateOfBirth}
                    onChange={(v) => setForm({ ...form, dateOfBirth: v })}
                    error={showErrors ? stepValidation.errors.dateOfBirth : undefined}
                    min={minDob.toISOString().slice(0, 10)}
                    max={today}
                    hint={isEn ? 'Must be 18 years or older' : 'Minimal 18 tahun'}
                  />
                  <Select
                    label={t('field_nationality')}
                    value={form.nationality}
                    onChange={(v) => setForm({ ...form, nationality: v })}
                    options={COUNTRY_OPTIONS}
                  />
                  <Field
                    label={t('field_occupation')}
                    required
                    value={form.occupation}
                    onChange={(v) => setForm({ ...form, occupation: v })}
                    error={showErrors ? stepValidation.errors.occupation : undefined}
                  />
                </div>
                <Field
                  label={t('field_source_of_funds')}
                  required
                  textarea
                  rows={3}
                  value={form.sourceOfFunds}
                  onChange={(v) => setForm({ ...form, sourceOfFunds: v })}
                  hint={t('field_source_of_funds_hint')}
                  error={showErrors ? stepValidation.errors.sourceOfFunds : undefined}
                />
              </CardContent>
            </Card>
          )}

          {step === 1 && (
            <Card>
              <CardContent className="p-5 space-y-4">
                <h2 className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400" /> {t('section_address')}</h2>
                <Field
                  label={t('field_address_line1')}
                  required
                  value={form.addressLine1}
                  onChange={(v) => setForm({ ...form, addressLine1: v })}
                  error={showErrors ? stepValidation.errors.addressLine1 : undefined}
                  autoComplete="address-line1"
                />
                <Field
                  label={t('field_address_line2')}
                  value={form.addressLine2}
                  onChange={(v) => setForm({ ...form, addressLine2: v })}
                  autoComplete="address-line2"
                />
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Field
                    label={t('field_city')}
                    required
                    value={form.city}
                    onChange={(v) => setForm({ ...form, city: v })}
                    error={showErrors ? stepValidation.errors.city : undefined}
                    autoComplete="address-level2"
                  />
                  {form.country === 'ID' ? (
                    <Select
                      label={t('field_province')}
                      value={form.province}
                      onChange={(v) => setForm({ ...form, province: v })}
                      options={[{ value: '', label: '—' }, ...ID_PROVINCES.map((p) => ({ value: p, label: p }))]}
                    />
                  ) : (
                    <Field
                      label={t('field_province')}
                      required
                      value={form.province}
                      onChange={(v) => setForm({ ...form, province: v })}
                      error={showErrors ? stepValidation.errors.province : undefined}
                    />
                  )}
                  <Field
                    label={t('field_postal_code')}
                    required
                    value={form.postalCode}
                    onChange={(v) => setForm({ ...form, postalCode: v.replace(/[^\d]/g, '') })}
                    error={showErrors ? stepValidation.errors.postalCode : undefined}
                    inputMode="numeric"
                    autoComplete="postal-code"
                  />
                  <Select
                    label={t('field_country')}
                    value={form.country}
                    onChange={(v) => setForm({ ...form, country: v })}
                    options={COUNTRY_OPTIONS}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardContent className="p-5 space-y-5">
                <h2 className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" /> {t('section_document')}</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Select
                    label={t('field_document_type')}
                    value={form.documentType}
                    onChange={(v) => setForm({ ...form, documentType: v as FormData['documentType'], documentNumber: '' })}
                    options={[
                      { value: 'KTP', label: t('doc_ktp') },
                      { value: 'SIM', label: t('doc_sim') },
                      { value: 'NPWP', label: t('doc_npwp') },
                      { value: 'PASSPORT', label: t('doc_passport') },
                      { value: 'NATIONAL_ID', label: isEn ? 'National ID (foreign)' : 'Kartu Identitas Nasional (asing)' },
                      { value: 'DRIVER_LICENSE', label: isEn ? 'Driver License (international)' : 'SIM Internasional' },
                    ]}
                  />
                  <Field
                    label={t('field_document_number')}
                    required
                    value={form.documentNumber}
                    onChange={(v) => setForm({ ...form, documentNumber: v.toUpperCase() })}
                    error={showErrors ? stepValidation.errors.documentNumber : undefined}
                    hint={isEn ? DOC_NUMBER_PATTERN[form.documentType].hintEn : DOC_NUMBER_PATTERN[form.documentType].hintId}
                    mono
                  />
                </div>

                {/* Doc photo uploads */}
                <div className="pt-4 mt-2 border-t border-border/60 space-y-4">
                  <div>
                    <p className="font-medium text-sm flex items-center gap-2 mb-1">
                      <Upload className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      {isEn ? 'Document photos' : 'Foto dokumen'}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {isEn
                        ? 'JPEG, PNG, or WebP. Max 8MB each. All photos are encrypted and only accessible by you and authorized reviewers.'
                        : 'JPEG, PNG, atau WebP. Maks 8MB per file. Semua foto disimpan terenkripsi dan hanya dapat diakses Anda dan tim reviewer.'}
                    </p>
                  </div>

                  <UploadField
                    kind="front"
                    label={isEn ? `${form.documentType} — front side` : `${form.documentType} — sisi depan`}
                    hint={isEn ? 'Take a clear photo of the front side. All four corners must be visible.' : 'Foto jelas sisi depan. Pastikan keempat sudut terlihat.'}
                    state={docState.front}
                    summary={summary}
                    onUpload={(file) => uploadDoc('front', file)}
                    showError={showErrors ? stepValidation.errors.docFront : undefined}
                    locale={locale}
                  />

                  {(form.documentType === 'KTP' || form.documentType === 'SIM') && (
                    <UploadField
                      kind="back"
                      label={isEn ? `${form.documentType} — back side` : `${form.documentType} — sisi belakang`}
                      hint={isEn ? 'Photo of the back side (NIK / address info).' : 'Foto sisi belakang (NIK / info alamat).'}
                      state={docState.back}
                      summary={summary}
                      onUpload={(file) => uploadDoc('back', file)}
                      showError={showErrors ? stepValidation.errors.docBack : undefined}
                      locale={locale}
                    />
                  )}

                  <UploadField
                    kind="selfie"
                    label={isEn ? 'Selfie holding the document' : 'Selfie sambil memegang dokumen'}
                    hint={isEn
                      ? 'Hold your document next to your face. Face and document number must both be readable.'
                      : 'Pegang dokumen di samping wajah. Wajah dan nomor dokumen harus terbaca.'}
                    state={docState.selfie}
                    summary={summary}
                    onUpload={(file) => uploadDoc('selfie', file)}
                    showError={showErrors ? stepValidation.errors.docSelfie : undefined}
                    locale={locale}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardContent className="p-5 space-y-4">
                <h2 className="font-semibold flex items-center gap-2"><BarChart3 className="w-4 h-4 text-amber-600 dark:text-amber-400" /> {t('section_risk_profile')}</h2>
                <div className="grid sm:grid-cols-3 gap-4">
                  <Select
                    label={t('field_investment_experience')}
                    value={form.investmentExperience}
                    onChange={(v) => setForm({ ...form, investmentExperience: v as FormData['investmentExperience'] })}
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
                    onChange={(v) => setForm({ ...form, riskTolerance: v as FormData['riskTolerance'] })}
                    options={[
                      { value: 'conservative', label: t('risk_conservative') },
                      { value: 'moderate', label: t('risk_moderate') },
                      { value: 'aggressive', label: t('risk_aggressive') },
                    ]}
                  />
                  <Select
                    label={t('field_expected_volume')}
                    value={form.expectedMonthlyVolume}
                    onChange={(v) => setForm({ ...form, expectedMonthlyVolume: v as FormData['expectedMonthlyVolume'] })}
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
          )}

          {/* Sticky bottom action bar */}
          <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-40 border-t border-border/60 bg-background/95 backdrop-blur px-4 py-3 flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground hidden sm:block">
              {isEn ? `Step ${step + 1} of ${TOTAL_STEPS}` : `Langkah ${step + 1} dari ${TOTAL_STEPS}`}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              {step > 0 && (
                <Button type="button" variant="outline" onClick={prevStep} disabled={submitting}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  {isEn ? 'Back' : 'Kembali'}
                </Button>
              )}
              {step < TOTAL_STEPS - 1 ? (
                <Button type="button" onClick={nextStep} disabled={submitting}>
                  {isEn ? 'Next' : 'Lanjut'}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button type="button" onClick={submit} disabled={submitting} size="lg">
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t('submit_button')}
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StepIndicator({ step, isEn }: { step: number; isEn: boolean }) {
  const labels = isEn
    ? ['Personal', 'Address', 'Document', 'Risk Profile']
    : ['Personal', 'Alamat', 'Dokumen', 'Risk Profile'];
  const icons = [User, MapPin, FileText, BarChart3];
  return (
    <div className="flex items-center justify-between gap-2">
      {labels.map((label, i) => {
        const Icon = icons[i];
        const done = i < step;
        const active = i === step;
        return (
          <div key={label} className="flex-1 flex items-center gap-2">
            <div
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs',
                active && 'bg-amber-500 text-amber-50 dark:text-amber-950 font-semibold',
                done && 'text-emerald-600 dark:text-emerald-400',
                !active && !done && 'text-muted-foreground',
              )}
            >
              {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{i + 1}</span>
            </div>
            {i < labels.length - 1 && (
              <div className={cn('flex-1 h-px', done ? 'bg-emerald-500/60' : 'bg-border/60')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SummaryRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-2 py-1 border-b border-border/40 last:border-0">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className={cn('text-foreground text-right truncate ml-2', mono && 'font-mono')}>
        {value || '—'}
      </dd>
    </div>
  );
}

function KycLoadingSkeleton() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function Field({
  label, value, onChange, type = 'text', required, textarea, rows, hint, error, autoComplete, min, max, inputMode, mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  textarea?: boolean;
  rows?: number;
  hint?: string;
  error?: string;
  autoComplete?: string;
  min?: string;
  max?: string;
  inputMode?: 'numeric' | 'text';
  mono?: boolean;
}) {
  const baseInputCls = cn(
    'w-full text-sm rounded-md border bg-background px-3 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2',
    error
      ? 'border-rose-500/50 focus-visible:ring-rose-500/50'
      : 'border-input focus-visible:ring-ring',
    mono && 'font-mono',
  );
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        {label}{required && <span className="text-rose-600 dark:text-rose-400 ml-0.5">*</span>}
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
          autoComplete={autoComplete}
          min={min}
          max={max}
          inputMode={inputMode}
        />
      )}
      {error ? (
        <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      ) : null}
    </div>
  );
}

function UploadField({
  kind, label, hint, state, summary, onUpload, showError, locale,
}: {
  kind: DocKind;
  label: string;
  hint: string;
  state: DocUploadState;
  summary: KycSummary | null;
  onUpload: (file: File) => Promise<void>;
  showError?: string;
  locale: Locale;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isEn = locale === 'en';
  const previewSrc = state.uploaded && summary?.docVersion
    ? `/api/kyc/document?kind=${kind}&v=${encodeURIComponent(summary.docVersion)}`
    : null;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    void onUpload(file);
    // Reset input so user bisa re-upload file dengan nama sama
    e.target.value = '';
  }

  const showErr = showError ?? state.error;

  return (
    <div className="rounded-md border border-input bg-background/50 p-4">
      <div className="flex items-start gap-4">
        {/* Preview thumbnail */}
        <div className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded border border-border/60 bg-muted/40 overflow-hidden flex items-center justify-center relative">
          {previewSrc ? (
            // Use unoptimized untuk authenticated stream — Image optimizer
            // fetch tidak include cookie, jadi sub-request akan 401.
            <Image
              src={previewSrc}
              alt={label}
              fill
              unoptimized
              className="object-cover"
              sizes="96px"
            />
          ) : kind === 'selfie' ? (
            <Camera className="w-8 h-8 text-muted-foreground/40" />
          ) : (
            <FileText className="w-8 h-8 text-muted-foreground/40" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{hint}</p>

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture={kind === 'selfie' ? 'user' : undefined}
              onChange={handleFile}
              className="hidden"
            />
            <Button
              type="button"
              variant={state.uploaded ? 'outline' : 'default'}
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={state.uploading}
            >
              {state.uploading ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> {isEn ? 'Uploading…' : 'Mengupload…'}</>
              ) : state.uploaded ? (
                <><CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600 dark:text-emerald-400" /> {isEn ? 'Replace' : 'Ganti foto'}</>
              ) : (
                <><Upload className="w-4 h-4 mr-1.5" /> {isEn ? 'Choose file' : 'Pilih file'}</>
              )}
            </Button>
            {state.uploaded && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isEn ? 'Uploaded' : 'Terupload'}
              </span>
            )}
          </div>

          {showErr && (
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span className="break-words">{showErr}</span>
            </p>
          )}
        </div>

        {state.uploaded && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="shrink-0 p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label={isEn ? 'Replace photo' : 'Ganti foto'}
            title={isEn ? 'Replace photo' : 'Ganti foto'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
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
