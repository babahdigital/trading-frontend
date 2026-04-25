'use client';

import { useEffect, useState } from 'react';
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

const STATUS_META: Record<string, { tone: string; icon: typeof ShieldCheck; label: string; desc: string }> = {
  NOT_SUBMITTED: {
    tone: 'border-amber-500/30 bg-amber-500/5 text-amber-300',
    icon: AlertCircle,
    label: 'Belum Disubmit',
    desc: 'Lengkapi formulir di bawah untuk memulai proses verifikasi.',
  },
  PENDING_REVIEW: {
    tone: 'border-blue-500/30 bg-blue-500/5 text-blue-300',
    icon: Clock,
    label: 'Menunggu Review',
    desc: 'Tim kami akan meninjau dalam 1-2 hari kerja. Status akan ter-update di sini.',
  },
  ADDITIONAL_INFO_REQUIRED: {
    tone: 'border-amber-500/30 bg-amber-500/5 text-amber-300',
    icon: FileCheck,
    label: 'Informasi Tambahan Diperlukan',
    desc: 'Periksa email Anda untuk detail informasi yang perlu dilengkapi.',
  },
  APPROVED: {
    tone: 'border-green-500/30 bg-green-500/5 text-green-300',
    icon: ShieldCheck,
    label: 'Terverifikasi',
    desc: 'Akun Anda sudah ter-KYC. Semua produk trading dapat diakses penuh.',
  },
  REJECTED: {
    tone: 'border-red-500/30 bg-red-500/5 text-red-300',
    icon: XCircle,
    label: 'Ditolak',
    desc: 'Submit ulang setelah memperbaiki data sesuai catatan tim review.',
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

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
          <IdCard className="h-6 w-6 sm:h-7 sm:w-7 text-amber-400" />
          Verifikasi Identitas (KYC)
        </h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Standar institusional mewajibkan verifikasi identitas sebelum aktivasi produk berbayar.
        </p>
      </div>

      <Card className={cn('border-2', meta.tone)}>
        <CardContent className="p-5 flex items-start gap-3">
          <StatusIcon className="h-6 w-6 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-bold">{meta.label}</p>
            <p className="text-sm opacity-90 mt-0.5">{meta.desc}</p>
            {summary?.rejectionReason && (
              <div className="mt-3 p-3 rounded bg-red-500/10 border border-red-500/30 text-sm">
                <span className="font-semibold">Alasan: </span>{summary.rejectionReason}
              </div>
            )}
            {summary?.submittedAt && (
              <p className="text-xs mt-2 opacity-70 font-mono">
                Disubmit: {new Date(summary.submittedAt).toLocaleString('id-ID')}
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
              <h2 className="font-semibold">Data Pribadi</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Nama Lengkap (sesuai KTP)" required value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} />
                <Field label="Tanggal Lahir" type="date" required value={form.dateOfBirth} onChange={(v) => setForm({ ...form, dateOfBirth: v })} />
                <Field label="Kewarganegaraan" value={form.nationality} onChange={(v) => setForm({ ...form, nationality: v })} />
                <Field label="Pekerjaan" required value={form.occupation} onChange={(v) => setForm({ ...form, occupation: v })} />
              </div>
              <Field label="Sumber Dana" required textarea rows={3} value={form.sourceOfFunds} onChange={(v) => setForm({ ...form, sourceOfFunds: v })} hint="Jelaskan sumber dana yang akan dipakai untuk trading (gaji, bisnis, investasi, dll)." />
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="font-semibold">Alamat</h2>
              <Field label="Alamat Baris 1" required value={form.addressLine1} onChange={(v) => setForm({ ...form, addressLine1: v })} />
              <Field label="Alamat Baris 2 (opsional)" value={form.addressLine2} onChange={(v) => setForm({ ...form, addressLine2: v })} />
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Field label="Kota" required value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
                <Field label="Provinsi" required value={form.province} onChange={(v) => setForm({ ...form, province: v })} />
                <Field label="Kode Pos" required value={form.postalCode} onChange={(v) => setForm({ ...form, postalCode: v })} />
                <Field label="Negara" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
              </div>
            </CardContent>
          </Card>

          {/* Document */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="font-semibold">Dokumen Identitas</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Select label="Jenis Dokumen" value={form.documentType} onChange={(v) => setForm({ ...form, documentType: v as FormData['documentType'] })}
                  options={[{ value: 'KTP', label: 'KTP (Kartu Tanda Penduduk)' }, { value: 'PASSPORT', label: 'Paspor' }, { value: 'SIM', label: 'SIM' }, { value: 'NPWP', label: 'NPWP' }]} />
                <Field label="Nomor Dokumen" required value={form.documentNumber} onChange={(v) => setForm({ ...form, documentNumber: v })} />
              </div>
              <p className="text-xs text-muted-foreground">
                Upload foto dokumen + selfie akan diminta pada tahap verifikasi setelah submit awal — tim akan kirim link upload aman.
              </p>
            </CardContent>
          </Card>

          {/* Risk profile */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="font-semibold">Profil Risiko Investasi</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                <Select label="Pengalaman Trading" value={form.investmentExperience} onChange={(v) => setForm({ ...form, investmentExperience: v as FormData['investmentExperience'] })}
                  options={[{ value: 'novice', label: 'Pemula (<1 tahun)' }, { value: 'intermediate', label: 'Menengah (1-3 tahun)' }, { value: 'advanced', label: 'Lanjutan (3-7 tahun)' }, { value: 'professional', label: 'Profesional (>7 tahun)' }]} />
                <Select label="Toleransi Risiko" value={form.riskTolerance} onChange={(v) => setForm({ ...form, riskTolerance: v as FormData['riskTolerance'] })}
                  options={[{ value: 'conservative', label: 'Konservatif' }, { value: 'moderate', label: 'Moderat' }, { value: 'aggressive', label: 'Agresif' }]} />
                <Select label="Volume Bulanan (USD)" value={form.expectedMonthlyVolume} onChange={(v) => setForm({ ...form, expectedMonthlyVolume: v as FormData['expectedMonthlyVolume'] })}
                  options={[{ value: 'lt_10k', label: '< $10K' }, { value: '10k_50k', label: '$10K - $50K' }, { value: '50k_250k', label: '$50K - $250K' }, { value: 'gt_250k', label: '> $250K' }]} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Submit untuk Review
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
