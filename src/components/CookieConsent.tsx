'use client';

/**
 * CookieConsent — granular consent dialog dengan 3 tier:
 *   - Essential (always on, locked)
 *   - Analytics (opt-in)
 *   - Marketing (opt-in)
 *
 * Refactor 2026-05-22 (Pak Abdullah audit): wide-screen layout — 2-column
 * di lg+ (left copy, right actions/toggles), max-width expand ke 6xl untuk
 * presence yang lebih premium di monitor besar. Mobile/tablet tetap single
 * column compact.
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
      className="fixed inset-x-0 bottom-0 z-[90] p-3 sm:p-4 md:p-5 lg:p-6 animate-in slide-in-from-bottom-8 duration-500"
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
    >
      <div
        className={cn(
          // Wider container untuk premium feel di big screen: 7xl di xl+,
          // 6xl di lg, 4xl di md, full di mobile.
          'mx-auto max-w-4xl lg:max-w-6xl xl:max-w-7xl overflow-hidden rounded-2xl bg-card/95 backdrop-blur-xl shadow-2xl',
          'border border-border ring-1 ring-amber-500/10',
        )}
      >
        {/* ─── MAIN GRID ─── 2-column lg+, stack mobile */}
        <div className={cn(
          'grid gap-0',
          // lg+: 2 kolom (5fr copy + 3fr actions). Action panel diberi
          // background distinct supaya CTA stand out.
          'lg:grid-cols-[1.65fr_1fr]',
        )}>
          {/* ─── LEFT COLUMN: copy + expanded toggles ─── */}
          <div className="p-5 sm:p-6 lg:p-7 xl:p-8">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="shrink-0 rounded-xl bg-amber-500/10 border border-amber-500/30 p-2.5 lg:p-3">
                <Cookie className="h-5 w-5 lg:h-6 lg:w-6 text-amber-500" aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] lg:text-xs font-mono uppercase tracking-[0.15em] text-amber-600 dark:text-amber-400 font-semibold mb-1">
                  {t('eyebrow')}
                </p>
                <h2 id="cookie-consent-title" className="font-display text-lg sm:text-xl lg:text-2xl font-bold leading-tight mb-2 text-foreground">
                  {t('title')}
                </h2>
                <p className="text-xs sm:text-sm lg:text-[15px] text-muted-foreground leading-relaxed">
                  {t('body')}{' '}
                  <Link href="/legal/cookies" className="text-amber-600 dark:text-amber-400 underline-offset-2 hover:underline whitespace-nowrap">
                    {t('learn_more')} →
                  </Link>
                </p>
              </div>
            </div>

            {/* Granular toggles — collapsed by default, expand inline kiri */}
            {expanded && (
              <div className="mt-5 lg:mt-6 space-y-2.5 animate-in slide-in-from-top-2 duration-300">
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
          </div>

          {/* ─── RIGHT COLUMN: actions panel ─── */}
          {/* Distinct background untuk action area; vertical center align di
              lg+, edge top border di mobile (column stack). */}
          <div className={cn(
            'bg-muted/20 lg:bg-muted/30 border-t lg:border-t-0 lg:border-l border-border/60',
            'flex flex-col justify-center gap-3',
            'p-4 sm:p-5 lg:p-6 xl:p-7',
          )}>
            {/* Customize toggle — top on lg+ */}
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className={cn(
                'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium',
                'text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors',
                'border border-transparent hover:border-border/40',
              )}
            >
              {t('customize')}
              <ChevronDown
                className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')}
                aria-hidden
              />
            </button>

            {/* Primary actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
              {expanded ? (
                <button
                  type="button"
                  onClick={savePreferences}
                  className={cn(
                    'inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-lg text-sm font-semibold',
                    'bg-gradient-to-r from-amber-500 to-amber-400 text-amber-950',
                    'hover:from-amber-400 hover:to-amber-300 shadow-md hover:shadow-lg transition-all',
                    'sm:col-span-2 lg:col-span-1',
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
                      'px-4 py-3 rounded-lg text-sm font-medium order-2 lg:order-1',
                      'text-foreground border border-border hover:bg-muted/60 transition-colors',
                    )}
                  >
                    {t('essential_only')}
                  </button>
                  <button
                    type="button"
                    onClick={acceptAll}
                    className={cn(
                      'inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-lg text-sm font-semibold order-1 lg:order-2',
                      'bg-gradient-to-r from-amber-500 to-amber-400 text-amber-950',
                      'hover:from-amber-400 hover:to-amber-300 shadow-md hover:shadow-lg transition-all',
                    )}
                  >
                    <Check className="h-4 w-4" aria-hidden />
                    {t('accept_all')}
                  </button>
                </>
              )}
            </div>

            {/* Fine print di action panel — visible di lg+ */}
            <p className="hidden lg:block text-[11px] text-muted-foreground/60 leading-relaxed pt-1">
              {t('eyebrow') /* GDPR & UU PDP compliant */}
            </p>
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
    <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/40 p-3 sm:p-3.5">
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
