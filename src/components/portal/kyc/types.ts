/**
 * Shared types and constants for KYC wizard sub-components.
 */
import type { Locale } from '@/lib/format-locale';

// ─── Form data shape ─────────────────────────────────────────────────────
export interface KycFormData {
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

export const initialForm: KycFormData = {
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

// ─── KYC status ──────────────────────────────────────────────────────────
export interface KycSummary {
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

export type DocKind = 'front' | 'back' | 'selfie';

export interface DocUploadState {
  uploading: boolean;
  uploaded: boolean;
  error: string | null;
}

export type StepErrors = Partial<Record<keyof KycFormData | 'docFront' | 'docBack' | 'docSelfie', string>>;

// ─── Shared props for step components ────────────────────────────────────
export interface StepProps {
  form: KycFormData;
  onChange: (patch: Partial<KycFormData>) => void;
  errors: StepErrors;
  showErrors: boolean;
  locale: Locale;
}

// ─── Constants ───────────────────────────────────────────────────────────
export const TOTAL_STEPS = 4;
export const DRAFT_KEY = 'babah.kyc.draft.v1';

export const ID_PROVINCES = [
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

export const COUNTRY_OPTIONS = [
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

export const DOC_NUMBER_PATTERN: Record<KycFormData['documentType'], { pattern: RegExp; hintId: string; hintEn: string }> = {
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

// ─── Validation ──────────────────────────────────────────────────────────
export function computeAge(dob: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export function validateStep(
  step: number,
  form: KycFormData,
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

// ─── STATUS_META ─────────────────────────────────────────────────────────
import {
  ShieldCheck, FileCheck, AlertCircle, Clock, XCircle,
} from 'lucide-react';

export const STATUS_META: Record<string, { tone: string; icon: typeof ShieldCheck; labelKey: string; descKey: string }> = {
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
