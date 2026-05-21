import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { getPageMetadata } from '@/lib/seo';
import { breadcrumbSchema, faqPageSchema, ldJson, organizationSchema } from '@/lib/seo-jsonld';
import { formatPrice, type Locale, type PriceKey } from '@/lib/pricing-format';
import { TrustStrip } from '@/components/shared/trust-strip';
import { StickyCtaBar } from '@/components/shared/sticky-cta-bar';
import {
  ArrowRight,
  Bitcoin,
  ShieldCheck,
  Zap,
  Cpu,
  Activity,
  KeyRound,
  AlertOctagon,
  Check,
  TrendingUp,
} from 'lucide-react';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isEn = locale === 'en';
  return getPageMetadata(
    '/solutions/crypto',
    {
      title: isEn
        ? 'Robot Crypto — Auto-trading on Binance | BabahAlgo'
        : 'Robot Crypto — Auto-trading di Binance | BabahAlgo',
      description: isEn
        ? 'Institutional Robot Crypto for Binance Spot + USDT-M Futures. 3 core strategies (SMC Scalper, SMC Swing, Pivot Mean Reversion) executed by deterministic decision engine + adaptive math risk modules, running 24/7 under a 12-layer risk framework. Capital stays in your Binance account — no fund custody.'
        : 'Robot Crypto institusional untuk Binance Spot + USDT-M Futures. 3 strategi inti (SMC Scalper, SMC Swing, Pivot Mean Reversion) dieksekusi oleh deterministic decision engine + adaptive math risk modules, jalan 24/7 dengan framework risiko 12-layer. Modal tetap di akun Binance Anda — tidak ada custody dana.',
    },
    locale === 'en' ? 'en' : 'id',
  );
}

const FEATURE_META = [
  { icon: Cpu, titleKey: 'feat1_title', descKey: 'feat1_desc' },
  { icon: ShieldCheck, titleKey: 'feat2_title', descKey: 'feat2_desc' },
  { icon: Activity, titleKey: 'feat3_title', descKey: 'feat3_desc' },
  { icon: AlertOctagon, titleKey: 'feat4_title', descKey: 'feat4_desc' },
  { icon: Zap, titleKey: 'feat5_title', descKey: 'feat5_desc' },
  { icon: KeyRound, titleKey: 'feat6_title', descKey: 'feat6_desc' },
] as const;

interface CryptoTierMeta {
  id: 'demo' | 'starter' | 'active' | 'pro' | 'hnwi';
  name: { id: string; en: string };
  priceKey: PriceKey;
  popular?: boolean;
  modalMin: { id: string; en: string };
  slot: number;
  leverage: string;
  riskPerTrade: string;
  notionalCap: string;
  cta: { id: string; en: string };
  ctaHref: string;
  desc: { id: string; en: string };
  features: { id: string[]; en: string[] };
}

// Crypto tier matrix — canonical rc29 (2026-05-21).
// Equity bracket auto-recommend: <$500→demo, <$1.5K→starter, <$5K→active,
// <$25K→pro, ≥$25K→hnwi. Onboarding wizard FE block upgrade kalau equity
// < threshold (prevent churn dari fee disproportionate).
const CRYPTO_TIERS_META: CryptoTierMeta[] = [
  {
    id: 'demo',
    name: { id: 'Demo Free', en: 'Demo Free' },
    priceKey: 'crypto_demo',
    modalMin: { id: 'Demo wallet $5.000', en: 'Demo wallet $5,000' },
    slot: 1,
    leverage: '2x',
    riskPerTrade: '0.5%',
    notionalCap: '30%',
    cta: { id: 'Mulai Trial 30 Hari', en: 'Start 30-day Trial' },
    ctaHref: '/register?service=crypto&tier=demo',
    desc: {
      id: 'Eksplor strategi tanpa risiko modal. Demo wallet $5K USDT, 1 posisi simultan, leverage 2x maks. Tanpa kartu kredit.',
      en: 'Explore strategies risk-free. $5K USDT demo wallet, 1 concurrent slot, max 2x leverage. No credit card required.',
    },
    features: {
      id: [
        'Demo wallet $5.000 USDT mock realistis',
        '1 posisi simultan · leverage 2x maks',
        'Strategi: Spot DCA Trend (konservatif)',
        'Risk per trade 0.5% · notional cap 30%',
        'Telegram alert sinyal real-time',
        'Auto-stop hari ke-30 (no auto-charge)',
      ],
      en: [
        '$5,000 USDT realistic mock demo wallet',
        '1 concurrent slot · max 2x leverage',
        'Strategy: Spot DCA Trend (conservative)',
        '0.5% risk per trade · 30% notional cap',
        'Real-time Telegram signal alerts',
        'Auto-stop on day 30 (no auto-charge)',
      ],
    },
  },
  {
    id: 'starter',
    name: { id: 'Starter', en: 'Starter' },
    priceKey: 'crypto_starter',
    modalMin: { id: 'Modal ≥ $500', en: 'Capital ≥ $500' },
    slot: 2,
    leverage: '3x',
    riskPerTrade: '1.0%',
    notionalCap: '40%',
    cta: { id: 'Mulai Starter', en: 'Start Starter' },
    ctaHref: '/register?service=crypto&tier=starter',
    desc: {
      id: 'Entry tier untuk live trading konservatif. 2 posisi simultan, leverage 3x. Sweet spot di modal $1K-1.5K.',
      en: 'Entry tier for conservative live trading. 2 concurrent slots, 3x leverage. Sweet spot at $1K-1.5K capital.',
    },
    features: {
      id: [
        '2 posisi simultan · leverage 3x maks',
        'Strategi: Spot DCA Trend',
        'Risk per trade 1.0% · notional cap 40%',
        'Kill-switch otomatis (daily loss cap)',
        'Multi-stage cooldown',
        'Email + Telegram notification',
      ],
      en: [
        '2 concurrent slots · max 3x leverage',
        'Strategy: Spot DCA Trend',
        '1.0% risk per trade · 40% notional cap',
        'Automatic kill-switch (daily loss cap)',
        'Multi-stage cooldown',
        'Email + Telegram notifications',
      ],
    },
  },
  {
    id: 'active',
    name: { id: 'Active', en: 'Active' },
    priceKey: 'crypto_active',
    modalMin: { id: 'Modal ≥ $1.500', en: 'Capital ≥ $1,500' },
    slot: 3,
    leverage: '7x',
    riskPerTrade: '1.25%',
    notionalCap: '55%',
    cta: { id: 'Mulai Active', en: 'Start Active' },
    ctaHref: '/register?service=crypto&tier=active',
    desc: {
      id: 'Trader aktif dengan diversifikasi 2 strategi (DCA + Swing). 3 posisi simultan, leverage 7x. Sweet spot $2.5K.',
      en: 'Active trader with 2-strategy diversification (DCA + Swing). 3 concurrent slots, 7x leverage. Sweet spot $2.5K.',
    },
    features: {
      id: [
        '3 posisi simultan · leverage 7x maks',
        'Strategi: Spot DCA + Spot Swing Trend',
        'Risk per trade 1.25% · notional cap 55%',
        'Multi-stage kill-switch + cooldown',
        '6-layer exit engine',
        'Audit trail + position reconciliation',
      ],
      en: [
        '3 concurrent slots · max 7x leverage',
        'Strategies: Spot DCA + Spot Swing Trend',
        '1.25% risk per trade · 55% notional cap',
        'Multi-stage kill-switch + cooldown',
        '6-layer exit engine',
        'Audit trail + position reconciliation',
      ],
    },
  },
  {
    id: 'pro',
    name: { id: 'Pro', en: 'Pro' },
    priceKey: 'crypto_pro',
    popular: true,
    modalMin: { id: 'Modal ≥ $5.000', en: 'Capital ≥ $5,000' },
    slot: 5,
    leverage: '12x',
    riskPerTrade: '1.5%',
    notionalCap: '60%',
    cta: { id: 'Mulai Pro', en: 'Start Pro' },
    ctaHref: '/register?service=crypto&tier=pro',
    desc: {
      id: 'Trader serius dengan akses penuh ke 3 strategi (Smart Money + Spot DCA + Spot Swing). 5 posisi simultan, leverage 12x. Sweet spot $10K (fee hanya 0.5% dari profit).',
      en: 'Serious trader with full access to 3 strategies (Smart Money + Spot DCA + Spot Swing). 5 concurrent slots, 12x leverage. Sweet spot $10K (fee just 0.5% of profit).',
    },
    features: {
      id: [
        '5 posisi simultan · leverage 12x maks',
        'Semua strategi: Smart Money + Spot DCA + Spot Swing',
        'Risk per trade 1.5% · notional cap 60%',
        'Full reconciliation engine',
        'Priority signal queue (low-latency)',
        'Audit trail + custom risk profile',
      ],
      en: [
        '5 concurrent slots · max 12x leverage',
        'All strategies: Smart Money + Spot DCA + Spot Swing',
        '1.5% risk per trade · 60% notional cap',
        'Full reconciliation engine',
        'Priority signal queue (low-latency)',
        'Audit trail + custom risk profile',
      ],
    },
  },
  {
    id: 'hnwi',
    name: { id: 'HNWI', en: 'HNWI' },
    priceKey: 'crypto_hnwi',
    modalMin: { id: 'Modal ≥ $25.000', en: 'Capital ≥ $25,000' },
    slot: 7,
    leverage: '20x',
    riskPerTrade: '2.0%',
    notionalCap: '75%',
    cta: { id: 'Konsultasi HNWI', en: 'HNWI Consultation' },
    ctaHref: '/contact?subject=crypto-hnwi',
    desc: {
      id: 'High-net-worth dengan dedicated support + custom override. 7 posisi simultan, leverage 20x. Sweet spot $50K (fee hanya 0.4% dari profit).',
      en: 'High-net-worth with dedicated support + custom override. 7 concurrent slots, 20x leverage. Sweet spot $50K (fee just 0.4% of profit).',
    },
    features: {
      id: [
        '7 posisi simultan · leverage 20x maks',
        'Semua strategi + custom override leverage/risk',
        'Risk per trade 2.0% · notional cap 75%',
        'Dedicated account manager (Telegram + WhatsApp)',
        'Priority support 24/7 (target response <30 menit)',
        'Custom strategy onboarding (opsional)',
      ],
      en: [
        '7 concurrent slots · max 20x leverage',
        'All strategies + custom leverage/risk override',
        '2.0% risk per trade · 75% notional cap',
        'Dedicated account manager (Telegram + WhatsApp)',
        '24/7 priority support (target response <30 min)',
        'Custom strategy onboarding (optional)',
      ],
    },
  },
];

// Crypto strategies LIVE di backend rc29 — audit 2026-05-21 confirmed 3 active.
// Bilingual inline supaya cepat maintain seiring backend tier/strategy update.
// File reference: trading-crypto/src/strategy/{spot_dca_trend,spot_swing_trend,smart_money_confluence}.py
interface CryptoStrategySpec {
  slug: 'spot_dca' | 'spot_swing' | 'smc_confluence';
  name: { id: string; en: string };
  shortName: string; // ASCII safe
  timeframe: string;
  market: string;
  tierAccess: { id: string; en: string };
  tagline: { id: string; en: string };
  description: { id: string; en: string };
  highlights: { id: string[]; en: string[] };
}

const CRYPTO_STRATEGIES: CryptoStrategySpec[] = [
  {
    slug: 'spot_dca',
    name: { id: 'Spot DCA Trend', en: 'Spot DCA Trend' },
    shortName: 'DCA Trend',
    timeframe: '1H · 4H · 1D · 1W',
    market: 'Spot',
    tierAccess: { id: 'Semua tier', en: 'All tiers' },
    tagline: {
      id: 'Dollar-Cost Averaging dengan trend filter',
      en: 'Dollar-Cost Averaging with trend filter',
    },
    description: {
      id: 'Strategi spot-only paling konservatif. Akumulasi posisi long di bull regime saat pullback ke 20-EMA, dengan SMA-200 sebagai konfirmasi tren utama. Long-only, no shorting, no funding bleed.',
      en: 'Most conservative spot-only strategy. Accumulates long positions in bull regime on pullback to 20-EMA, with SMA-200 confirming primary trend. Long-only, no shorting, no funding bleed.',
    },
    highlights: {
      id: [
        'Long-only · bull regime confirmed',
        'Pullback entry ≤1.2× ATR dari 20-EMA',
        'RSI gate: oversold = discount opportunity (post Sprint A4)',
        'Risk-reward floor 1.5× enforced',
        'Multi-TF alignment (Sprint L3): reject kalau HTF bear',
      ],
      en: [
        'Long-only · bull regime confirmed',
        'Pullback entry ≤1.2× ATR from 20-EMA',
        'RSI gate: oversold = discount opportunity (post Sprint A4)',
        'Risk-reward floor 1.5× enforced',
        'Multi-TF alignment (Sprint L3): reject if HTF bear',
      ],
    },
  },
  {
    slug: 'spot_swing',
    name: { id: 'Spot Swing Trend', en: 'Spot Swing Trend' },
    shortName: 'Swing Trend',
    timeframe: '4H · 1D · 1W',
    market: 'Spot',
    tierAccess: { id: 'Active tier ke atas', en: 'Active tier and above' },
    tagline: {
      id: 'Swing trading multi-day dengan MACD + Awesome Oscillator',
      en: 'Multi-day swing trading with MACD + Awesome Oscillator',
    },
    description: {
      id: 'Horizon hold multi-day hingga multi-week. Bull regime longs only, SMA(20/50) value area entry dengan konfirmasi MACD cross / AO saucer. Risk-reward floor 1.8× — quality over quantity.',
      en: 'Multi-day to multi-week hold horizon. Bull regime longs only, SMA(20/50) value area entry with MACD cross / AO saucer confirmation. RR floor 1.8× — quality over quantity.',
    },
    highlights: {
      id: [
        'Hold 4H/1D/1W timeframe',
        'MACD cross + AO saucer confluence',
        'RSI regime alignment (Brown rules)',
        'Risk-reward floor 1.8× enforced',
        'Horizon scaled 2× (zero funding bleed spot)',
      ],
      en: [
        'Hold 4H/1D/1W timeframes',
        'MACD cross + AO saucer confluence',
        'RSI regime alignment (Brown rules)',
        'Risk-reward floor 1.8× enforced',
        'Horizon scaled 2× (zero funding bleed spot)',
      ],
    },
  },
  {
    slug: 'smc_confluence',
    name: { id: 'Smart Money Confluence', en: 'Smart Money Confluence' },
    shortName: 'Smart Money',
    timeframe: '15M · 30M · 1H · 4H · 1D',
    market: 'Spot + Futures',
    tierAccess: { id: 'Pro tier ke atas', en: 'Pro tier and above' },
    tagline: {
      id: 'Flagship institutional — 8-component scoring',
      en: 'Flagship institutional — 8-component scoring',
    },
    description: {
      id: 'Strategi flagship bi-directional (long bull, short bear). Confluence scoring 8 komponen: Regime Alignment, SMC Structure (OB+FVG), Liquidity Sweep, Premium/Discount Zone, CVD Divergence, VWAP, Funding Bias, OI Confluence. Confidence floor 0.50, RR floor 1.8×.',
      en: 'Flagship bi-directional strategy (bull longs, bear shorts). 8-component confluence scoring: Regime Alignment, SMC Structure (OB+FVG), Liquidity Sweep, Premium/Discount Zone, CVD Divergence, VWAP, Funding Bias, OI Confluence. Confidence floor 0.50, RR floor 1.8×.',
    },
    highlights: {
      id: [
        'Bi-directional · spot + futures',
        '8 komponen confluence scoring (regime, OB/FVG, liquidity, P/D, CVD, VWAP, funding, OI)',
        'Hard min stop 0.8% spot / 1.5% futures',
        'Confidence floor 0.50 (sesi rc29)',
        'Range regime skip — anti-whipsaw guard',
      ],
      en: [
        'Bi-directional · spot + futures',
        '8-component confluence scoring (regime, OB/FVG, liquidity, P/D, CVD, VWAP, funding, OI)',
        'Hard min stop 0.8% spot / 1.5% futures',
        'Confidence floor 0.50 (rc29)',
        'Range regime skip — anti-whipsaw guard',
      ],
    },
  },
];

const STEP_META = [
  { step: '01', titleKey: 'step1_title', descKey: 'step1_desc' },
  { step: '02', titleKey: 'step2_title', descKey: 'step2_desc' },
  { step: '03', titleKey: 'step3_title', descKey: 'step3_desc' },
  { step: '04', titleKey: 'step4_title', descKey: 'step4_desc' },
] as const;

const FAQ_KEYS = [
  { qKey: 'faq_q1', aKey: 'faq_a1' },
  { qKey: 'faq_q2', aKey: 'faq_a2' },
  { qKey: 'faq_q3', aKey: 'faq_a3' },
  { qKey: 'faq_q4', aKey: 'faq_a4' },
  { qKey: 'faq_q5', aKey: 'faq_a5' },
  { qKey: 'faq_q6', aKey: 'faq_a6' },
] as const;

export default async function CryptoBotSolutionPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations('solutions_crypto');
  const { locale } = await params;
  const localeKey: Locale = locale === 'en' ? 'en' : 'id';
  const FAQ_ITEMS = FAQ_KEYS.map((k) => ({ q: t(k.qKey), a: t(k.aKey) }));
  const breadcrumb = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Solutions', url: '/solutions/signal' },
    { name: 'Robot Crypto', url: '/solutions/crypto' },
  ]);
  const faq = faqPageSchema(FAQ_ITEMS.map((f) => ({ question: f.q, answer: f.a })));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(organizationSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(faq) }} />
      <EnterpriseNav />
      <main id="main-content">
        {/* Hero — pakai layout-container default 1280px + `.hero-section-header`
            global utility untuk konsistensi cross-page. `<br/>` hardcoded
            di title dihapus (fragile di responsive); biarkan natural reflow. */}
        <section className="section-padding border-b border-border/60">
          <div className="layout-container">
            <div className="hero-section-header">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-mono uppercase tracking-wider text-amber-700 dark:text-amber-300 mb-6">
                <Bitcoin className="w-3.5 h-3.5" />
                {t('hero_pill')}
              </div>
              <h1 className="t-display-page mb-5">
                {t('hero_title_l1')} {t('hero_title_l2')}
              </h1>
              <p className="t-lead text-foreground/70 mb-8">
                {t('hero_subtitle')}
              </p>
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
                <Link href="/register?service=crypto" className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
                  {t('hero_cta_register')} <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/demo?product=robot-crypto" className="btn-secondary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
                  {t('hero_cta_demo')}
                </Link>
                <Link href="/contact?subject=crypto-consultation" className="btn-tertiary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
                  {t('hero_cta_consult')}
                </Link>
              </div>
              <p className="text-xs text-foreground/50 mt-6">
                {t('hero_beta_note')}
              </p>
              <div className="mt-8 sm:mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 text-sm">
                <Stat label={t('stat1_label')} value={t('stat1_value')} sub={t('stat1_sub')} />
                <Stat label={t('stat2_label')} value={t('stat2_value')} sub={t('stat2_sub')} />
                <Stat label={t('stat3_label')} value={t('stat3_value')} sub={t('stat3_sub')} />
                <Stat label={t('stat4_label')} value={t('stat4_value')} sub={t('stat4_sub')} />
              </div>
              <div className="mt-10">
                <TrustStrip />
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="section-padding border-b border-border/60">
          <div className="layout-container">
            <p className="t-eyebrow mb-3">{t('feat_eyebrow')}</p>
            <h2 className="t-display-section mb-8 sm:mb-12 max-w-xl sm:max-w-2xl">
              {t('feat_title')}
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURE_META.map((f) => (
                <div key={f.titleKey} className="card-enterprise">
                  <div className="icon-container mb-4">
                    <f.icon className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">{t(f.titleKey)}</h3>
                  <p className="t-body-sm text-foreground/65 leading-relaxed">{t(f.descKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Strategies — 3 LIVE rc29 (Spot DCA · Spot Swing · Smart Money Confluence) */}
        <section className="section-padding border-b border-border/60">
          <div className="layout-container">
            <p className="t-eyebrow mb-3">{t('strat_eyebrow')}</p>
            <h2 className="t-display-section mb-3 max-w-xl sm:max-w-2xl">{t('strat_title')}</h2>
            <p className="t-body text-foreground/60 max-w-xl sm:max-w-2xl mb-8 sm:mb-12">
              {t('strat_subtitle')}
            </p>
            <div className="grid md:grid-cols-3 gap-5">
              {CRYPTO_STRATEGIES.map((s) => (
                <div key={s.slug} className="card-enterprise group">
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <h3 className="text-base font-semibold leading-snug">{s.name[localeKey]}</h3>
                    <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  </div>
                  <p className="text-xs text-foreground/55 mb-3 leading-snug italic">{s.tagline[localeKey]}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mb-4">
                    <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground">
                      {s.timeframe}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground">
                      {s.market}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                      {s.tierAccess[localeKey]}
                    </span>
                  </div>
                  <p className="t-body-sm text-foreground/65 leading-relaxed mb-4">{s.description[localeKey]}</p>
                  <ul className="space-y-1.5 pt-3 border-t border-border/40">
                    {s.highlights[localeKey].map((h, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/70 leading-snug">
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="text-xs text-foreground/50 mt-6 max-w-2xl">
              {localeKey === 'id'
                ? 'Akses strategi gated per tier: Demo + Starter pakai Spot DCA · Active dapat tambah Spot Swing · Pro/HNWI dapat penuh termasuk Smart Money Confluence (futures support).'
                : 'Strategy access gated per tier: Demo + Starter use Spot DCA · Active adds Spot Swing · Pro/HNWI get all including Smart Money Confluence (futures support).'}
            </p>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="section-padding border-b border-border/60">
          <div className="layout-container">
            <p className="t-eyebrow mb-3">{t('pricing_eyebrow')}</p>
            <h2 className="t-display-section mb-3 max-w-xl sm:max-w-2xl">{t('pricing_title')}</h2>
            <p className="t-body text-foreground/60 max-w-xl sm:max-w-2xl mb-8 sm:mb-12">
              {t('pricing_subtitle')}
            </p>
            {/* Demo Banner — entry point sebelum 4 paid tier grid */}
            {(() => {
              const demoTier = CRYPTO_TIERS_META.find((tt) => tt.id === 'demo')!;
              const isEn = localeKey === 'en';
              const bannerTitle = isEn ? 'Try Robot Crypto FREE for 30 days' : 'Coba Robot Crypto GRATIS 30 hari';
              const bannerSubtitle = isEn
                ? 'Demo wallet $5,000 USDT · 1 concurrent slot · 2x leverage · Spot DCA Trend · No credit card.'
                : 'Demo wallet $5.000 USDT · 1 posisi simultan · leverage 2x · Spot DCA Trend · Tanpa kartu kredit.';
              return (
                <div id="demo" className="mb-8 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500 text-amber-50 text-[10px] font-bold uppercase tracking-wider">
                          {demoTier.name[localeKey]}
                        </span>
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono uppercase tracking-wider">
                          {isEn ? 'Zero Cost · No Commitment' : 'Tanpa Biaya · Tanpa Komitmen'}
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-semibold mb-1">{bannerTitle}</h3>
                      <p className="text-sm text-foreground/70 leading-relaxed">{bannerSubtitle}</p>
                    </div>
                    <Link
                      href={demoTier.ctaHref}
                      className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium shrink-0"
                    >
                      {demoTier.cta[localeKey]} <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })()}

            {/* 4 paid tier grid — starter / active / pro / hnwi */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {CRYPTO_TIERS_META.filter((t) => t.id !== 'demo').map((tier) => (
                <div
                  key={tier.id}
                  id={tier.id}
                  className={`card-enterprise flex flex-col relative ${tier.popular ? 'border-amber-500/50 ring-2 ring-amber-500/20' : ''}`}
                >
                  {tier.popular && (
                    <span className="absolute -top-3 left-6 inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500 text-amber-50 text-[10px] font-bold uppercase tracking-wider">
                      {t('popular_badge')}
                    </span>
                  )}
                  <h3 className="text-xl font-semibold mb-1">{tier.name[localeKey]}</h3>
                  <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider mb-3">
                    {tier.modalMin[localeKey]} · {tier.slot} slot · {tier.leverage}
                  </p>
                  <p className="text-sm text-foreground/60 mb-4 leading-relaxed">{tier.desc[localeKey]}</p>
                  <div className="flex items-baseline gap-1 mb-1 flex-wrap">
                    <span className="text-3xl sm:text-4xl font-bold break-words">{formatPrice(tier.priceKey, localeKey, { compact: false })}</span>
                    <span className="text-sm text-foreground/50">
                      {localeKey === 'id' ? '/bulan' : '/mo'}
                    </span>
                  </div>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-mono uppercase tracking-wider mb-5">
                    Risk {tier.riskPerTrade}/trade · {localeKey === 'id' ? 'cap notional' : 'notional cap'} {tier.notionalCap}
                  </p>
                  <ul className="space-y-2 mb-6 flex-1">
                    {tier.features[localeKey].map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground/80 leading-relaxed">
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={tier.ctaHref}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                      tier.popular
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'border border-border hover:bg-accent hover:border-amber-500/40'
                    }`}
                  >
                    {tier.cta[localeKey]} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
            <p className="text-xs text-foreground/50 mt-6 text-center">
              {t('pricing_footer')}
            </p>
          </div>
        </section>

        {/* Steps */}
        <section className="section-padding border-b border-border/60">
          <div className="layout-container">
            <p className="t-eyebrow mb-3">{t('steps_eyebrow')}</p>
            <h2 className="t-display-section mb-8 sm:mb-12 max-w-xl sm:max-w-2xl">{t('steps_title')}</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {STEP_META.map((s) => (
                <div key={s.step} className="card-enterprise">
                  <div className="t-eyebrow mb-3 text-amber-400">{s.step}</div>
                  <h3 className="text-base font-semibold mb-2">{t(s.titleKey)}</h3>
                  <p className="t-body-sm text-foreground/65 leading-relaxed">{t(s.descKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="section-padding border-b border-border/60">
          <div className="layout-container">
            <p className="t-eyebrow mb-3">{t('faq_eyebrow')}</p>
            <h2 className="t-display-section mb-8 sm:mb-12 max-w-xl sm:max-w-2xl">{t('faq_title')}</h2>
            <div className="grid md:grid-cols-2 gap-x-8 lg:gap-x-10 gap-y-6 sm:gap-y-8 max-w-5xl">
              {FAQ_ITEMS.map((item) => (
                <div key={item.q}>
                  <h3 className="text-base font-semibold mb-2 leading-snug">{item.q}</h3>
                  <p className="t-body-sm text-foreground/70 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section-padding">
          <div className="layout-container text-center max-w-3xl mx-auto">
            <h2 className="t-display-section mb-4">{t('cta_title')}</h2>
            <p className="t-body text-foreground/60 mb-8">
              {t('cta_body')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register?service=crypto" className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
                {t('cta_primary')} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/contact" className="btn-secondary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
                {t('cta_secondary')}
              </Link>
            </div>
            <p className="text-xs text-foreground/40 mt-8 max-w-xl mx-auto leading-relaxed">
              <strong>{t('cta_disclaimer_strong')}</strong> {t('cta_disclaimer_body')}
            </p>
          </div>
        </section>

        <CryptoStickyCompare />
      </main>
      <EnterpriseFooter />
    </div>
  );
}

async function CryptoStickyCompare() {
  const ts = await getTranslations('shared');
  return (
    <StickyCtaBar
      message={ts('sticky_compare_text')}
      ctaLabel={ts('sticky_compare_cta')}
      href="/pricing"
    />
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div className="t-eyebrow mb-1">{label}</div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-[11px] text-foreground/50 font-mono mt-0.5">{sub}</div>
    </div>
  );
}
