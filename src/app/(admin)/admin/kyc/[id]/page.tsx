'use client';

import { useEffect, useState, useCallback, useMemo, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ShieldCheck, XCircle, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/admin/page-header';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';
import { kycStatusBadge } from '@/lib/admin/badges';
import { formatDateTime } from '@/lib/format-locale';

interface KycDetail {
  id: string;
  userId: string;
  status: 'NOT_SUBMITTED' | 'DRAFT' | 'PENDING_REVIEW' | 'ADDITIONAL_INFO_REQUIRED' | 'APPROVED' | 'REJECTED';
  fullName: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  occupation: string | null;
  sourceOfFunds: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
  documentType: string | null;
  documentNumber: string | null;
  documentFrontUrl: string | null;
  documentBackUrl: string | null;
  selfieUrl: string | null;
  investmentExperience: string | null;
  riskTolerance: string | null;
  expectedMonthlyVolume: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  notes: string | null;
  createdAt: string;
  user: { email: string; name: string | null; createdAt: string };
}

type Decision = 'APPROVED' | 'REJECTED' | 'ADDITIONAL_INFO_REQUIRED';

export default function AdminKycDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { getAuthHeaders } = useAuth();
  const [kyc, setKyc] = useState<KycDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState<Decision>('APPROVED');
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/kyc/${id}`, { headers: getAuthHeaders() });
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      setKyc(body.kyc);
      if (body.kyc?.notes) setNotes(body.kyc.notes);
      if (body.kyc?.rejectionReason) setRejectionReason(body.kyc.rejectionReason);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'fetch_failed');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, id]);

  useEffect(() => { void fetchDetail(); }, [fetchDetail]);

  async function submitReview() {
    if (decision !== 'APPROVED' && rejectionReason.trim().length < 5) {
      setError('Berikan alasan minimal 5 karakter untuk decision selain Approved.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/kyc/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          decision,
          rejectionReason: decision === 'APPROVED' ? undefined : rejectionReason,
          notes: notes || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
      setSuccess(`Decision tersimpan: ${decision}`);
      await fetchDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'submit_failed');
    } finally {
      setSubmitting(false);
    }
  }

  const docCacheBust = useMemo(() => kyc ? `${kyc.documentFrontUrl ?? ''}|${kyc.documentBackUrl ?? ''}|${kyc.selfieUrl ?? ''}` : '', [kyc]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!kyc) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">KYC tidak ditemukan.</p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link href="/admin/kyc"><ArrowLeft className="w-4 h-4 mr-1.5" /> Kembali</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const meta = kycStatusBadge(kyc.status);
  const reviewable = kyc.status === 'PENDING_REVIEW' || kyc.status === 'ADDITIONAL_INFO_REQUIRED';

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Review KYC — ${kyc.fullName ?? kyc.user.email}`}
        description={`Diajukan ${kyc.submittedAt ? formatDateTime(kyc.submittedAt) : '—'}`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/kyc"><ArrowLeft className="w-4 h-4 mr-1.5" /> Queue</Link>
          </Button>
        }
      />

      {/* Status banner */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className={cn('px-3 py-1 rounded-full text-xs font-semibold', meta.cls)}>{meta.label}</span>
            <div className="text-xs text-muted-foreground">
              {kyc.reviewedAt && (
                <p>Direview {formatDateTime(kyc.reviewedAt)} oleh {kyc.reviewedBy ?? '—'}</p>
              )}
              {kyc.rejectionReason && (
                <p className="text-rose-600 dark:text-rose-400 mt-0.5">Alasan: {kyc.rejectionReason}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Documents */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold mb-3 text-sm">Dokumen</h3>
            <div className="space-y-3">
              <DocPreview
                kycId={kyc.id}
                kind="front"
                exists={Boolean(kyc.documentFrontUrl)}
                label={`${kyc.documentType ?? 'Document'} — Depan`}
                cacheBust={docCacheBust}
              />
              {kyc.documentBackUrl && (
                <DocPreview
                  kycId={kyc.id}
                  kind="back"
                  exists
                  label={`${kyc.documentType ?? 'Document'} — Belakang`}
                  cacheBust={docCacheBust}
                />
              )}
              <DocPreview
                kycId={kyc.id}
                kind="selfie"
                exists={Boolean(kyc.selfieUrl)}
                label="Selfie + Dokumen"
                cacheBust={docCacheBust}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
              Cocokkan wajah selfie dengan foto dokumen. Periksa nomor dokumen terbaca dan tidak crop. Tolak kalau blurry, terpotong, atau identitas berbeda.
            </p>
          </CardContent>
        </Card>

        {/* Form data */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <Section title="Personal">
              <Row label="Nama lengkap" value={kyc.fullName} />
              <Row label="Tanggal lahir" value={kyc.dateOfBirth ? formatDateTime(kyc.dateOfBirth).split(' ')[0] : null} />
              <Row label="Kewarganegaraan" value={kyc.nationality} />
              <Row label="Pekerjaan" value={kyc.occupation} />
              <Row label="Sumber dana" value={kyc.sourceOfFunds} />
            </Section>
            <Section title="Alamat">
              <Row label="Alamat" value={[kyc.addressLine1, kyc.addressLine2].filter(Boolean).join(', ')} />
              <Row label="Kota / Provinsi" value={[kyc.city, kyc.province].filter(Boolean).join(', ')} />
              <Row label="Pos / Negara" value={[kyc.postalCode, kyc.country].filter(Boolean).join(' · ')} />
            </Section>
            <Section title="Dokumen">
              <Row label="Tipe" value={kyc.documentType} mono />
              <Row label="Nomor" value={kyc.documentNumber} mono />
            </Section>
            <Section title="Risk Profile">
              <Row label="Pengalaman investasi" value={kyc.investmentExperience} />
              <Row label="Toleransi risiko" value={kyc.riskTolerance} />
              <Row label="Volume estimasi/bulan" value={kyc.expectedMonthlyVolume} />
            </Section>
            <Section title="Akun">
              <Row label="Email" value={kyc.user.email} />
              <Row label="Nama akun" value={kyc.user.name} />
              <Row label="Registered" value={formatDateTime(kyc.user.createdAt)} />
              <Row
                label="Profil user"
                value={
                  <Link href={`/admin/customers?search=${encodeURIComponent(kyc.user.email)}`} className="text-amber-600 dark:text-amber-400 inline-flex items-center gap-1 hover:underline">
                    Lihat <ExternalLink className="w-3 h-3" />
                  </Link>
                }
              />
            </Section>
          </CardContent>
        </Card>
      </div>

      {/* Review action */}
      {reviewable && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="font-semibold text-sm">Decision Review</h3>

            <div className="grid sm:grid-cols-3 gap-2">
              {(['APPROVED', 'REJECTED', 'ADDITIONAL_INFO_REQUIRED'] as Decision[]).map((d) => {
                const Icon = d === 'APPROVED' ? ShieldCheck : d === 'REJECTED' ? XCircle : AlertTriangle;
                const tone = d === 'APPROVED'
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : d === 'REJECTED'
                    ? 'border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                    : 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300';
                const labels = { APPROVED: 'Setujui', REJECTED: 'Tolak', ADDITIONAL_INFO_REQUIRED: 'Minta info tambahan' };
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDecision(d)}
                    className={cn(
                      'p-3 rounded-md border-2 text-sm font-medium flex items-center gap-2 transition-colors',
                      decision === d ? tone : 'border-border hover:border-foreground/30',
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {labels[d]}
                  </button>
                );
              })}
            </div>

            {decision !== 'APPROVED' && (
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  {decision === 'REJECTED' ? 'Alasan penolakan (akan dikirim ke user)' : 'Info tambahan yang diminta'}
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder={decision === 'REJECTED' ? 'Mis: Foto dokumen blurry, mohon upload ulang dengan resolusi lebih tinggi.' : 'Mis: Mohon upload bukti alamat (tagihan listrik/PDAM).'}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1.5">Catatan internal (opsional, tidak dikirim ke user)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Catatan untuk reviewer berikutnya / record keeping"
              />
            </div>

            {error && (
              <div role="alert" className="p-3 rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-sm">
                {success}
              </div>
            )}

            <div className="flex justify-end">
              <Button type="button" onClick={submitReview} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Simpan keputusan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DocPreview({ kycId, kind, exists, label, cacheBust }: {
  kycId: string;
  kind: 'front' | 'back' | 'selfie';
  exists: boolean;
  label: string;
  cacheBust: string;
}) {
  if (!exists) {
    return (
      <div className="rounded border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
        {label} — belum upload
      </div>
    );
  }
  const src = `/api/admin/kyc/document?kycId=${encodeURIComponent(kycId)}&kind=${kind}&v=${encodeURIComponent(cacheBust)}`;
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1.5">{label}</p>
      <a href={src} target="_blank" rel="noreferrer" className="block relative w-full aspect-[4/3] rounded border border-border/60 overflow-hidden bg-muted/40 hover:border-amber-500/40 transition-colors">
        <Image src={src} alt={label} fill unoptimized className="object-contain" sizes="(max-width: 1024px) 100vw, 50vw" />
      </a>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{title}</h4>
      <dl className="grid grid-cols-1 gap-1.5 text-sm">
        {children}
      </dl>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 py-1 border-b border-border/40 last:border-0">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className={cn('text-foreground text-right break-words', mono && 'font-mono')}>
        {value || '—'}
      </dd>
    </div>
  );
}
