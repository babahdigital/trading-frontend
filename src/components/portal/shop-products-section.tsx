'use client';

/**
 * Portal "Belanja Produk" section — surface available products (Signal/Crypto/VPS)
 * directly di portal dashboard supaya user login bisa subscribe new product tanpa
 * keluar ke /pricing dulu.
 *
 * Pak Abdullah directive 2026-05-21: "produk juga ada di halaman portal user".
 *
 * Data source: /api/cms/pricing/tiers (PricingTier DB) — single source of truth
 * dengan /pricing public page.
 *
 * UX rules:
 *  - Active subscription user di-mark dengan "Active" badge + disabled CTA
 *  - Tier dengan ctaLink ke /contact (HNWI/Dedicated) → open contact page
 *  - Other tier → /checkout?tier=X&provider=xendit langsung
 *  - Collapsed-by-default per category. User click header → expand grid.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ShoppingBag, ChevronDown, Check, ArrowRight, TrendingUp, Bitcoin, Server } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PricingTierRow {
  id: string;
  slug: string;
  category: string;
  name: string;
  name_en: string | null;
  priceIdr: number | null;
  priceUsd: number | null;
  subtitle: string | null;
  subtitle_en: string | null;
  features: unknown;
  features_en: unknown;
  ctaLabel: string | null;
  ctaLabel_en: string | null;
  ctaLink: string | null;
  popular: boolean;
}

interface ActiveSubscription {
  tier: string;
  category: 'SIGNAL' | 'CRYPTO' | 'VPS' | 'DEMO' | 'INSTITUTIONAL';
}

const CATEGORY_META = {
  SIGNAL: { icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  CRYPTO: { icon: Bitcoin, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  VPS:    { icon: Server,   color: 'text-sky-500',    bg: 'bg-sky-500/10' },
} as const;

type CategoryKey = keyof typeof CATEGORY_META;

function formatLocalePrice(idr: number | null, usd: number | null, locale: string): string {
  if (idr == null && usd == null) return '—';
  if (locale === 'en' && usd != null) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(usd);
  }
  if (idr != null) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(idr);
  }
  return usd != null ? `$${usd}` : '—';
}

function pickName(row: PricingTierRow, locale: string): string {
  return locale === 'en' && row.name_en ? row.name_en : row.name;
}

function pickSubtitle(row: PricingTierRow, locale: string): string | null {
  return locale === 'en' ? (row.subtitle_en ?? row.subtitle) : row.subtitle;
}

function pickFeatures(row: PricingTierRow, locale: string): string[] {
  const arr = locale === 'en' ? row.features_en : row.features;
  if (!Array.isArray(arr)) return [];
  return arr.filter((x): x is string => typeof x === 'string').slice(0, 3);
}

function pickCtaLabel(row: PricingTierRow, locale: string): string | null {
  return locale === 'en' ? (row.ctaLabel_en ?? row.ctaLabel) : row.ctaLabel;
}

// Detect kalau slug tier ini = user's active subscription category-equivalent.
// Mapping: SubscriptionTier (SIGNAL_STARTER/SIGNAL_PRO/...) → slug (signal-starter/signal-pro).
function isActiveTier(row: PricingTierRow, active: ActiveSubscription | null): boolean {
  if (!active) return false;
  const normalizedTier = active.tier.toLowerCase().replace(/_/g, '-');
  return row.slug === normalizedTier;
}

export function ShopProductsSection() {
  const t = useTranslations('portal.shop_products');
  const locale = useLocale();
  const [tiers, setTiers] = useState<PricingTierRow[]>([]);
  const [active, setActive] = useState<ActiveSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<CategoryKey>>(new Set());

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/cms/pricing/tiers', { cache: 'no-store' }).then(r => r.ok ? r.json() : null),
      fetch('/api/auth/me', { credentials: 'same-origin' }).then(r => r.ok ? r.json() : null),
    ]).then(([tiersResp, meResp]) => {
      if (cancelled) return;
      if (tiersResp?.tiers) setTiers(tiersResp.tiers);
      if (meResp?.activeSubscription) {
        const tierStr = meResp.activeSubscription.tier as string;
        // Infer category dari tier prefix (SIGNAL_/CRYPTO_/VPS_)
        let category: ActiveSubscription['category'] = 'SIGNAL';
        if (tierStr.startsWith('CRYPTO')) category = 'CRYPTO';
        else if (tierStr.startsWith('VPS')) category = 'VPS';
        else if (tierStr === 'DEMO') category = 'DEMO';
        else if (tierStr === 'INSTITUTIONAL') category = 'INSTITUTIONAL';
        setActive({ tier: tierStr, category });
      }
    }).catch(() => { /* fail-soft */ })
    .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const grouped = useMemo(() => {
    const out: Record<CategoryKey, PricingTierRow[]> = { SIGNAL: [], CRYPTO: [], VPS: [] };
    for (const tier of tiers) {
      if (tier.category === 'SIGNAL' || tier.category === 'CRYPTO' || tier.category === 'VPS') {
        out[tier.category as CategoryKey].push(tier);
      }
    }
    return out;
  }, [tiers]);

  const toggleCategory = useCallback((cat: CategoryKey) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  // Auto-expand kategori yang user belum punya active subscription untuknya
  // (proactive nudge). Only run once on initial load — synchronize expanded
  // state with derived data fetch result (one-time hydration).
  useEffect(() => {
    if (loading || tiers.length === 0) return;
    if (!active) {
      // No active sub → expand SIGNAL (default upsell entry)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpanded(new Set<CategoryKey>(['SIGNAL']));
    }
  }, [loading, tiers.length, active]);

  if (loading || tiers.length === 0) return null;

  const visibleCategories = (['SIGNAL', 'CRYPTO', 'VPS'] as CategoryKey[]).filter(
    cat => grouped[cat].length > 0,
  );

  if (visibleCategories.length === 0) return null;

  return (
    <section
      className="rounded-xl border border-border bg-card p-4 sm:p-5"
      aria-labelledby="shop-products-heading"
    >
      <header className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 border border-primary/20 p-2">
            <ShoppingBag className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <div>
            <h2 id="shop-products-heading" className="text-sm font-semibold">
              {t('title')}
            </h2>
            <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
          </div>
        </div>
        <Link
          href="/pricing"
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        >
          {t('see_all')} →
        </Link>
      </header>

      <div className="space-y-2">
        {visibleCategories.map((cat) => {
          const meta = CATEGORY_META[cat];
          const Icon = meta.icon;
          const isOpen = expanded.has(cat);
          const items = grouped[cat];
          const hasActiveInCategory = active?.category === cat;
          return (
            <div key={cat} className="rounded-lg border border-border/60 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleCategory(cat)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn('rounded-md p-1.5', meta.bg)}>
                    <Icon className={cn('h-3.5 w-3.5', meta.color)} aria-hidden />
                  </div>
                  <span className="text-sm font-medium">{t(`category_${cat.toLowerCase()}`)}</span>
                  <span className="text-xs text-muted-foreground">({items.length})</span>
                  {hasActiveInCategory && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                      <Check className="h-3 w-3" aria-hidden />
                      {t('active_badge')}
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
                  aria-hidden
                />
              </button>
              {isOpen && (
                <div className="border-t border-border/60 bg-muted/20 p-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((tier) => {
                    const isActive = isActiveTier(tier, active);
                    const features = pickFeatures(tier, locale);
                    const subtitle = pickSubtitle(tier, locale);
                    const ctaLabel = pickCtaLabel(tier, locale) || t('cta_subscribe');
                    const ctaHref = tier.ctaLink || `/checkout?tier=${tier.slug.toUpperCase().replace(/-/g, '_')}&provider=xendit`;
                    return (
                      <article
                        key={tier.id}
                        className={cn(
                          'relative flex flex-col rounded-md border bg-card p-3',
                          tier.popular && !isActive && 'border-primary/40 ring-1 ring-primary/15',
                          isActive && 'border-emerald-500/40 bg-emerald-500/[0.03]',
                        )}
                      >
                        {tier.popular && !isActive && (
                          <span className="absolute -top-2 left-3 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold uppercase text-primary-foreground">
                            {t('badge_popular')}
                          </span>
                        )}
                        {isActive && (
                          <span className="absolute -top-2 left-3 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white">
                            {t('badge_active')}
                          </span>
                        )}
                        <h3 className="text-sm font-semibold leading-tight">{pickName(tier, locale)}</h3>
                        {subtitle && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">{subtitle}</p>
                        )}
                        <p className="mt-2 text-base font-bold tabular-nums">
                          {formatLocalePrice(tier.priceIdr, tier.priceUsd, locale)}
                          <span className="text-[10px] font-normal text-muted-foreground">
                            {' '}{cat === 'VPS' ? t('per_setup') : t('per_month')}
                          </span>
                        </p>
                        {features.length > 0 && (
                          <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                            {features.map((f, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <Check className="mt-0.5 h-2.5 w-2.5 shrink-0 text-primary" aria-hidden />
                                <span className="line-clamp-1">{f}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {isActive ? (
                          <button
                            type="button"
                            disabled
                            className="mt-3 inline-flex items-center justify-center gap-1 rounded-md bg-emerald-500/20 px-2.5 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 cursor-not-allowed"
                          >
                            <Check className="h-3 w-3" aria-hidden />
                            {t('cta_current')}
                          </button>
                        ) : (
                          <Link
                            href={ctaHref}
                            className={cn(
                              'mt-3 inline-flex items-center justify-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                              tier.popular
                                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                : 'bg-muted text-foreground hover:bg-muted/80',
                            )}
                          >
                            {ctaLabel}
                            <ArrowRight className="h-3 w-3" aria-hidden />
                          </Link>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
