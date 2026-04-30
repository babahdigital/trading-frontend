'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { EquityCurve } from '@/components/charts/equity-curve';
import { AnimatedSection } from '@/components/ui/animated-section';
import { EditorialShowcase, type ShowcaseSlide } from '@/components/landing/editorial-showcase';
import {
  ArrowRight, ArrowUpRight, Shield, Zap, Brain, ChevronDown, Check,
  TrendingUp, Bitcoin, Sparkles,
} from 'lucide-react';

// ─── Types ───
interface LandingClientProps {
  sections: Record<string, { title: string; subtitle: string | null; content: Record<string, unknown> }>;
  pricingTiers: Array<{ id: string; slug: string; name: string; price: string; subtitle: string | null; features: unknown; excluded: unknown; note: string | null; ctaLabel: string; ctaLink: string }>;
  testimonials: Array<{ id: string; name: string; role: string | null; content: string; rating: number; avatarUrl: string | null }>;
  faqs: Array<{ id: string; question: string; answer: string; category: string }>;
}

// ─── Risk Framework Layers ───
// Risk framework — institutional 4-pillar architecture (Wave-29T+U).
// Names + descriptions kept English (technical / institutional terminology).
// Citation lineage: RiskMetrics 1996 · AQR · Bridgewater · Jane Street ·
// Renaissance · Cornix · Lopez de Prado · FTMO/MyForexFunds.
const RISK_LAYERS = {
  preTrade: [
    { num: 1, name: 'EWMA volatility', desc: 'RiskMetrics 1996 λ=0.94 daily decay — surfaces regime shifts faster than SMA' },
    { num: 2, name: 'Vol-target scalar', desc: 'AQR scalar = target_vol / realized_vol, clamped [0.25× – 2.00×]' },
    { num: 3, name: 'Fractional Kelly', desc: 'Thorp f* capped 0.05 with sample-trust ramp (53→100 trades)' },
    { num: 4, name: 'Correlation guard', desc: 'Pearson timestamp-merge ala Jane Street — reject >0.7 stacked exposure' },
    { num: 5, name: 'Spread + news blackout', desc: 'Reject entries on wide spread or 15min around high-impact events' },
  ],
  inTrade: [
    { num: 6, name: 'Static SL + Cornix TP ladder', desc: '40/35/25 split at 1R/2R/3R, JSONB-persistent state' },
    { num: 7, name: 'Trailing stop (vol-regime)', desc: 'Monotonic tighter-only, ATR multiplier scaled to volatility regime' },
    { num: 8, name: 'Structural invalidation', desc: 'Force-close on BoS flip or Wyckoff TR re-entry — thesis broken' },
    { num: 9, name: 'AI advisor (Layer 6)', desc: 'Claude Opus rule-backed with 4 explicit veto rules — never overrides SL' },
  ],
  postSystem: [
    { num: 10, name: 'Multi-stage kill-switch', desc: 'NORMAL → fast 1h cooling → PROBATION 4h (risk halved) → NORMAL' },
    { num: 11, name: 'Probation validator', desc: '3 winners → graduated, any loss → escalated to LOSS_STREAK 12h hard' },
    { num: 12, name: 'SHA-256 audit chain', desc: 'Append-only PostgreSQL hash chain with verify_chain() < 5ms tamper detection' },
  ],
};

// ─── Pricing Tier Keys (i18n-driven) ───
// Each tier holds *only* the static metadata (id slug for translation lookup,
// price, period key, cta href, popular flag, feature count). Localized strings
// (name, tagline, period label, cta label, feature[]) are resolved at render
// time via t('tier_<id>_*'). Exact mirror keys must exist in id.json + en.json.
type TierMeta = {
  /** translation key prefix, e.g. "demo_meta" → tier_demo_meta_name etc */
  id: string;
  /** static, non-localized tier badge — stays as-is across locales */
  tier: string;
  price: string;
  /** key into common period table — period_beta | period_permanent | … */
  periodKey: string;
  /** number of feature bullets (resolved as tier_<id>_f1..fN) */
  featureCount: number;
  href: string;
  popular?: boolean;
};

const PRICING_TIERS: Record<string, TierMeta[]> = {
  demo: [
    { id: 'demo_meta', tier: 'DEMO MT5', price: 'tier_price_free', periodKey: 'period_beta', featureCount: 5, href: '/demo?product=robot-meta', popular: true },
    { id: 'demo_crypto', tier: 'DEMO CRYPTO', price: 'tier_price_free', periodKey: 'period_beta', featureCount: 5, href: '/demo?product=robot-crypto' },
    { id: 'demo_indicator', tier: 'INDICATOR', price: 'tier_price_free', periodKey: 'period_permanent', featureCount: 5, href: '/demo?product=indicator' },
  ],
  forex: [
    { id: 'forex_swing', tier: 'TIER 1', price: '$19', periodKey: 'period_monthly', featureCount: 5, href: '/register/signal?tier=swing' },
    { id: 'forex_scalping', tier: 'TIER 2', price: '$79', periodKey: 'period_monthly', featureCount: 5, href: '/register/signal?tier=scalping', popular: true },
    { id: 'forex_allin', tier: 'TIER 3', price: '$299', periodKey: 'period_monthly', featureCount: 5, href: '/register/signal?tier=all' },
  ],
  crypto: [
    { id: 'crypto_basic', tier: 'CRYPTO', price: '$49', periodKey: 'period_monthly_perf_20', featureCount: 5, href: '/register/crypto?tier=basic' },
    { id: 'crypto_pro', tier: 'CRYPTO PRO', price: '$199', periodKey: 'period_monthly_perf_15', featureCount: 5, href: '/register/crypto?tier=pro', popular: true },
    { id: 'crypto_hnwi', tier: 'CRYPTO HNWI', price: '$499', periodKey: 'period_monthly_perf_10', featureCount: 5, href: '/contact?subject=crypto-hnwi' },
  ],
  vps: [
    { id: 'vps_license', tier: 'VPS', price: '$3,000', periodKey: 'period_one_time_setup', featureCount: 5, href: '/register/vps' },
    { id: 'vps_premium', tier: 'VPS PRO', price: '$7,500', periodKey: 'period_one_time_setup', featureCount: 5, href: '/register/vps', popular: true },
    { id: 'vps_dedicated', tier: 'DEDICATED', price: '$1,499', periodKey: 'period_monthly', featureCount: 5, href: '/contact?subject=dedicated-vps' },
  ],
  apis: [
    { id: 'api_news', tier: 'NEWS', price: 'tier_price_free', periodKey: 'period_api_to_99', featureCount: 4, href: '/pricing/apis#news' },
    { id: 'api_signals', tier: 'SIGNALS', price: 'tier_price_free', periodKey: 'period_api_to_149', featureCount: 4, href: '/pricing/apis#signals' },
    { id: 'api_indicators', tier: 'INDICATORS', price: 'tier_price_free', periodKey: 'period_api_to_199', featureCount: 4, href: '/pricing/apis#indicators', popular: true },
    { id: 'api_calendar', tier: 'CALENDAR', price: 'tier_price_free', periodKey: 'period_api_to_99', featureCount: 4, href: '/pricing/apis#calendar' },
    { id: 'api_market', tier: 'MARKET', price: '$29', periodKey: 'period_api_to_249', featureCount: 4, href: '/pricing/apis#market' },
    { id: 'api_correlation', tier: 'CORRELATION', price: '$9', periodKey: 'period_api_to_49', featureCount: 4, href: '/pricing/apis#correlation' },
    { id: 'api_broker', tier: 'BROKER', price: 'tier_price_free', periodKey: 'period_api_to_49', featureCount: 3, href: '/pricing/apis#broker' },
    { id: 'api_ai', tier: 'AI', price: '$99', periodKey: 'period_api_ai_nda', featureCount: 4, href: '/contact?subject=ai-explainability' },
  ],
  institutional: [
    { id: 'inst_api', tier: 'API', price: 'tier_price_custom', periodKey: 'period_usage_based', featureCount: 5, href: '/register/institutional', popular: true },
    { id: 'inst_b2b', tier: 'B2B', price: '$99', periodKey: 'period_b2b_to_999', featureCount: 5, href: '/contact?subject=backtest-service' },
  ],
};

// Tab order rewires the product hierarchy per Pak Abdullah feedback
// (2026-04-27): Robot Forex (MT5 bridge) and Robot Crypto (Binance API) are
// the two main retail products — same idea, different exchange. VPS License
// is the on-prem deployment tier. Public APIs are for developer integration
// only (NOT execution-as-product).
const PRICING_TAB_IDS = ['demo', 'forex', 'crypto', 'vps', 'apis', 'institutional'] as const;

// FAQ — 8 entries; localized via faq_q1..q8 + faq_a1..a8.
const FAQ_COUNT = 8;

interface PerfKpi {
  totalReturn: string;
  sharpeRatio: string;
  sortinoRatio: string;
  profitFactor: string;
  winRate: string;
  maxDrawdown: string;
  avgHoldTime: string;
  recoveryFactor: string;
}

const EMPTY_KPI: PerfKpi = {
  totalReturn: '—',
  sharpeRatio: '—',
  sortinoRatio: '—',
  profitFactor: '—',
  winRate: '—',
  maxDrawdown: '—',
  avgHoldTime: '—',
  recoveryFactor: '—',
};

export function LandingClient({ sections, testimonials, faqs }: LandingClientProps) {
  const t = useTranslations('landing');
  const [equityData, setEquityData] = useState<{ time: string; value: number }[]>([]);
  const [equityPeriod, setEquityPeriod] = useState('90D');
  const [pricingTab, setPricingTab] = useState('forex');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [kpi, setKpi] = useState<PerfKpi>(EMPTY_KPI);
  const [perfSource, setPerfSource] = useState<string>('');

  useEffect(() => {
    let active = true;
    fetch('/api/public/performance')
      .then((r) => r.ok ? r.json() : null)
      .then((body: { equity?: { time: string; value: number }[]; kpi?: PerfKpi; source?: string } | null) => {
        if (!active) return;
        if (body?.equity) setEquityData(body.equity);
        if (body?.kpi) setKpi(body.kpi);
        if (body?.source) setPerfSource(body.source);
      })
      .catch(() => { /* leave empty — UI handles no-data state */ });
    return () => { active = false; };
  }, []);

  const filteredEquity = (() => {
    const days = equityPeriod === '30D' ? 30 : equityPeriod === '7D' ? 7 : 90;
    return equityData.slice(-days);
  })();

  const hero = sections['hero'];
  const perf = sections['performance'];
  const betaSection = sections['beta-program'];
  const productsSection = sections['products-showcase'];
  const showcase = sections['editorial-showcase'];
  const showcaseSlides: ShowcaseSlide[] = (() => {
    const raw = (showcase?.content as { slides?: unknown })?.slides;
    if (!Array.isArray(raw)) return [];
    return raw.filter((s): s is ShowcaseSlide => {
      if (!s || typeof s !== 'object') return false;
      const o = s as Record<string, unknown>;
      return (
        typeof o.eyebrow === 'string' &&
        typeof o.title === 'string' &&
        typeof o.description === 'string' &&
        typeof o.metric === 'string' &&
        typeof o.metricLabel === 'string'
      );
    });
  })();

  // Resolve a tier price token. Free / Custom go through translation; raw
  // dollar prices ("$19") render as-is.
  const resolvePrice = (price: string): string =>
    price.startsWith('tier_price_') ? t(price) : price;

  // FAQ — CMS overrides default i18n. When CMS rows exist we use their q/a
  // verbatim (CMS owns the translation in that case). Default uses faq_q1..q8.
  const displayFaqs: { q: string; a: string }[] = faqs?.length > 0
    ? faqs.map(f => ({ q: f.question, a: f.answer }))
    : Array.from({ length: FAQ_COUNT }, (_, i) => ({
        q: t(`faq_q${i + 1}`),
        a: t(`faq_a${i + 1}`),
      }));

  const displayTestimonials = testimonials?.length > 0 ? testimonials : [];

  // FAQPage JSON-LD untuk Google rich snippet
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: displayFaqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  const activeTiers = PRICING_TIERS[pricingTab] || [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <EnterpriseNav />

      {/* ═══════════════════════════════════════════
          SECTION 1 — HERO
          ═══════════════════════════════════════════ */}
      <section className="relative min-h-[calc(100vh-4rem)] flex items-center overflow-hidden page-stamp-editorial">
        {/* Subtle grid background — clipped by section overflow-hidden */}
        <div className="absolute inset-0 page-stamp-grid opacity-[0.07] dark:opacity-[0.04] pointer-events-none" />

        <div className="container-default w-full px-4 sm:px-6 py-16 sm:py-20 lg:py-24 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left column — Copy (7/12) */}
            <div className="lg:col-span-7">
              <AnimatedSection>
                <div className="t-eyebrow mb-5">
                  {t('hero_eyebrow')}
                </div>
              </AnimatedSection>

              <AnimatedSection delay={0.1}>
                <h1 className="t-display-hero text-foreground mb-7">
                  {hero?.title || (<>{t('hero_title_fallback_l1')}<br />{t('hero_title_fallback_l2')}</>)}
                </h1>
              </AnimatedSection>

              <AnimatedSection delay={0.2}>
                <p className="t-lead text-muted-foreground max-w-xl mb-9">
                  {hero?.subtitle || t('hero_subtitle_fallback')}
                </p>
              </AnimatedSection>

              <AnimatedSection delay={0.3}>
                <div className="flex flex-wrap gap-3 mb-10">
                  <Link href="/contact" className="btn-primary">
                    {t('hero_cta_primary')}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link href="/demo" className="btn-secondary">
                    {t('hero_cta_secondary')}
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              </AnimatedSection>

              {/* Tech trust strip — minimal, institutional */}
              <AnimatedSection delay={0.4}>
                <div className="flex items-center gap-4 text-xs text-muted-foreground/70 pt-6 border-t border-border/40 max-w-md">
                  <span className="font-mono uppercase tracking-wider text-[10px]">{t('hero_built_on')}</span>
                  <span className="font-mono">MT5</span>
                  <span aria-hidden className="w-px h-3 bg-border" />
                  <span className="font-mono">ZeroMQ</span>
                  <span aria-hidden className="w-px h-3 bg-border" />
                  <span className="font-mono">Postgres</span>
                  <span aria-hidden className="w-px h-3 bg-border" />
                  <span className="font-mono">Cloudflare</span>
                </div>
              </AnimatedSection>
            </div>

            {/* Right column — Equity card (live data) atau Founding-Members
                invitation card (refined replacement for capability quadrant
                — more institutional + inviting, less visually noisy) */}
            <div className="lg:col-span-5">
              <AnimatedSection delay={0.35}>
                {filteredEquity.length > 0 ? (
                  <div className="card-enterprise">
                    <div className="flex items-center justify-between mb-4">
                      <div className="t-eyebrow">{t('hero_equity_eyebrow')}</div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider text-data-positive bg-data-positive/10 ring-1 ring-data-positive/20">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-data-positive opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-data-positive" />
                        </span>
                        {t('hero_equity_live')}
                      </span>
                    </div>
                    <EquityCurve
                      data={filteredEquity.slice(-30)}
                      height={210}
                      periods={[]}
                      activePeriod="30D"
                    />
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                      <div>
                        <div className="text-xs text-muted-foreground">{t('hero_equity_verified')}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-lg font-medium text-amber-400">{kpi.sharpeRatio}</div>
                        <div className="text-xs text-muted-foreground">{t('hero_equity_sharpe_label')}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border bg-card p-7 sm:p-8 relative overflow-hidden">
                    {/* Subtle amber radial accent */}
                    <div className="absolute -top-1/3 -right-1/4 w-[300px] h-[300px] rounded-full bg-amber-500/[0.06] blur-3xl pointer-events-none" />

                    <div className="relative">
                      <div className="flex items-center justify-between mb-5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider text-amber-300 bg-amber-500/10 ring-1 ring-amber-500/30">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400" />
                          </span>
                          {t('founding_pill')}
                        </span>
                      </div>

                      <h2 className="font-display text-2xl md:text-3xl leading-tight text-foreground mb-2">
                        {t('founding_card_title_l1')}<br /> {t('founding_card_title_l2')}
                      </h2>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                        {t('founding_card_body')}
                      </p>

                      {/* Inline mini stats — tight, institutional */}
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-6 pb-6 border-b border-border/50">
                        <CapabilityInline value="6" label={t('capability_strategy')} />
                        <CapabilityInline value="12" label={t('capability_risk')} />
                        <CapabilityInline value="14+" label={t('capability_assets')} />
                        <CapabilityInline value="0" label={t('capability_custody')} valueClass="text-emerald-400" />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href="/contact?subject=beta-founding-member"
                          className="btn-primary text-sm flex-1 justify-center"
                        >
                          {t('founding_apply')}
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                          href="/demo"
                          className="btn-tertiary text-sm justify-center px-4"
                        >
                          {t('founding_demo')}
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </AnimatedSection>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 1.5 — BETA PROGRAM (CMS-managed via slug=beta-program)
          ═══════════════════════════════════════════ */}
      {betaSection && (
      <section className="border-t border-border/60 bg-amber-500/[0.03]">
        <div className="container-default px-4 sm:px-6 py-12 sm:py-16">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7">
              <AnimatedSection>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="t-eyebrow text-amber-400">{t('beta_eyebrow')}</span>
                </div>
                <h2 className="t-display-section text-foreground mb-4">
                  {betaSection.title}
                </h2>
                <p className="t-lead text-muted-foreground max-w-2xl mb-6">
                  {betaSection.subtitle ?? t('beta_section_subtitle_fallback')}
                </p>
                <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-2 mb-8 max-w-2xl">
                  <li className="flex items-start gap-2 t-body-sm text-foreground/80">
                    <Check className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    {t('beta_bullet_full_access')}
                  </li>
                  <li className="flex items-start gap-2 t-body-sm text-foreground/80">
                    <Check className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    {t('beta_bullet_demo')}
                  </li>
                  <li className="flex items-start gap-2 t-body-sm text-foreground/80">
                    <Check className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    {t('beta_bullet_telegram')}
                  </li>
                  <li className="flex items-start gap-2 t-body-sm text-foreground/80">
                    <Check className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    {t('beta_bullet_lockin')}
                  </li>
                  <li className="flex items-start gap-2 t-body-sm text-foreground/80">
                    <Check className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    {t('beta_bullet_eng')}
                  </li>
                  <li className="flex items-start gap-2 t-body-sm text-foreground/80">
                    <Check className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    {t('beta_bullet_upgrade')}
                  </li>
                </ul>
              </AnimatedSection>
            </div>
            <div className="lg:col-span-5">
              <AnimatedSection delay={0.15}>
                <div className="rounded-xl border border-amber-500/30 bg-card p-6 md:p-8">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="font-mono text-3xl font-semibold text-amber-400">
                      {(betaSection.content as Record<string, unknown>)?.priceLabel as string ?? t('beta_price_label')}
                    </span>
                    <span className="t-body-sm text-muted-foreground">
                      {(betaSection.content as Record<string, unknown>)?.priceSubtext as string ?? t('beta_price_subtext')}
                    </span>
                  </div>
                  <p className="t-body-sm text-muted-foreground mb-6">
                    {t('beta_card_body')}
                  </p>
                  <Link
                    href={(betaSection.content as Record<string, unknown>)?.ctaHref as string ?? '/contact?subject=beta-founding-member'}
                    className="btn-primary w-full justify-center"
                  >
                    {(betaSection.content as Record<string, unknown>)?.ctaLabel as string ?? t('beta_apply_label')}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/demo"
                    className="btn-tertiary w-full justify-center mt-3 text-sm"
                  >
                    {t('beta_demo_secondary')}
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                  <p className="text-[11px] text-muted-foreground/80 italic mt-4 text-center">
                    {t('beta_slot_note')}
                  </p>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ═══════════════════════════════════════════
          SECTION 1.6 — EDITORIAL SHOWCASE (CMS-managed via slug=editorial-showcase)
          Auto-advancing 5-slide highlight of system pillars.
          ═══════════════════════════════════════════ */}
      {showcase && showcaseSlides.length > 0 && (
        <EditorialShowcase
          eyebrow={t('showcase_eyebrow')}
          title={showcase.title}
          subtitle={showcase.subtitle ?? undefined}
          slides={showcaseSlides}
        />
      )}

      {/* ═══════════════════════════════════════════
          SECTION 1.7 — PRODUCT SHOWCASE (CMS-managed via slug=products-showcase)
          ═══════════════════════════════════════════ */}
      {productsSection && (
      <section className="section-padding border-t border-border/60">
        <div className="container-default px-4 sm:px-6">
          <AnimatedSection>
            <div className="t-eyebrow mb-4">{t('products_eyebrow')}</div>
            <h2 className="t-display-section text-foreground mb-4">
              {productsSection.title}
            </h2>
            <p className="t-lead text-muted-foreground max-w-2xl mb-12">
              {productsSection.subtitle ?? t('products_subtitle_fallback')}
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-6">
            <ProductCard
              icon={<TrendingUp className="w-6 h-6" />}
              eyebrow={t('product_meta_eyebrow')}
              title={t('product_meta_title')}
              tagline={t('product_meta_tagline')}
              bullets={[
                t('product_meta_b1'),
                t('product_meta_b2'),
                t('product_meta_b3'),
                t('product_meta_b4'),
              ]}
              href="/solutions/signal"
              ctaLabel={t('product_meta_cta')}
            />
            <ProductCard
              icon={<Bitcoin className="w-6 h-6" />}
              eyebrow={t('product_crypto_eyebrow')}
              title={t('product_crypto_title')}
              tagline={t('product_crypto_tagline')}
              bullets={[
                t('product_crypto_b1'),
                t('product_crypto_b2'),
                t('product_crypto_b3'),
                t('product_crypto_b4'),
              ]}
              href="/solutions/crypto"
              ctaLabel={t('product_crypto_cta')}
            />
          </div>
        </div>
      </section>
      )}

      {/* ═══════════════════════════════════════════
          SECTION 2 — TRACK RECORD (honest empty state during beta)
          ═══════════════════════════════════════════ */}
      <section className="section-padding border-t border-border/60">
        <div className="container-default px-4 sm:px-6">
          <AnimatedSection>
            <div className="t-eyebrow mb-4">{t('track_record_eyebrow')}</div>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10">
              <div>
                <h2 className="t-display-section text-foreground mb-2">
                  {perfSource === 'empty' || filteredEquity.length === 0
                    ? t('track_record_beta_title')
                    : (perf?.title || t('track_record_live_title'))}
                </h2>
                <p className="t-body-sm text-muted-foreground">
                  {perfSource === 'empty' || filteredEquity.length === 0
                    ? t('track_record_beta_subtitle')
                    : t('track_record_live_subtitle')}
                </p>
              </div>
              {filteredEquity.length > 0 && (
                <Link
                  href="/performance"
                  className="btn-tertiary mt-4 md:mt-0"
                >
                  {t('track_record_full_details')}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </AnimatedSection>

          {filteredEquity.length > 0 ? (
            <>
              <AnimatedSection delay={0.1}>
                <div className="card-enterprise p-6 md:p-8">
                  <EquityCurve
                    data={filteredEquity}
                    height={420}
                    periods={['7D', '30D', '90D']}
                    activePeriod={equityPeriod}
                    onPeriodChange={setEquityPeriod}
                  />
                </div>
              </AnimatedSection>

              {/* KPI Grid — live dari /api/public/performance */}
              <AnimatedSection delay={0.2}>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
                  <div className="kpi-card">
                    <div className="t-eyebrow mb-3">{t('kpi_total_return')}</div>
                    <div className="t-data-kpi text-amber-400">{kpi.totalReturn}</div>
                    <div className="t-body-sm text-muted-foreground mt-2">{t('kpi_total_return_sub')}</div>
                  </div>
                  <div className="kpi-card">
                    <div className="t-eyebrow mb-3">{t('kpi_max_dd')}</div>
                    <div className="t-data-kpi text-data-negative">{kpi.maxDrawdown}</div>
                    <div className="t-body-sm text-muted-foreground mt-2">{t('kpi_max_dd_sub')}</div>
                  </div>
                  <div className="kpi-card">
                    <div className="t-eyebrow mb-3">{t('kpi_sharpe')}</div>
                    <div className="t-data-kpi text-amber-400">{kpi.sharpeRatio}</div>
                    <div className="t-body-sm text-muted-foreground mt-2">{t('kpi_sharpe_sub')}</div>
                  </div>
                  <div className="kpi-card">
                    <div className="t-eyebrow mb-3">{t('kpi_pf')}</div>
                    <div className="t-data-kpi text-amber-400">{kpi.profitFactor}</div>
                    <div className="t-body-sm text-muted-foreground mt-2">{t('kpi_pf_sub')}</div>
                  </div>
                  <div className="kpi-card">
                    <div className="t-eyebrow mb-3">{t('kpi_win')}</div>
                    <div className="t-data-kpi text-foreground">{kpi.winRate}</div>
                    <div className="t-body-sm text-muted-foreground mt-2">{t('kpi_win_sub')}</div>
                  </div>
                </div>
              </AnimatedSection>

              <div className="mt-6 text-xs text-muted-foreground italic">
                {t('track_record_disclaimer')}
              </div>
            </>
          ) : (
            // Honest empty state — no fake numbers, no fake chart, just transparent timeline
            <AnimatedSection delay={0.1}>
              <div className="rounded-xl border border-border/80 bg-card p-8 md:p-12">
                <div className="grid md:grid-cols-3 gap-8">
                  <div>
                    <div className="t-eyebrow text-amber-400 mb-3">{t('tr_phase_now_label')}</div>
                    <div className="font-display text-2xl text-foreground mb-2">{t('tr_phase_now_title')}</div>
                    <p className="t-body-sm text-muted-foreground">
                      {t('tr_phase_now_body')}
                    </p>
                  </div>
                  <div className="md:border-l md:border-border/60 md:pl-8">
                    <div className="t-eyebrow text-amber-400 mb-3">{t('tr_phase_next_label')}</div>
                    <div className="font-display text-2xl text-foreground mb-2">{t('tr_phase_next_title')}</div>
                    <p className="t-body-sm text-muted-foreground">
                      {t('tr_phase_next_body')}
                    </p>
                  </div>
                  <div className="md:border-l md:border-border/60 md:pl-8">
                    <div className="t-eyebrow text-amber-400 mb-3">{t('tr_audit_label')}</div>
                    <div className="font-display text-2xl text-foreground mb-2">{t('tr_audit_title')}</div>
                    <p className="t-body-sm text-muted-foreground">
                      {t('tr_audit_body')}
                    </p>
                  </div>
                </div>
                <div className="border-t border-border/60 mt-8 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <p className="t-body-sm text-muted-foreground">
                    {t('tr_demo_invite')}
                  </p>
                  <Link href="/demo" className="btn-tertiary shrink-0">
                    {t('tr_demo_cta')}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
              <p className="mt-4 text-xs text-muted-foreground italic">
                {t('tr_empty_disclaimer')}
              </p>
            </AnimatedSection>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 3 — THREE PILLARS
          ═══════════════════════════════════════════ */}
      <section className="section-padding border-t border-border/60">
        <div className="container-default px-4 sm:px-6">
          <AnimatedSection>
            <div className="t-eyebrow mb-4">{t('pillars_eyebrow')}</div>
            <h2 className="t-display-section text-foreground mb-4">{t('pillars_title')}</h2>
            <p className="t-lead text-muted-foreground max-w-2xl mb-16">
              {t('pillars_subtitle')}
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-6">
            <PillarCard
              icon={<Brain className="w-6 h-6" />}
              eyebrow={t('pillar_intel_eyebrow')}
              title={t('pillar_intel_title')}
              description={t('pillar_intel_desc')}
              href="/platform/technology"
              linkLabel={t('pillar_intel_link')}
            />
            <PillarCard
              icon={<Zap className="w-6 h-6" />}
              eyebrow={t('pillar_exec_eyebrow')}
              title={t('pillar_exec_title')}
              description={t('pillar_exec_desc')}
              href="/platform/execution"
              linkLabel={t('pillar_exec_link')}
            />
            <PillarCard
              icon={<Shield className="w-6 h-6" />}
              eyebrow={t('pillar_risk_eyebrow')}
              title={t('pillar_risk_title')}
              description={t('pillar_risk_desc')}
              href="/platform/risk-framework"
              linkLabel={t('pillar_risk_link')}
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 4 — RISK FRAMEWORK
          ═══════════════════════════════════════════ */}
      <section className="section-padding border-t border-border/60">
        <div className="container-default px-4 sm:px-6">
          <AnimatedSection>
            <div className="t-eyebrow mb-4">{t('risk_eyebrow')}</div>
            <h2 className="t-display-section text-foreground mb-2">{t('risk_title')}</h2>
            <p className="t-lead text-muted-foreground max-w-2xl mb-16">
              {t('risk_subtitle')}
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8">
            <RiskPhase title={t('risk_phase_pre')} layers={RISK_LAYERS.preTrade} />
            <RiskPhase title={t('risk_phase_in')} layers={RISK_LAYERS.inTrade} />
            <RiskPhase title={t('risk_phase_post')} layers={RISK_LAYERS.postSystem} />
          </div>

          <AnimatedSection delay={0.3}>
            <div className="mt-12 text-center">
              <Link href="/platform/risk-framework" className="btn-tertiary">
                {t('risk_full_link')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 5 — PRICING (Split layout)
          ═══════════════════════════════════════════ */}
      <section className="section-padding border-t border-border/60">
        <div className="container-default px-4 sm:px-6">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
            {/* Left column — heading, description, tabs */}
            <div className="lg:col-span-4 lg:sticky lg:top-28 lg:self-start">
              <AnimatedSection>
                <div className="t-eyebrow mb-4">{t('pricing_eyebrow')}</div>
                <h2 className="t-display-section text-foreground mb-4">{t('pricing_title')}</h2>
                <p className="t-body text-muted-foreground mb-8">
                  {t('pricing_subtitle')}
                </p>
              </AnimatedSection>

              {/* Tab bar — vertical on desktop */}
              <AnimatedSection delay={0.1}>
                <div className="flex lg:flex-col gap-2 mb-8 lg:mb-10">
                  {PRICING_TAB_IDS.map(id => (
                    <button
                      key={id}
                      type="button"
                      className={`text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        pricingTab === id
                          ? 'bg-amber-500 text-black'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                      onClick={() => setPricingTab(id)}
                    >
                      {t(`pricing_tab_${id}`)}
                    </button>
                  ))}
                </div>

                <Link href="/pricing" className="btn-tertiary text-sm hidden lg:inline-flex">
                  {t('pricing_compare')} <ArrowRight className="w-4 h-4" />
                </Link>
              </AnimatedSection>
            </div>

            {/* Right column — pricing cards */}
            <div className="lg:col-span-8">
              <div className="space-y-6">
                {activeTiers.map((plan, i) => {
                  const features = Array.from({ length: plan.featureCount }, (_, fi) =>
                    t(`tier_${plan.id}_f${fi + 1}`)
                  );
                  return (
                  <AnimatedSection key={plan.id} delay={0.15 + i * 0.1}>
                    <div className={`rounded-xl p-6 sm:p-8 transition-all duration-300 border ${
                      plan.popular
                        ? 'border-amber-500 ring-1 ring-amber-500'
                        : 'border-border/60 hover:border-amber-500/30'
                    }`}>
                      {/* Card header — horizontal layout */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-medium text-foreground">{t(`tier_${plan.id}_name`)}</h3>
                            {plan.popular && (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-black text-[11px] font-medium tracking-wider uppercase">
                                {t('pricing_popular_badge')}
                              </span>
                            )}
                          </div>
                          <p className="t-body-sm text-muted-foreground">{t(`tier_${plan.id}_tagline`)}</p>
                        </div>
                        <div className="flex items-baseline gap-1 sm:text-right shrink-0">
                          <span className="font-mono text-3xl font-semibold text-foreground">{resolvePrice(plan.price)}</span>
                          <span className="t-body-sm text-muted-foreground">{t(plan.periodKey)}</span>
                        </div>
                      </div>

                      {/* Features + CTA — single column on mobile so feature
                          text never wraps mid-bullet (Pak Abdullah report
                          "text banyak yang kewarp"). 2-col on sm+, full-row
                          on lg+ next to the CTA button. */}
                      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 flex-1 min-w-0">
                          {features.map(f => (
                            <li key={f} className="flex gap-2 t-body-sm min-w-0">
                              <Check className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                              <span className="text-foreground/85 break-words">{f}</span>
                            </li>
                          ))}
                        </ul>
                        <Link
                          href={plan.href}
                          className={`shrink-0 text-center w-full lg:w-auto ${plan.popular ? 'btn-primary' : 'btn-secondary'} justify-center`}
                        >
                          {t(`tier_${plan.id}_cta`)}
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </AnimatedSection>
                  );
                })}
              </div>

              {/* VPS Enterprise CTA — only on legacy "retail" tab (kept for
                  backwards compat; current tab list omits it). */}
              {pricingTab === 'retail' && (
                <AnimatedSection delay={0.3}>
                  <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="font-medium text-foreground mb-1">{t('pricing_vps_upsell_title')}</div>
                      <div className="t-body-sm text-muted-foreground">{t('pricing_vps_upsell_body')}</div>
                    </div>
                    <Link href="/solutions/license" className="btn-tertiary shrink-0">
                      {t('pricing_vps_upsell_cta')}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </AnimatedSection>
              )}

              {/* Mobile: compare all plans link */}
              <div className="mt-6 lg:hidden">
                <Link href="/pricing" className="btn-tertiary text-sm">
                  {t('pricing_compare')} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 6 — TRUST SIGNALS
          When real testimonials available → show them.
          Otherwise → show stack/partner trust strip + founding member CTA
          (no dummy quotes per institutional discipline).
          ═══════════════════════════════════════════ */}
      {displayTestimonials.length > 0 ? (
        <section className="section-padding border-t border-border/60">
          <div className="container-default px-4 sm:px-6">
            <AnimatedSection>
              <div className="t-eyebrow mb-4">{t('testimonials_eyebrow')}</div>
              <h2 className="t-display-section text-foreground mb-16">{t('testimonials_title')}</h2>
            </AnimatedSection>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayTestimonials.slice(0, 3).map((tm, i) => (
                <AnimatedSection key={tm.id} delay={0.1 + i * 0.1}>
                  <div className="card-enterprise p-8 h-full flex flex-col">
                    <blockquote className="t-lead text-foreground/90 italic flex-1 mb-6">
                      &ldquo;{tm.content}&rdquo;
                    </blockquote>
                    <div className="border-t border-border/60 pt-4">
                      <div className="font-medium text-foreground">{tm.name}</div>
                      {tm.role && <div className="t-body-sm text-muted-foreground">{tm.role}</div>}
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="section-padding border-t border-border/60">
          <div className="container-default px-4 sm:px-6">
            <AnimatedSection>
              <div className="t-eyebrow mb-4">{t('trust_eyebrow')}</div>
              <h2 className="t-display-section text-foreground mb-4">
                {t('trust_title')}
              </h2>
              <p className="t-lead text-muted-foreground max-w-2xl mb-12">
                {t('trust_subtitle')}
              </p>
            </AnimatedSection>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <TrustCard
                eyebrow={t('trust_card_exec_eyebrow')}
                title={t('trust_card_exec_title')}
                description={t('trust_card_exec_desc')}
              />
              <TrustCard
                eyebrow={t('trust_card_broker_eyebrow')}
                title={t('trust_card_broker_title')}
                description={t('trust_card_broker_desc')}
              />
              <TrustCard
                eyebrow={t('trust_card_crypto_eyebrow')}
                title={t('trust_card_crypto_title')}
                description={t('trust_card_crypto_desc')}
              />
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="t-eyebrow text-amber-400 mb-2">{t('trust_invite_eyebrow')}</p>
                <p className="t-body text-foreground">
                  {t('trust_invite_body')}
                </p>
              </div>
              <Link href="/contact?subject=beta-founding-member" className="btn-primary shrink-0">
                {t('beta_apply_label')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          SECTION 7 — FAQ
          ═══════════════════════════════════════════ */}
      <section className="section-padding border-t border-border/60">
        <div className="container-default px-4 sm:px-6">
          {/* Header row — heading left, CTA right */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-12">
            <AnimatedSection>
              <div className="t-eyebrow mb-4">{t('faq_eyebrow')}</div>
              <h2 className="t-display-section text-foreground mb-2">{t('faq_title')}</h2>
              <p className="t-body text-muted-foreground">
                {t('faq_subtitle')}
              </p>
            </AnimatedSection>
            <AnimatedSection delay={0.1}>
              <Link href="/contact" className="btn-tertiary shrink-0">
                {t('faq_briefing')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </AnimatedSection>
          </div>

          {/* FAQ grid — 2 columns on desktop */}
          <div className="grid lg:grid-cols-2 gap-x-12">
            {displayFaqs.map((faq, i) => (
              <AnimatedSection key={i} delay={0.05 * i}>
                <div className="py-5 border-b border-border/60">
                  <button
                    type="button"
                    className="w-full flex items-start justify-between gap-4 text-left"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    aria-expanded={openFaq === i}
                  >
                    <span className="font-display text-base md:text-lg font-medium text-foreground">
                      {faq.q}
                    </span>
                    <span className="shrink-0 mt-1">
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                    </span>
                  </button>
                  {openFaq === i && (
                    <div className="mt-3 t-body-sm text-muted-foreground leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 8 — FINAL CTA
          ═══════════════════════════════════════════ */}
      <section className="relative section-padding border-t border-border/60">
        {/* Subtle amber radial glow */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full bg-amber-500/[0.04] blur-3xl" />
        </div>

        <div className="container-prose px-4 sm:px-6 text-center relative z-10">
          <AnimatedSection>
            <div className="t-eyebrow mb-6">{t('cta_eyebrow')}</div>
            <h2 className="t-display-section text-foreground mb-6">
              {t('cta_title')}
            </h2>
            <p className="t-lead text-muted-foreground mb-12">
              {t('cta_subtitle')}
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.15}>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <Link href="/contact" className="btn-primary">
                {t('hero_cta_primary')}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/performance" className="btn-secondary">
                {t('hero_view_track_record')}
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
            <p className="t-body-sm text-muted-foreground">
              {t('cta_no_pressure')}
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════ */}
      <EnterpriseFooter />
    </div>
  );
}

// ─── Sub-components ───

function CapabilityInline({ value, label, valueClass }: {
  value: string;
  label: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className={`font-mono text-xl font-medium tabular-nums ${valueClass ?? 'text-foreground'}`}>
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function ProductCard({ icon, eyebrow, title, tagline, bullets, href, ctaLabel }: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  tagline: string;
  bullets: string[];
  href: string;
  ctaLabel: string;
}) {
  return (
    <AnimatedSection delay={0.1}>
      <Link
        href={href}
        className="group block rounded-xl border border-border/80 hover:border-amber-500/40 bg-card p-6 sm:p-8 h-full transition-colors"
      >
        <div className="flex items-start justify-between mb-6">
          <div className="icon-container">{icon}</div>
          <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>
        <div className="t-eyebrow text-amber-400 mb-2">{eyebrow}</div>
        <h3 className="t-display-sub text-foreground mb-2">{title}</h3>
        <p className="t-body-sm text-muted-foreground mb-6">{tagline}</p>
        <ul className="space-y-2 mb-6">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 t-body-sm text-foreground/80">
              <Check className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <span className="inline-flex items-center gap-2 t-body-sm font-medium text-amber-400">
          {ctaLabel}
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </span>
      </Link>
    </AnimatedSection>
  );
}

function TrustCard({ eyebrow, title, description }: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <AnimatedSection delay={0.1}>
      <div className="rounded-xl border border-border/80 bg-card p-6 sm:p-7 h-full">
        <div className="t-eyebrow text-amber-400 mb-3">{eyebrow}</div>
        <h3 className="font-display text-xl text-foreground mb-3">{title}</h3>
        <p className="t-body-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </AnimatedSection>
  );
}

function PillarCard({ icon, eyebrow, title, description, href, linkLabel }: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <AnimatedSection delay={0.1}>
      <div className="group card-enterprise p-8 h-full flex flex-col">
        <div className="icon-container mb-8">{icon}</div>
        <div className="t-eyebrow mb-3">{eyebrow}</div>
        <h3 className="t-display-sub text-foreground mb-4">{title}</h3>
        <p className="t-body text-muted-foreground flex-1 mb-6">{description}</p>
        <Link href={href} className="btn-tertiary">
          {linkLabel}
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </AnimatedSection>
  );
}

function RiskPhase({ title, layers }: { title: string; layers: typeof RISK_LAYERS.preTrade }) {
  return (
    <AnimatedSection delay={0.1}>
      <div className="card-enterprise p-6 h-full">
        <div className="t-eyebrow text-amber-400 mb-6">{title}</div>
        <div className="space-y-4">
          {layers.map(l => (
            <div key={l.num} className="group/layer">
              <div className="flex items-start gap-3">
                <span className="font-mono text-xs text-muted-foreground mt-0.5 w-5 shrink-0">
                  {String(l.num).padStart(2, '0')}
                </span>
                <div>
                  <div className="text-sm font-medium text-foreground group-hover/layer:text-amber-400 transition-colors">
                    {l.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{l.desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}
