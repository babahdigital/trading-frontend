import { getPageMetadata } from '@/lib/seo';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
// localizePricingTier dropped 2026-05-16 — CMS tiers section removed.
import { breadcrumbSchema, ldJson, organizationSchema } from '@/lib/seo-jsonld';
import { CapabilityLadder } from '@/components/pricing/capability-ladder';
import { TierComparisonMatrix } from '@/components/pricing/tier-comparison-matrix';
import { TrustStrip } from '@/components/shared/trust-strip';
import { StickyCtaBar } from '@/components/shared/sticky-cta-bar';
import { FaqAccordion, type FaqItem } from '@/components/shared/faq-accordion';
import { StatsBar } from '@/components/shared/stats-bar';
import { CryptoTierGate } from '@/components/register/crypto-tier-gate';
import { prisma } from '@/lib/db/prisma';
import { formatPrice, type Locale, type PriceKey } from '@/lib/pricing-format';
import {
  ArrowRight,
  Check,
  TrendingUp,
  Bitcoin,
  Server,
} from 'lucide-react';

// Tier type dropped 2026-05-16 — CMS tiers section removed.

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('pricing');
  const isEn = locale === 'en';
  return getPageMetadata(
    '/pricing',
    {
      title: `${t('title')} — BabahAlgo`,
      description: isEn
        ? 'Robot Meta MT5 $19-$299/mo, Robot Crypto Binance $49-$499/mo, VPS License 3-tier (License Only $320 / Hybrid $750 / Full Turnkey $1,600 setup), 8 Developer API marketplace, and Institutional engagement. Zero-custody — capital always stays in your broker / Binance account.'
        : 'Robot Meta MT5 Rp 299rb-Rp 4,9jt/bulan, Robot Crypto Binance Rp 799rb-Rp 8,2jt/bulan, VPS License 3-tier (License Only Rp 5jt / Hybrid Rp 12jt / Full Turnkey Rp 25jt setup), 8 Developer API marketplace, dan engagement Institusional. Zero-custody — modal selalu di akun broker / Binance Anda.',
    },
    locale === 'en' ? 'en' : 'id',
  );
}

// Tier metadata — slug, name, popular flag, cta href stay hardcoded.
// Prices are PriceKey references resolved locale-aware via formatPrice() di
// render function. Names + features + periods resolved from i18n.
const SIGNAL_TIER_META: Array<{ slug: 't1' | 't2' | 't3'; name: string; priceKey: PriceKey; cta: string; popular?: boolean }> = [
  { slug: 't1', name: 'Tier 1 · Swing', priceKey: 'signal_starter', cta: '/register?service=signal&tier=swing' },
  { slug: 't2', name: 'Tier 2 · Scalping', priceKey: 'signal_pro', popular: true, cta: '/register?service=signal&tier=scalping' },
  { slug: 't3', name: 'Tier 3 · All-In', priceKey: 'signal_vip', cta: '/register?service=signal&tier=all' },
];

// Crypto tier meta — rc29 (2026-05-21): 5-tier dengan equity bracket +
// slot + leverage + risk per tier. Onboarding wizard auto-recommend tier
// berdasarkan deposit (<$500 → free_demo, <$1.5K → starter, etc.).
interface CryptoTierSpec {
  slug: 'demo' | 'starter' | 'active' | 'pro' | 'hnwi';
  name: { id: string; en: string };
  priceKey: PriceKey;
  modalMin: { id: string; en: string };
  slot: number;
  leverage: string;
  riskPerTrade: string;
  notionalCap: string;
  cta: string;
  popular?: boolean;
  /** Features array — bilingual, max 5 untuk fit card */
  features: { id: string[]; en: string[] };
}

const CRYPTO_TIERS: CryptoTierSpec[] = [
  {
    slug: 'demo',
    name: { id: 'Demo Free', en: 'Demo Free' },
    priceKey: 'crypto_demo',
    modalMin: { id: 'Demo $5.000', en: 'Demo $5,000' },
    slot: 1,
    leverage: '2x',
    riskPerTrade: '0.5%',
    notionalCap: '30%',
    cta: '/register?service=crypto&tier=demo',
    features: {
      id: [
        'Trial 30 hari dengan demo wallet $5.000 USDT',
        '1 posisi simultan, leverage maks 2x',
        'Strategi spot DCA Trend (paling konservatif)',
        'Telegram alert sinyal real-time',
        'Tanpa kartu kredit — auto-stop hari ke-30',
      ],
      en: [
        '30-day trial with $5,000 USDT demo wallet',
        '1 concurrent slot, max 2x leverage',
        'Spot DCA Trend strategy (most conservative)',
        'Real-time Telegram signal alerts',
        'No credit card — auto-stop on day 30',
      ],
    },
  },
  {
    slug: 'starter',
    name: { id: 'Starter', en: 'Starter' },
    priceKey: 'crypto_starter',
    modalMin: { id: 'Modal ≥ $500', en: 'Min ≥ $500' },
    slot: 2,
    leverage: '3x',
    riskPerTrade: '1.0%',
    notionalCap: '40%',
    cta: '/register?service=crypto&tier=starter',
    features: {
      id: [
        '2 posisi simultan · leverage 3x maks',
        'Strategi: Spot DCA Trend',
        'Risk per trade 1.0% · notional cap 40%',
        'Kill-switch otomatis (loss harian)',
        'Sweet spot: modal $1.000-1.500',
      ],
      en: [
        '2 concurrent slots · max 3x leverage',
        'Strategy: Spot DCA Trend',
        '1.0% risk per trade · 40% notional cap',
        'Automatic kill-switch (daily loss)',
        'Sweet spot: $1,000-1,500 capital',
      ],
    },
  },
  {
    slug: 'active',
    name: { id: 'Active', en: 'Active' },
    priceKey: 'crypto_active',
    modalMin: { id: 'Modal ≥ $1.500', en: 'Min ≥ $1,500' },
    slot: 3,
    leverage: '7x',
    riskPerTrade: '1.25%',
    notionalCap: '55%',
    cta: '/register?service=crypto&tier=active',
    features: {
      id: [
        '3 posisi simultan · leverage 7x maks',
        'Strategi: Spot DCA + Spot Swing Trend',
        'Risk per trade 1.25% · notional cap 55%',
        'Multi-stage kill-switch',
        'Sweet spot: modal $2.500',
      ],
      en: [
        '3 concurrent slots · max 7x leverage',
        'Strategies: Spot DCA + Spot Swing Trend',
        '1.25% risk per trade · 55% notional cap',
        'Multi-stage kill-switch',
        'Sweet spot: $2,500 capital',
      ],
    },
  },
  {
    slug: 'pro',
    name: { id: 'Pro', en: 'Pro' },
    priceKey: 'crypto_pro',
    modalMin: { id: 'Modal ≥ $5.000', en: 'Min ≥ $5,000' },
    slot: 5,
    leverage: '12x',
    riskPerTrade: '1.5%',
    notionalCap: '60%',
    cta: '/register?service=crypto&tier=pro',
    popular: true,
    features: {
      id: [
        '5 posisi simultan · leverage 12x maks',
        'Semua strategi: Smart Money + Spot DCA + Spot Swing',
        'Risk per trade 1.5% · notional cap 60%',
        'Full reconciliation engine + audit trail',
        'Sweet spot: modal $10.000 (fee 0.5%/profit)',
      ],
      en: [
        '5 concurrent slots · max 12x leverage',
        'All strategies: Smart Money + Spot DCA + Spot Swing',
        '1.5% risk per trade · 60% notional cap',
        'Full reconciliation engine + audit trail',
        'Sweet spot: $10,000 capital (0.5%/profit fee)',
      ],
    },
  },
  {
    slug: 'hnwi',
    name: { id: 'HNWI', en: 'HNWI' },
    priceKey: 'crypto_hnwi',
    modalMin: { id: 'Modal ≥ $25.000', en: 'Min ≥ $25,000' },
    slot: 7,
    leverage: '20x',
    riskPerTrade: '2.0%',
    notionalCap: '75%',
    cta: '/contact?subject=crypto-hnwi',
    features: {
      id: [
        '7 posisi simultan · leverage 20x maks',
        'Semua strategi + custom override leverage/risk',
        'Risk per trade 2.0% · notional cap 75%',
        'Dedicated account manager + priority support',
        'Sweet spot: modal $50.000 (fee 0.4%/profit)',
      ],
      en: [
        '7 concurrent slots · max 20x leverage',
        'All strategies + custom leverage/risk override',
        '2.0% risk per trade · 75% notional cap',
        'Dedicated account manager + priority support',
        'Sweet spot: $50,000 capital (0.4%/profit fee)',
      ],
    },
  },
];

// 2026-05-18 — realigned to canonical 3-tier (License Only / Hybrid / Turnkey).
// Previous legacy mapping skipped the Hybrid tier entirely (used `vps_standard` /
// `vps_premium` aliases that point to License Only + Turnkey prices), causing
// the middle "popular" card on /pricing to show $1,600 setup while solutions/license
// shows Hybrid at $750. Aligned with `solutions/license/page.tsx` 3-tier.
const VPS_TIER_META: Array<{ slug: 't1' | 't2' | 't3'; name: string; priceKey: PriceKey; periodKey: 'vps_period_setup_150' | 'vps_period_setup_300' | 'vps_period_dedicated'; cta: string; popular?: boolean }> = [
  { slug: 't1', name: 'License Only', priceKey: 'vps_license_only_setup', periodKey: 'vps_period_setup_150', cta: '/register?service=vps' },
  { slug: 't2', name: 'Hybrid', priceKey: 'vps_hybrid_setup', periodKey: 'vps_period_setup_300', popular: true, cta: '/register?service=vps' },
  { slug: 't3', name: 'Full Turnkey', priceKey: 'vps_turnkey_setup', periodKey: 'vps_period_dedicated', cta: '/contact?subject=dedicated-vps' },
];

// Developer API marketplace di-defer ke pengembangan berikutnya (decision
// 2026-05-16). Section + PUBLIC_APIS array + render logic dihapus dari
// /pricing. i18n keys preserved di id.json + en.json supaya re-aktivasi
// cepat saat ready. Tab "apis" juga di-hide di homepage pricing tabs.

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('pricing');
  const tp = await getTranslations('pricing_page');
  const tr = await getTranslations('register');
  const localeKey: Locale = locale === 'en' ? 'en' : 'id';
  const localeNav: 'id' | 'en' = locale === 'en' ? 'en' : 'id';

  // Fetch top FAQs untuk surface decision-point — same source dengan /register.
  let faqs: FaqItem[] = [];
  try {
    const rows = await prisma.faq.findMany({
      where: { isVisible: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      take: 6,
      select: { id: true, question: true, question_en: true, answer: true, answer_en: true },
    });
    faqs = rows;
  } catch {
    // gracefully degrade — FAQ section akan auto-hide kalau items empty
  }
  // apiCustomLabel dihapus 2026-05-16 — Developer API marketplace di-defer.

  const signalTiers = SIGNAL_TIER_META.map((m) => ({
    name: m.name,
    price: formatPrice(m.priceKey, localeKey, { compact: false }),
    period: tp('signal_period_monthly'),
    features: tp.raw(`signal_${m.slug}_features`) as string[],
    cta: m.cta,
    popular: m.popular,
  }));
  // Crypto tiers — rc29 5-tier total. UI split:
  //   - Demo (free) → banner separate di atas product section (tidak masuk grid utama)
  //   - 4 paid tier (starter/active/pro/hnwi) → grid 4-col utama supaya
  //     visual breathing + setiap card cukup lebar untuk feature list.
  const cryptoDemoTier = CRYPTO_TIERS.find((t) => t.slug === 'demo')!;
  const cryptoPaidTiers = CRYPTO_TIERS.filter((t) => t.slug !== 'demo').map((t) => ({
    name: t.name[localeKey],
    price: formatPrice(t.priceKey, localeKey, { compact: false }),
    period: localeKey === 'id' ? '/bulan' : '/mo',
    features: t.features[localeKey],
    cta: t.cta,
    popular: t.popular,
    sub: `${t.modalMin[localeKey]} · ${t.slot} slot · ${t.leverage}`,
  }));
  const vpsTiers = VPS_TIER_META.map((m) => ({
    name: m.name,
    price: formatPrice(m.priceKey, localeKey, { compact: false }),
    period: tp(m.periodKey),
    features: tp.raw(`vps_${m.slug}_features`) as string[],
    cta: m.cta,
    popular: m.popular,
  }));

  // CMS tiers fetch dihapus 2026-05-16 — single source of truth dari
  // PRICE_TABLE (lib/pricing-format.ts). PricingTier DB tetap exist untuk
  // admin CMS workflow tapi tidak render di public /pricing.

  const breadcrumb = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Pricing', url: '/pricing' },
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(organizationSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(breadcrumb) }} />
      <EnterpriseNav />

      <main id="main-content">
        {/* Hero — pricing uses page-stamp-grid (subtle dotted grid) for the
            "matrix / spreadsheet" feel that fits a multi-tier comparison page */}
        <section className="section-padding border-b border-border/60 page-stamp-grid">
          <div className="layout-container text-center relative">
            <p className="t-eyebrow mb-4">{tp('hero_eyebrow')}</p>
            <h1 className="t-display-page mb-4">{t('title')}</h1>
            <p className="t-lead text-muted-foreground max-w-xl sm:max-w-2xl mx-auto">{t('subtitle')}</p>
            <p className="text-xs text-[hsl(var(--primary))] font-mono uppercase tracking-wider mt-6">
              {tp('hero_disclaimer')}
            </p>
            <div className="mt-10">
              <TrustStrip />
            </div>
          </div>
        </section>

        {/* Live KPI dari master tenant — REAL performance, auto-hide kalau empty */}
        <section className="border-b border-border/60">
          <div className="layout-container py-8 sm:py-10">
            <StatsBar />
          </div>
        </section>

        {/* Tier comparison matrix — full 5-tier side-by-side (free/micro/starter/pro/vip)
            sebelum tier card list. Single-screen comparison untuk visitor yang mau
            cepat lihat fitur antar tier tanpa scroll panjang. */}
        <section className="border-b border-border/60">
          <div className="layout-container py-12 sm:py-16">
            <TierComparisonMatrix locale={locale === 'en' ? 'en' : 'id'} />
          </div>
        </section>

        {/* Robot Meta — MT5 auto-execution */}
        <ProductSection
          eyebrow={tp('signal_eyebrow')}
          icon={TrendingUp}
          title={tp('signal_title')}
          subtitle={tp('signal_subtitle')}
          tiers={signalTiers}
          popularLabel={tp('popular_badge')}
          selectLabel={(name) => tp('select_tier', { name })}
        />

        {/* Capability ladder — sourced from /v1/capabilities backend */}
        <CapabilityLadder />

        {/* Robot Crypto — Binance auto-trading (rc29).
            UI: 4 paid tier grid utama + Demo banner separate di atas. */}
        <section className="section-padding border-b border-border/60">
          <div className="layout-container">
            <div className="flex items-center gap-2.5 mb-3">
              <Bitcoin className="h-4 w-4 text-amber-400" />
              <p className="t-eyebrow !mb-0">{tp('crypto_eyebrow')}</p>
            </div>
            <h2 className="t-display-section mb-3 max-w-xl sm:max-w-2xl">{tp('crypto_title')}</h2>
            <p className="t-body text-foreground/60 max-w-xl sm:max-w-2xl mb-8">{tp('crypto_subtitle')}</p>

            {/* Demo Banner — entry point sebelum lihat paid tiers */}
            <CryptoDemoBanner
              tier={cryptoDemoTier}
              locale={localeKey}
            />

            {/* Tier Recommendation Widget — kalkulator interaktif rc29 logic.
                User input deposit USDT → tampil tier yang paling efisien
                (fee % profit minimal). Embed di /pricing supaya decision-
                making informed sebelum lihat 4 card paid tier. */}
            <div className="mb-10">
              <CryptoTierGate locale={localeKey} />
            </div>

            {/* 4 Paid tier card grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {cryptoPaidTiers.map((tier) => (
                <div
                  key={tier.name}
                  className={`card-enterprise flex flex-col relative ${tier.popular ? 'border-amber-500/50 ring-2 ring-amber-500/20' : ''}`}
                >
                  {tier.popular && (
                    <span className="absolute -top-3 left-6 inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500 text-amber-50 text-[10px] font-bold uppercase tracking-wider">
                      {tp('popular_badge')}
                    </span>
                  )}
                  <h3 className="text-xl font-semibold mb-1">{tier.name}</h3>
                  <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider mb-2">{tier.sub}</p>
                  <div className="flex items-baseline flex-wrap gap-x-1.5 gap-y-0.5 mb-1 min-w-0">
                    <span className="text-3xl sm:text-4xl font-bold break-words">{tier.price}</span>
                    <span className="text-sm text-foreground/50">{tier.period}</span>
                  </div>
                  <div className="h-px bg-border/40 my-5" />
                  <ul className="space-y-2.5 flex-1 mb-6">
                    {tier.features.map((f, i) => <FeatureItem key={i}>{f}</FeatureItem>)}
                  </ul>
                  <Link
                    href={tier.cta}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                      tier.popular
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'border border-border hover:bg-accent hover:border-amber-500/40'
                    }`}
                  >
                    {tp('select_tier', { name: tier.name })} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* VPS License */}
        <ProductSection
          eyebrow={tp('vps_eyebrow')}
          icon={Server}
          title={tp('vps_title')}
          subtitle={tp('vps_subtitle')}
          tiers={vpsTiers}
          popularLabel={tp('popular_badge')}
          selectLabel={(name) => tp('select_tier', { name })}
        />

        {/* Developer API Marketplace section dihapus 2026-05-16 — per user
            decision di-defer ke pengembangan berikutnya. PUBLIC_APIS array +
            ApiTierMeta type + render logic semua dihapus. i18n keys
            (apis_*_name/desc/spec) tetap di id.json + en.json sebagai
            preserved untuk re-aktivasi cepat saat ready. */}

        {/* Institutional / B2B */}
        <section className="section-padding border-b border-border/60">
          <div className="layout-container">
            <p className="t-eyebrow mb-3">{tp('inst_eyebrow')}</p>
            <h2 className="t-display-section mb-3 max-w-xl sm:max-w-2xl">{tp('inst_title')}</h2>
            <p className="t-body text-foreground/60 max-w-xl sm:max-w-2xl mb-8 sm:mb-12">
              {tp('inst_subtitle_part1')} <strong>{tp('inst_subtitle_strong')}</strong> {tp('inst_subtitle_part2')}
            </p>
            <div className="grid md:grid-cols-2 gap-5 sm:gap-6 max-w-4xl">
              <div className="card-enterprise">
                <h3 className="text-xl font-semibold mb-2">{tp('inst_api_title')}</h3>
                <p className="font-display text-3xl font-medium mb-1">{tp('inst_api_price')}</p>
                <p className="text-xs text-amber-400 font-mono uppercase tracking-wider mb-6">{tp('inst_api_period')}</p>
                <ul className="space-y-2.5 mb-6">
                  {(tp.raw('inst_api_features') as string[]).map((f, i) => (
                    <FeatureItem key={i}>{f}</FeatureItem>
                  ))}
                </ul>
                <Link href="/register?service=institutional" className="btn-secondary w-full justify-center">
                  {tp('inst_api_cta')} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="card-enterprise">
                <h3 className="text-xl font-semibold mb-2">{tp('inst_backtest_title')}</h3>
                <p className="font-display text-3xl font-medium mb-1">{tp('inst_backtest_price')}</p>
                <p className="text-xs text-amber-400 font-mono uppercase tracking-wider mb-6">{tp('inst_backtest_period')}</p>
                <ul className="space-y-2.5 mb-6">
                  {(tp.raw('inst_backtest_features') as string[]).map((f, i) => (
                    <FeatureItem key={i}>{f}</FeatureItem>
                  ))}
                </ul>
                <Link href="/contact?subject=backtest-service" className="btn-secondary w-full justify-center">
                  {tp('inst_backtest_cta')} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CMS tiers section dihapus 2026-05-16 — duplikat dengan sections
            utama yang sudah pakai PRICE_TABLE locale-aware. Admin tetap bisa
            view/edit PricingTier di /admin/cms/pricing tapi tidak render
            di public supaya single source of truth. */}

        {/* Free Demo CTA */}
        <section className="section-padding">
          <div className="layout-container text-center max-w-3xl mx-auto">
            <h2 className="t-display-section mb-4">{tp('demo_title')}</h2>
            <p className="t-body text-foreground/60 mb-8">
              {tp('demo_body')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/demo" className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
                {tp('demo_cta_primary')} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/contact" className="btn-secondary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
                {tp('demo_cta_secondary')}
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ — shared component, real prisma.Faq data */}
        <section className="section-padding border-t border-border/60">
          <div className="layout-container">
            <FaqAccordion
              items={faqs}
              locale={localeNav}
              eyebrow={tr('faq_eyebrow')}
              heading={tr('faq_heading')}
              subtitle={tr('faq_subtitle')}
              moreLink={{ label: tr('faq_more_link'), href: '/faq' }}
            />
          </div>
        </section>

        <StickyDemoCtaWrapper />
      </main>

      <EnterpriseFooter />
    </div>
  );
}

async function StickyDemoCtaWrapper() {
  const t = await getTranslations('shared');
  return (
    <StickyCtaBar
      message={t('sticky_demo_text')}
      ctaLabel={t('sticky_demo_cta')}
      href="/register?service=free"
    />
  );
}

interface PricingTier {
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  popular?: boolean;
  /** Optional sub-text under name (e.g. "Modal ≥ $500 · 2 slot · 3x") */
  sub?: string;
}

function ProductSection({
  eyebrow,
  icon: Icon,
  title,
  subtitle,
  tiers,
  popularLabel,
  selectLabel,
  gridCols = 3,
}: {
  eyebrow: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  tiers: PricingTier[];
  popularLabel: string;
  selectLabel: (name: string) => string;
  /** Card grid columns at lg breakpoint (default 3, 5 for crypto rc29). */
  gridCols?: 3 | 5;
}) {
  // Grid responsive: 1 col mobile, 2 col sm, 3 col md, fullCols at lg+.
  const gridClass = gridCols === 5
    ? 'grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5'
    : 'grid md:grid-cols-3 gap-5 sm:gap-6';
  return (
    <section className="section-padding border-b border-border/60">
      <div className="layout-container">
        <div className="flex items-center gap-2.5 mb-3">
          <Icon className="h-4 w-4 text-amber-400" />
          <p className="t-eyebrow !mb-0">{eyebrow}</p>
        </div>
        <h2 className="t-display-section mb-3 max-w-xl sm:max-w-2xl">{title}</h2>
        <p className="t-body text-foreground/60 max-w-xl sm:max-w-2xl mb-8 sm:mb-12">{subtitle}</p>
        <div className={gridClass}>
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`card-enterprise flex flex-col relative ${tier.popular ? 'border-amber-500/50 ring-2 ring-amber-500/20' : ''}`}
            >
              {tier.popular && (
                <span className="absolute -top-3 left-6 inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500 text-amber-50 text-[10px] font-bold uppercase tracking-wider">
                  {popularLabel}
                </span>
              )}
              <h3 className="text-xl font-semibold mb-1">{tier.name}</h3>
              {tier.sub ? (
                <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider mb-2">{tier.sub}</p>
              ) : null}
              <div className="flex items-baseline flex-wrap gap-x-1.5 gap-y-0.5 mb-1 min-w-0">
                <span className={`font-bold break-words ${gridCols === 5 ? 'text-2xl sm:text-3xl' : 'text-2xl sm:text-3xl lg:text-4xl'}`}>{tier.price}</span>
                <span className="text-xs sm:text-sm text-foreground/50">{tier.period}</span>
              </div>
              <div className="h-px bg-border/40 my-5" />
              <ul className="space-y-2.5 flex-1 mb-6">
                {tier.features.map((f, i) => <FeatureItem key={i}>{f}</FeatureItem>)}
              </ul>
              <Link
                href={tier.cta}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                  tier.popular
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'border border-border hover:bg-accent hover:border-amber-500/40'
                }`}
              >
                {selectLabel(tier.name)} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-foreground/70">
      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
      <span>{children}</span>
    </li>
  );
}

/**
 * Demo tier banner — strip horizontal "Try Demo Free 30 days" yang surface
 * crypto demo tier sebagai entry point sebelum 4 paid tier grid.
 * Banner mengurangi visual noise di main grid (4 card vs 5 card) sambil
 * tetap make demo prominent untuk acquisition funnel.
 */
function CryptoDemoBanner({
  tier,
  locale,
}: {
  tier: CryptoTierSpec;
  locale: Locale;
}) {
  const isEn = locale === 'en';
  const title = isEn ? 'Try Robot Crypto FREE for 30 days' : 'Coba Robot Crypto GRATIS 30 hari';
  const subtitle = isEn
    ? 'Demo wallet $5,000 USDT · 1 concurrent slot · 2x leverage · Spot DCA Trend · No credit card.'
    : 'Demo wallet $5.000 USDT · 1 posisi simultan · leverage 2x · Spot DCA Trend · Tanpa kartu kredit.';
  const ctaLabel = isEn ? 'Start Free Trial' : 'Mulai Trial Gratis';

  return (
    <div className="mb-8 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500 text-amber-50 text-[10px] font-bold uppercase tracking-wider">
              {tier.name[locale]}
            </span>
            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono uppercase tracking-wider">
              {locale === 'id' ? 'Tanpa Biaya · Tanpa Komitmen' : 'Zero Cost · No Commitment'}
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-semibold mb-1">{title}</h3>
          <p className="text-sm text-foreground/70 leading-relaxed">{subtitle}</p>
        </div>
        <Link
          href={tier.cta}
          className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium shrink-0"
        >
          {ctaLabel} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
