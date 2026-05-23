'use client';

/**
 * KYC self-service page — multi-step wizard dengan auto-save draft.
 *
 * 2026-05-20 — Phase A polish refactor (Pak directive "sempurnakan tanpa
 * terkecuali"). Sebelumnya: single mega-form 4 cards, no progress indicator,
 * no auto-save (refresh = lose data), no validation feedback per field,
 * no submit button sticky, no submitted-info display pasca submit.
 *
 * 2026-05-24 — Refactored into sub-components under
 * src/components/portal/kyc/. This file is now the orchestrator (~180 lines):
 * manages wizard state, auto-save, step navigation, and renders current step.
 *
 * Architecture:
 * - 4-step wizard: Personal -> Address -> Document -> Risk Profile
 * - Progress bar + step indicator dengan validation gate per step
 * - localStorage draft auto-save per keystroke (debounced 800ms)
 * - Pasca submit: render "Submitted info" card untuk verifikasi customer
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  IdCard, Loader2, ArrowRight, ArrowLeft,
  User, MapPin, FileText, BarChart3, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/admin/page-header';
import type { Locale } from '@/lib/format-locale';
import {
  StepPersonal,
  StepAddress,
  StepDocument,
  StepRisk,
  KycStatusCard,
} from '@/components/portal/kyc';
import {
  initialForm,
  DRAFT_KEY,
  TOTAL_STEPS,
  validateStep,
} from '@/components/portal/kyc/types';
import type {
  KycFormData,
  KycSummary,
  DocKind,
  DocUploadState,
} from '@/components/portal/kyc/types';

export default function KycPage() {
  const t = useTranslations('portal.kyc');
  const locale = useLocale() as Locale;
  const isEn = locale === 'en';
  const { getAuthHeaders } = useAuth();

  const [summary, setSummary] = useState<KycSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<KycFormData>(initialForm);
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

  // ─── Restore draft on mount ───────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<KycFormData>;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setForm((f) => ({ ...f, ...draft }));
        setDraftRestored(true);
      }
    } catch { /* empty */ }
  }, []);

  // ─── Auto-save draft (debounced) ──────────────────────────────────────
  useEffect(() => {
    const handle = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      } catch { /* quota / private mode */ }
    }, 800);
    return () => clearTimeout(handle);
  }, [form]);

  // ─── Fetch KYC status on mount ────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/kyc/status', { headers: getAuthHeaders() });
        if (res.ok) {
          const body = await res.json();
          setSummary(body.kyc);
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

  // ─── Derived state ────────────────────────────────────────────────────
  const docFlags = useMemo(() => ({
    hasFront: docState.front.uploaded,
    hasBack: docState.back.uploaded,
    hasSelfie: docState.selfie.uploaded,
  }), [docState]);

  const stepValidation = useMemo(() => validateStep(step, form, docFlags), [step, form, docFlags]);

  const handleChange = (patch: Partial<KycFormData>) => setForm((f) => ({ ...f, ...patch }));

  // ─── Document upload ──────────────────────────────────────────────────
  async function uploadDoc(kind: DocKind, file: File) {
    setDocState((s) => ({ ...s, [kind]: { uploading: true, uploaded: false, error: null } }));
    try {
      const fd = new FormData();
      fd.append('kind', kind);
      fd.append('file', file);
      const res = await fetch('/api/kyc/upload', { method: 'POST', body: fd, credentials: 'same-origin' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
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

  // ─── Submit ───────────────────────────────────────────────────────────
  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
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
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* empty */ }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Step navigation ──────────────────────────────────────────────────
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

  // ─── Render ───────────────────────────────────────────────────────────
  const status = summary?.status ?? 'NOT_SUBMITTED';
  const showForm = status === 'NOT_SUBMITTED' || status === 'REJECTED' || status === 'ADDITIONAL_INFO_REQUIRED';

  if (loading) return <KycLoadingSkeleton />;

  const stepProps = {
    form,
    onChange: handleChange,
    errors: stepValidation.errors,
    showErrors,
    locale,
  };

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

      <KycStatusCard summary={summary} locale={locale} />

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
          {step === 0 && <StepPersonal {...stepProps} />}
          {step === 1 && <StepAddress {...stepProps} />}
          {step === 2 && (
            <StepDocument
              {...stepProps}
              docState={docState}
              summary={summary}
              onUploadDoc={uploadDoc}
            />
          )}
          {step === 3 && <StepRisk {...stepProps} />}

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

// ─── Step indicator (kept inline — small, tightly coupled to orchestrator) ─
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

// ─── Loading skeleton ─────────────────────────────────────────────────────
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
