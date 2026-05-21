'use client';

/**
 * CookieConsent — granular consent dialog dengan 3 tier:
 *   - Essential (always on, locked)
 *   - Analytics (opt-in)
 *   - Marketing (opt-in)
 *
 * Refactor 2026-05-21 (Pak Abdullah directive): layout statis + pesan tidak
 * dinamis → granular dialog dengan animasi entry, expand/collapse customize,
 * dan persisted preferences ke localStorage (key: `cookie-consent-v2`).
 *
 * Storage shape (v2):
 *   { version: 2, essential: true, analytics: bool, marketing: bool, ts: ISO }
 *
 * Backward compat: kalau ada `cookie-consent: 'accepted'` (v1 schema) →
 * treat sebagai accept-all + migrate ke v2.
 */
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Cookie, Check, Shield, BarChart3, Megaphone, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY_V2 = 'cookie-consent-v2';
const STORAGE_KEY_V1 = 'cookie-consent';

interface ConsentState {
  version: 2;
  essential: true;
  analytics: boolean;
  marketing: boolean;
  ts: string;
}

function readConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_V2);
    if (raw) {
      const parsed = JSON.parse(raw) as ConsentState;
      if (parsed?.version === 2) return parsed;
    }
    // v1 → migrate
    const v1 = localStorage.getItem(STORAGE_KEY_V1);
    if (v1 === 'accepted') {
      const migrated: ConsentState = {
        version: 2, essential: true, analytics: true, marketing: true,
        ts: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(migrated));
      localStorage.removeItem(STORAGE_KEY_V1);
      return migrated;
    }
  } catch {
    /* storage unavailable */
  }
  return null;
}

function persistConsent(state: Omit<ConsentState, 'version' | 'ts' | 'essential'>) {
  try {
    const payload: ConsentState = {
      version: 2,
      essential: true,
      analytics: state.analytics,
      marketing: state.marketing,
      ts: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(payload));
  } catch {
    /* non-fatal */
  }
}

export function CookieConsent() {
  const t = useTranslations('cookie_consent');
  const [show, setShow] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(true);

  useEffect(() => {
    // Show banner kalau belum ada consent — derive UI from localStorage at mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!readConsent()) setShow(true);
  }, []);

  const acceptAll = useCallback(() => {
    persistConsent({ analytics: true, marketing: true });
    setShow(false);
  }, []);

  const essentialOnly = useCallback(() => {
    persistConsent({ analytics: false, marketing: false });
    setShow(false);
  }, []);

  const savePreferences = useCallback(() => {
    persistConsent({ analytics, marketing });
    setShow(false);
  }, [analytics, marketing]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[90] p-3 sm:p-4 md:p-5 animate-in slide-in-from-bottom-8 duration-500"
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
    >
      <div
        className={cn(
          'mx-auto max-w-4xl overflow-hidden rounded-2xl bg-card/95 backdrop-blur-xl shadow-2xl',
          'border border-border ring-1 ring-amber-500/10',
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 sm:p-6 border-b border-border/60">
          <div className="shrink-0 rounded-xl bg-amber-500/10 border border-amber-500/30 p-2.5">
            <Cookie className="h-5 w-5 text-amber-500" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-amber-600 dark:text-amber-400 font-semibold mb-1">
              {t('eyebrow')}
            </p>
            <h2 id="cookie-consent-title" className="font-display text-lg sm:text-xl font-bold leading-tight mb-1.5">
              {t('title')}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {t('body')}{' '}
              <Link href="/legal/cookies" className="text-amber-600 dark:text-amber-400 underline-offset-2 hover:underline">
                {t('learn_more')} →
              </Link>
            </p>
          </div>
        </div>

        {/* Granular toggles — collapsed by default */}
        {expanded && (
          <div className="border-b border-border/60 p-5 sm:p-6 space-y-3 animate-in slide-in-from-top-2 duration-300">
            <ConsentRow
              icon={Shield}
              label={t('essential_label')}
              desc={t('essential_desc')}
              checked
              locked
              lockedLabel={t('always_on')}
            />
            <ConsentRow
              icon={BarChart3}
              label={t('analytics_label')}
              desc={t('analytics_desc')}
              checked={analytics}
              onChange={setAnalytics}
            />
            <ConsentRow
              icon={Megaphone}
              label={t('marketing_label')}
              desc={t('marketing_desc')}
              checked={marketing}
              onChange={setMarketing}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 p-4 sm:p-5 bg-muted/20">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium',
              'text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors',
            )}
          >
            {t('customize')}
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')}
              aria-hidden
            />
          </button>
          <div className="flex-1 sm:flex sm:justify-end gap-2 grid grid-cols-1 sm:grid-cols-none sm:flex-row">
            {expanded ? (
              <button
                type="button"
                onClick={savePreferences}
                className={cn(
                  'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold',
                  'bg-gradient-to-r from-amber-500 to-amber-400 text-amber-950',
                  'hover:from-amber-400 hover:to-amber-300 shadow-md transition-all',
                )}
              >
                <Check className="h-4 w-4" aria-hidden />
                {t('save_preferences')}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={essentialOnly}
                  className={cn(
                    'px-4 py-2.5 rounded-lg text-sm font-medium',
                    'text-foreground border border-border hover:bg-muted/50 transition-colors',
                  )}
                >
                  {t('essential_only')}
                </button>
                <button
                  type="button"
                  onClick={acceptAll}
                  className={cn(
                    'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold',
                    'bg-gradient-to-r from-amber-500 to-amber-400 text-amber-950',
                    'hover:from-amber-400 hover:to-amber-300 shadow-md transition-all',
                  )}
                >
                  <Check className="h-4 w-4" aria-hidden />
                  {t('accept_all')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-component ────────────────────────────────────────────

interface ConsentRowProps {
  icon: typeof Shield;
  label: string;
  desc: string;
  checked: boolean;
  locked?: boolean;
  lockedLabel?: string;
  onChange?: (v: boolean) => void;
}

function ConsentRow({ icon: Icon, label, desc, checked, locked, lockedLabel, onChange }: ConsentRowProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/40 p-3.5">
      <div className="shrink-0 rounded-md bg-muted/40 p-2">
        <Icon className="h-4 w-4 text-foreground/60" aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-sm font-semibold">{label}</span>
          {locked && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
              <Check className="h-3 w-3" aria-hidden />
              {lockedLabel}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
      </div>
      <label className={cn('shrink-0', locked && 'opacity-40 cursor-not-allowed')}>
        <input
          type="checkbox"
          checked={checked}
          disabled={locked}
          onChange={(e) => onChange?.(e.target.checked)}
          className="sr-only peer"
          aria-label={label}
        />
        <span
          aria-hidden
          className={cn(
            'relative block h-6 w-11 rounded-full transition-colors cursor-pointer',
            checked ? 'bg-amber-500' : 'bg-muted',
            locked && 'cursor-not-allowed',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform',
              checked && 'translate-x-5',
            )}
          />
        </span>
      </label>
    </div>
  );
}
