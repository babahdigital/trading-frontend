'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, ArrowRight, X, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Onboarding 4-step checklist — visible saat ada step yang belum tuntas.
 *
 * Backend: GET /api/forex/me/onboarding-status (Phase 14V)
 * Response: { signup, mt5, equity_synced, pair_selected, completed_at? }
 *
 * Behavior:
 *   - Auto-poll 60s sampai semua step done
 *   - Bisa di-dismiss user via localStorage flag (kembali kalau buka session baru)
 *   - Card hilang otomatis saat completed_at != null
 *
 * Locale: id default, bisa override via prop. Tidak butuh i18n namespace
 * khusus — copy pendek pakai local map (mirror pattern NewsletterForm).
 */

interface OnboardingPayload {
  source?: string;
  signup: boolean;
  mt5: boolean;
  equity_synced: boolean;
  pair_selected: boolean;
  completed_at?: string | null;
}

interface OnboardingChecklistProps {
  locale?: 'id' | 'en';
  className?: string;
}

const COPY: Record<'id' | 'en', {
  title: string;
  subtitle: string;
  dismiss: string;
  steps: { signup: string; mt5: string; equity: string; pair: string };
  ctas: { signup: string; mt5: string; equity: string; pair: string };
  hrefs: { signup: string; mt5: string; equity: string; pair: string };
  completed: { title: string; body: string };
}> = {
  id: {
    title: 'Lanjutkan onboarding',
    subtitle: 'Empat langkah singkat supaya bot mulai trading di akun Anda.',
    dismiss: 'Tutup',
    steps: {
      signup: 'Daftar akun BabahAlgo',
      mt5: 'Hubungkan akun MT5 (broker partner Anda)',
      equity: 'Verifikasi sync equity dari broker (~60 detik)',
      pair: 'Pilih pair yang aktif untuk strategi Anda',
    },
    ctas: {
      signup: 'Sudah',
      mt5: 'Hubungkan MT5',
      equity: 'Cek status',
      pair: 'Pilih pair',
    },
    hrefs: {
      signup: '/portal',
      mt5: '/portal/my-vps',
      equity: '/portal/account',
      pair: '/portal/account#trading',
    },
    completed: {
      title: 'Semua langkah onboarding selesai',
      body: 'Bot siap eksekusi. Pantau performa real-time di dashboard ini.',
    },
  },
  en: {
    title: 'Continue onboarding',
    subtitle: 'Four short steps before the bot starts executing on your account.',
    dismiss: 'Dismiss',
    steps: {
      signup: 'Create your BabahAlgo account',
      mt5: 'Link your MT5 account (your broker partner)',
      equity: 'Verify equity sync from broker (~60 seconds)',
      pair: 'Choose the pairs active for your strategy',
    },
    ctas: {
      signup: 'Done',
      mt5: 'Link MT5',
      equity: 'Check status',
      pair: 'Pick pairs',
    },
    hrefs: {
      signup: '/portal',
      mt5: '/portal/my-vps',
      equity: '/portal/account',
      pair: '/portal/account#trading',
    },
    completed: {
      title: 'Onboarding completed',
      body: 'The bot is ready to execute. Track live performance from this dashboard.',
    },
  },
};

const DISMISS_KEY = 'babahalgo.onboarding.dismissed';

export function OnboardingChecklist({ locale = 'id', className }: OnboardingChecklistProps) {
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState<OnboardingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/client/onboarding-status', {
        headers: getAuthHeaders(),
        cache: 'no-store',
      });
      if (res.ok) {
        const body = (await res.json()) as OnboardingPayload;
        setData(body);
      }
    } catch {
      // network glitch — silent fail, retry next poll
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    try {
      // Sync dismissed dari sessionStorage — external storage hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (sessionStorage.getItem(DISMISS_KEY) === '1') setDismissed(true);
    } catch {
      /* sessionStorage disabled */
    }
    // fetchStatus drives setState — fetch on mount + 60s polling.
    fetchStatus();
    const interval = setInterval(fetchStatus, 60_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (loading || !data) return null;
  // Sudah completed → tampilkan banner sukses sekali (tidak persist setelah dismiss)
  if (data.completed_at && dismissed) return null;
  // Belum completed tapi user dismiss → hide sampai session baru
  if (!data.completed_at && dismissed) return null;

  const copy = COPY[locale];

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  // Completed state — soft banner sukses
  if (data.completed_at) {
    return (
      <div className={cn(
        'relative rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.06] via-card to-card p-5 sm:p-6',
        className,
      )}>
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 transition-colors"
          aria-label={copy.dismiss}
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.25} />
        </button>
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" strokeWidth={2} aria-hidden />
          <div>
            <p className="font-medium text-foreground">{copy.completed.title}</p>
            <p className="text-sm text-muted-foreground mt-1">{copy.completed.body}</p>
          </div>
        </div>
      </div>
    );
  }

  const stepEntries = [
    { key: 'signup' as const, done: data.signup },
    { key: 'mt5' as const, done: data.mt5 },
    { key: 'equity' as const, done: data.equity_synced },
    { key: 'pair' as const, done: data.pair_selected },
  ];

  const completedCount = stepEntries.filter((s) => s.done).length;
  const progressPct = Math.round((completedCount / stepEntries.length) * 100);
  const nextStep = stepEntries.find((s) => !s.done);

  return (
    <section className={cn(
      'relative rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.04] via-card to-card p-5 sm:p-6',
      className,
    )} aria-labelledby="onboarding-title">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 transition-colors"
        aria-label={copy.dismiss}
      >
        <X className="h-4 w-4" strokeWidth={2} />
      </button>

      <div className="flex items-start gap-3 mb-4">
        <Sparkles className="h-5 w-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" strokeWidth={2} aria-hidden />
        <div className="min-w-0">
          <h2 id="onboarding-title" className="font-display text-lg text-foreground mb-1 leading-tight">
            {copy.title}
          </h2>
          <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5 font-mono">
          <span>{completedCount}/{stepEntries.length}</span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-amber-500 dark:bg-amber-400 transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <ul className="space-y-2.5 mb-4">
        {stepEntries.map((step) => (
          <li
            key={step.key}
            className={cn(
              'flex items-start gap-3 rounded-lg border px-3 py-2.5',
              step.done
                ? 'border-emerald-500/20 bg-emerald-500/[0.04]'
                : 'border-border bg-background',
            )}
          >
            {step.done ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" strokeWidth={2.25} aria-hidden />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" strokeWidth={2} aria-hidden />
            )}
            <span className={cn('text-sm flex-1', step.done ? 'text-foreground/70 line-through decoration-emerald-500/30' : 'text-foreground')}>
              {copy.steps[step.key]}
            </span>
          </li>
        ))}
      </ul>

      {nextStep ? (
        <Button asChild>
          <Link href={copy.hrefs[nextStep.key]} className="inline-flex items-center gap-2">
            {copy.ctas[nextStep.key]} <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
          </Link>
        </Button>
      ) : null}
    </section>
  );
}
