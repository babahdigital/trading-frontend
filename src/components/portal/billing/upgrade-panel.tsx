'use client';

/**
 * Portal billing — tier upgrade panel.
 *
 * Fully data-driven: tier list, naming, pricing, features, and CTA link
 * come from `/api/portal/billing/tiers` (PricingTier DB + backend tier
 * state). Adding/editing a tier in the admin CMS surfaces here without a
 * code change.
 *
 * Icon mapping is the only deterministic translation — slug `shield-check`
 * → `ShieldCheck`, etc. — done via a small lookup so new icons can be
 * registered by name from the backend response.
 */

import { useEffect, useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  ArrowRight,
  BadgeCheck,
  Crown,
  Gem,
  Loader2,
  Lock,
  Package,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

interface BilledTier {
  slug: string;
  forexTier: 'starter' | 'pro' | 'vip' | 'dedicated';
  upgradeable: boolean;
  rank: number;
  iconKey: string;
  priceLabel: string;
  name: { id: string; en: string };
  subtitle: { id: string; en: string };
  features: { id: string[]; en: string[] };
  cta: { label: { id: string; en: string }; link: string };
}

interface TiersResponse {
  ok: boolean;
  currentTier: string | null;
  currentTierRank: number | null;
  tiers: BilledTier[];
}

const ICON_REGISTRY: Record<string, LucideIcon> = {
  'shield-check': ShieldCheck,
  zap: Zap,
  sparkles: Sparkles,
  'badge-check': BadgeCheck,
  star: Star,
  crown: Crown,
  rocket: Rocket,
  gem: Gem,
  package: Package,
};

function pickIcon(key: string): LucideIcon {
  return ICON_REGISTRY[key] || ICON_REGISTRY.package;
}

function pickLocaleString(loc: string, value: { id: string; en: string }): string {
  return loc === 'en' ? value.en || value.id : value.id || value.en;
}

function pickLocaleList(loc: string, value: { id: string[]; en: string[] }): string[] {
  const list = loc === 'en' ? value.en : value.id;
  return Array.isArray(list) && list.length > 0 ? list : value.id;
}

export function UpgradePanel() {
  const t = useTranslations('portal_upgrade');
  const tErr = useTranslations('errors');
  const locale = useLocale();
  const toast = useToast();

  const [data, setData] = useState<TiersResponse | null>(null);
  const [sessionMissing, setSessionMissing] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/portal/billing/tiers', {
          credentials: 'same-origin',
          cache: 'no-store',
        });
        const body = (await res.json()) as TiersResponse & { code?: string; message?: string };
        if (cancelled) return;
        if (!res.ok) {
          setLoadError(body.message || t('me_load_failed'));
          return;
        }
        setData(body);
        if (!body.currentTier) setSessionMissing(true);
      } catch {
        if (!cancelled) setLoadError(t('me_load_failed'));
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tiers = data?.tiers ?? [];
  const currentRank = data?.currentTierRank ?? 0;
  const currentTier = data?.currentTier ?? '';

  const popularTier = useMemo(() => {
    const next = tiers.find((tier) => tier.rank === currentRank + 1);
    return next?.slug ?? tiers[Math.min(1, tiers.length - 1)]?.slug ?? null;
  }, [tiers, currentRank]);

  async function handleUpgrade(target: BilledTier) {
    setLoading(target.slug);
    try {
      const res = await fetch('/api/forex/me/tier-upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ target_tier: target.forexTier }),
      });
      const body = await res.json();
      if (!res.ok) {
        const message = resolveErrorMessage(body.code, body.message, tErr) ?? t('upgrade_failed');
        toast.push({ tone: 'error', title: message });
        return;
      }
      if (body.duplicate_pending) {
        toast.push({ tone: 'info', title: t('duplicate_pending') });
      }
      if (body.redirect_url) {
        window.location.assign(body.redirect_url);
      }
    } catch {
      toast.push({ tone: 'error', title: t('network_error') });
    } finally {
      setLoading(null);
    }
  }

  if (initializing) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
        {t('loading')}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-sm">
        <p>{loadError}</p>
      </div>
    );
  }

  if (sessionMissing) {
    return (
      <div className="rounded-2xl border border-amber-300/40 bg-amber-50/60 p-6 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-950/40 dark:text-amber-100">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden />
          <div>
            <h3 className="font-semibold">{t('session_missing_title')}</h3>
            <p className="mt-1 text-amber-800/90 dark:text-amber-100/85">
              {t('session_missing_body')}
            </p>
            <Button asChild className="mt-4" variant="default" size="sm">
              <a href="/login">{t('session_missing_cta')}</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t('heading')}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t('subheading')}</p>
        </div>
        {currentTier && (
          <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('current_tier', { tier: currentTier })}
          </span>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiers.map((tier) => {
          const Icon = pickIcon(tier.iconKey);
          const isCurrent = tier.rank === currentRank;
          const isDowngrade = tier.rank < currentRank;
          const isLoading = loading === tier.slug;
          const isPopular = tier.slug === popularTier && !isCurrent && !isDowngrade;
          const features = pickLocaleList(locale, tier.features).slice(0, 5);
          return (
            <article
              key={tier.slug}
              className={cn(
                'relative flex flex-col rounded-2xl border bg-card p-5 transition-colors',
                isPopular ? 'border-primary/50 shadow-md ring-1 ring-primary/15' : 'border-border',
              )}
            >
              {isPopular && (
                <span className="absolute -top-3 left-5 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                  {t('badge_popular')}
                </span>
              )}
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary" aria-hidden />
                <h3 className="text-base font-semibold uppercase tracking-wider">
                  {pickLocaleString(locale, tier.name)}
                </h3>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {pickLocaleString(locale, tier.subtitle)}
              </p>
              <p className="mt-4 text-2xl font-semibold tabular-nums">{tier.priceLabel}</p>

              {features.length > 0 && (
                <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                  {features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <BadgeCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" aria-hidden />
                      <span className="leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
              )}

              <Button
                className="mt-5"
                disabled={isCurrent || isDowngrade || isLoading}
                onClick={() => handleUpgrade(tier)}
                variant={isPopular ? 'default' : 'secondary'}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    {t('cta_loading')}
                  </>
                ) : isCurrent ? (
                  t('cta_current')
                ) : isDowngrade ? (
                  t('cta_downgrade_locked')
                ) : (
                  <>
                    {t('cta_upgrade')}
                    <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
                  </>
                )}
              </Button>
            </article>
          );
        })}
      </div>

      <footer className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        <p>{t('payment_disclaimer')}</p>
      </footer>
    </div>
  );
}

function resolveErrorMessage(
  code: string | undefined,
  fallback: string | undefined,
  tErr: ReturnType<typeof useTranslations>,
): string | null {
  if (!code) return fallback ?? null;
  const namespaces = ['forex_billing', 'forex_auth', 'kill_switch'];
  for (const ns of namespaces) {
    try {
      const text = tErr(`${ns}.${code}`);
      if (text && text !== `${ns}.${code}`) return text;
    } catch {
      // try next namespace
    }
  }
  return fallback ?? null;
}
