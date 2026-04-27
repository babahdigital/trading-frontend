import { getPageMetadata } from '@/lib/seo';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { localizePricingTier } from '@/lib/i18n/localize-cms';
import { breadcrumbSchema, ldJson, organizationSchema } from '@/lib/seo-jsonld';
import { CapabilityLadder } from '@/components/pricing/capability-ladder';
import {
  ArrowRight,
  Check,
  TrendingUp,
  Bitcoin,
  Server,
  Database,
  Calendar,
  GitMerge,
  Building2,
  Brain,
  Newspaper,
} from 'lucide-react';

type Tier = Parameters<typeof localizePricingTier>[0];

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
        ? 'Robot Meta MT5 $19-$299/mo, Robot Crypto Binance $49-$499/mo, VPS License from $3K, 8 Developer API marketplace, and Institutional access. Zero-custody — capital always stays in your broker / Binance account.'
        : 'Robot Meta MT5 $19-$299/bulan, Robot Crypto Binance $49-$499/bulan, VPS License mulai $3K, 8 Developer API marketplace, dan akses Institusional. Zero-custody — modal selalu di akun broker / Binance Anda.',
    },
    locale === 'en' ? 'en' : 'id',
  );
}

// Tier metadata: prices, hrefs, popular flag stay hardcoded (universal).
// Names + features + periods resolved from i18n at render. Tier slugs (`t1`,
// `t2`, `t3`) map to feature key suffixes in pricing_page namespace.
const SIGNAL_TIER_META = [
  { slug: 't1', name: 'Tier 1 · Swing', price: '$19', cta: '/register/signal?tier=swing' },
  { slug: 't2', name: 'Tier 2 · Scalping', price: '$79', popular: true, cta: '/register/signal?tier=scalping' },
  { slug: 't3', name: 'Tier 3 · All-In', price: '$299', cta: '/register/signal?tier=all' },
];

const CRYPTO_TIER_META = [
  { slug: 't1', name: 'Tier Basic', price: '$49', periodKey: 'crypto_period_t1', cta: '/register/crypto?tier=basic' },
  { slug: 't2', name: 'Tier Pro', price: '$199', periodKey: 'crypto_period_t2', popular: true, cta: '/register/crypto?tier=pro' },
  { slug: 't3', name: 'Tier HNWI', price: '$499', periodKey: 'crypto_period_t3', cta: '/contact?subject=crypto-hnwi' },
];

const VPS_TIER_META = [
  { slug: 't1', name: 'VPS Standard', price: '$3,000', periodKey: 'vps_period_setup_150', cta: '/register/vps' },
  { slug: 't2', name: 'VPS Premium', price: '$7,500', periodKey: 'vps_period_setup_300', popular: true, cta: '/register/vps' },
  { slug: 't3', name: 'Dedicated Tier', price: '$1,499', periodKey: 'vps_period_dedicated', cta: '/contact?subject=dedicated-vps' },
];

const PUBLIC_APIS = [
  { id: 'news', icon: Newspaper, name: 'News & Sentiment', desc: 'Forex + Crypto news dengan sentiment scoring + bias analysis', tiers: [
    { tier: 'Free', price: '$0', spec: '100 req/hari curated' },
    { tier: 'Starter', price: '$9/mo', spec: '500 req/hari + sentiment basic' },
    { tier: 'Pro', price: '$29/mo', spec: '5K req/hari + sentiment + impact scoring' },
    { tier: 'VIP', price: '$99/mo', spec: 'Unlimited + WebSocket stream' },
  ] },
  { id: 'signals', icon: TrendingUp, name: 'Signals API', desc: 'REST/WebSocket signal feed untuk integrasi pihak ketiga', tiers: [
    { tier: 'Free', price: '$0', spec: '3 signal terakhir per hari' },
    { tier: 'Starter', price: '$19/mo', spec: 'Last 50/hari, REST poll' },
    { tier: 'Pro', price: '$49/mo', spec: 'Full feed real-time' },
    { tier: 'VIP', price: '$149/mo', spec: 'Premium AI confidence + reasoning' },
  ] },
  { id: 'indicators', icon: Brain, name: 'Indicators API', desc: '14 indicator core (SMC, Wyckoff, momentum) + custom parameter', popular: true, tiers: [
    { tier: 'Free', price: '$0', spec: '50 req/hari core indicators' },
    { tier: 'Hobby', price: '$19/mo', spec: '500 req/hari + 5 indicator advanced' },
    { tier: 'Pro', price: '$79/mo', spec: 'Custom parameter, semua indicator' },
    { tier: 'VIP', price: '$199/mo', spec: 'Backtest sweep + walk-forward' },
  ] },
  { id: 'calendar', icon: Calendar, name: 'Calendar API', desc: 'Economic calendar dengan impact scoring + sentiment overlay', tiers: [
    { tier: 'Free', price: '$0', spec: '100 req/hari high-impact only' },
    { tier: 'Hobby', price: '$19/mo', spec: 'Full calendar all-impact' },
    { tier: 'Pro', price: '$49/mo', spec: 'Webhook delivery + filter' },
    { tier: 'VIP', price: '$99/mo', spec: 'Unlimited + custom alert rules' },
  ] },
  { id: 'market', icon: Database, name: 'Market Data API', desc: 'Tick + bar OHLC 14 instrumen (forex, metals, energy, crypto majors)', tiers: [
    { tier: 'Hobby', price: '$29/mo', spec: '1y history bar data' },
    { tier: 'Pro', price: '$99/mo', spec: '5y history + tick data' },
    { tier: 'VIP', price: '$249/mo', spec: 'WebSocket stream + aggregation' },
    { tier: 'Enterprise', price: 'Custom', spec: 'Custom feed, redundant edge' },
  ] },
  { id: 'correlation', icon: GitMerge, name: 'Correlation API', desc: 'Korelasi pair real-time + heatmap multi-timeframe', tiers: [
    { tier: 'Free', price: '$0', spec: '30 req/hari H1 matrix' },
    { tier: 'Hobby', price: '$9/mo', spec: 'Multi-timeframe matrix' },
    { tier: 'Pro', price: '$19/mo', spec: 'Custom basket correlation' },
    { tier: 'VIP', price: '$49/mo', spec: 'Historical correlation backtest' },
  ] },
  { id: 'broker', icon: Building2, name: 'Broker Specs API', desc: 'Spec broker (spread, commission, leverage cap, margin)', tiers: [
    { tier: 'Free', price: '$0', spec: '100 req/hari shared with Calendar' },
    { tier: 'Pro', price: '$19/mo', spec: 'Unlimited query + 30+ broker' },
    { tier: 'VIP', price: '$49/mo', spec: 'Historical spread tracking' },
  ] },
  { id: 'ai', icon: Brain, name: 'AI Explainability API', desc: 'Per-trade rationale + counterfactual analysis (Enterprise NDA)', tiers: [
    { tier: 'Enterprise', price: '$99-$299/mo', spec: 'NDA only — kontak ir@babahalgo.com' },
  ] },
];

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('pricing');
  const tp = await getTranslations('pricing_page');

  const signalTiers = SIGNAL_TIER_META.map((m) => ({
    name: m.name,
    price: m.price,
    period: tp('signal_period_monthly'),
    features: tp.raw(`signal_${m.slug}_features`) as string[],
    cta: m.cta,
    popular: m.popular,
  }));
  const cryptoTiers = CRYPTO_TIER_META.map((m) => ({
    name: m.name,
    price: m.price,
    period: tp(m.periodKey as 'crypto_period_t1' | 'crypto_period_t2' | 'crypto_period_t3'),
    features: tp.raw(`crypto_${m.slug}_features`) as string[],
    cta: m.cta,
    popular: m.popular,
  }));
  const vpsTiers = VPS_TIER_META.map((m) => ({
    name: m.name,
    price: m.price,
    period: tp(m.periodKey as 'vps_period_setup_150' | 'vps_period_setup_300' | 'vps_period_dedicated'),
    features: tp.raw(`vps_${m.slug}_features`) as string[],
    cta: m.cta,
    popular: m.popular,
  }));

  let cmsTiers: Array<{
    slug: string; name: string; price: string; subtitle: string | null;
    features: string[]; ctaLabel: string; ctaLink: string;
  }> = [];
  try {
    const { prisma } = await import('@/lib/db/prisma');
    const raw = await prisma.pricingTier.findMany({ where: { isVisible: true }, orderBy: { sortOrder: 'asc' } });
    cmsTiers = raw.map((r: Tier) => {
      const loc = localizePricingTier(r, locale);
      return {
        slug: loc.slug, name: loc.name, price: loc.price, subtitle: loc.subtitle,
        features: Array.isArray(loc.features) ? (loc.features as string[]) : [],
        ctaLabel: loc.ctaLabel, ctaLink: loc.ctaLink,
      };
    });
  } catch { /* DB unavailable — use fallback */ }

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
        {/* Hero */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6 text-center">
            <p className="t-eyebrow mb-4">{tp('hero_eyebrow')}</p>
            <h1 className="t-display-page mb-4">{t('title')}</h1>
            <p className="t-lead text-foreground/60 max-w-xl sm:max-w-2xl mx-auto">{t('subtitle')}</p>
            <p className="text-xs text-amber-300 font-mono uppercase tracking-wider mt-6">
              {tp('hero_disclaimer')}
            </p>
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

        {/* Robot Crypto — Binance auto-trading */}
        <ProductSection
          eyebrow={tp('crypto_eyebrow')}
          icon={Bitcoin}
          title={tp('crypto_title')}
          subtitle={tp('crypto_subtitle')}
          tiers={cryptoTiers}
          popularLabel={tp('popular_badge')}
          selectLabel={(name) => tp('select_tier', { name })}
        />

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

        {/* Developer API Marketplace */}
        <section id="apis" className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">{tp('apis_eyebrow')}</p>
            <h2 className="t-display-section mb-3 max-w-xl sm:max-w-2xl">{tp('apis_title')}</h2>
            <p className="t-body text-foreground/60 max-w-xl sm:max-w-2xl mb-8 sm:mb-12">
              {tp('apis_subtitle_prefix')}
              {' '}<Link href="/contact?subject=api-docs" className="text-amber-400 hover:underline">{tp('apis_subtitle_link')}</Link>.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {PUBLIC_APIS.map((api) => (
                <div
                  key={api.id}
                  id={api.id}
                  className={`card-enterprise scroll-mt-24 ${api.popular ? 'border-amber-500/50 ring-2 ring-amber-500/20' : ''}`}
                >
                  <div className="flex items-start gap-3 mb-4">
                    <span className="inline-flex h-10 w-10 rounded-lg bg-amber-500/15 border border-amber-500/30 items-center justify-center shrink-0">
                      <api.icon className="h-5 w-5 text-amber-400" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base leading-tight">{api.name}</h3>
                      {api.popular && (
                        <span className="inline-block mt-1 text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                          {tp('api_popular_label')}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="t-body-sm text-foreground/65 leading-relaxed mb-4">{api.desc}</p>
                  <div className="space-y-1.5 mb-4">
                    {api.tiers.map((tier) => (
                      <div key={tier.tier} className="flex items-baseline justify-between text-xs gap-2 py-1.5 border-b border-border/40 last:border-b-0">
                        <span className="font-mono uppercase tracking-wider text-muted-foreground">{tier.tier}</span>
                        <span className="font-mono font-semibold text-amber-300 shrink-0">{tier.price}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-foreground/50 leading-relaxed">
                    {api.tiers[api.tiers.length - 1].spec}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link
                href="/contact?subject=api-marketplace"
                className="btn-secondary inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm"
              >
                {tp('apis_consult_cta')} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Institutional / B2B */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
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
                <Link href="/register/institutional" className="btn-secondary w-full justify-center">
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

        {/* CMS tiers (admin override) */}
        {cmsTiers.length > 0 && (
          <section className="section-padding border-b border-border/60">
            <div className="container-default px-4 sm:px-6">
              <p className="t-eyebrow mb-3">{tp('cms_eyebrow')}</p>
              <h2 className="t-display-sub mb-8 sm:mb-12">{tp('cms_title')}</h2>
              <div className="grid md:grid-cols-3 gap-5 sm:gap-6">
                {cmsTiers.map((tier) => (
                  <div key={tier.slug} className="card-enterprise flex flex-col">
                    <h3 className="text-xl font-medium">{tier.name}</h3>
                    {tier.subtitle && <p className="t-body-sm text-foreground/50 mt-1">{tier.subtitle}</p>}
                    <p className="font-mono text-2xl font-semibold mt-3 mb-6">{tier.price}</p>
                    <ul className="space-y-2.5 flex-1 mb-8">
                      {tier.features.map((f, i) => <FeatureItem key={i}>{String(f)}</FeatureItem>)}
                    </ul>
                    <Link href={tier.ctaLink} className="btn-secondary w-full justify-center">
                      {tier.ctaLabel}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Free Demo CTA */}
        <section className="section-padding">
          <div className="container-default px-4 sm:px-6 text-center max-w-3xl mx-auto">
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
      </main>

      <EnterpriseFooter />
    </div>
  );
}

interface PricingTier {
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  popular?: boolean;
}

function ProductSection({
  eyebrow,
  icon: Icon,
  title,
  subtitle,
  tiers,
  popularLabel,
  selectLabel,
}: {
  eyebrow: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  tiers: PricingTier[];
  popularLabel: string;
  selectLabel: (name: string) => string;
}) {
  return (
    <section className="section-padding border-b border-border/60">
      <div className="container-default px-4 sm:px-6">
        <div className="flex items-center gap-2.5 mb-3">
          <Icon className="h-4 w-4 text-amber-400" />
          <p className="t-eyebrow !mb-0">{eyebrow}</p>
        </div>
        <h2 className="t-display-section mb-3 max-w-xl sm:max-w-2xl">{title}</h2>
        <p className="t-body text-foreground/60 max-w-xl sm:max-w-2xl mb-8 sm:mb-12">{subtitle}</p>
        <div className="grid md:grid-cols-3 gap-5 sm:gap-6">
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
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-bold">{tier.price}</span>
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
      <Check className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
      <span>{children}</span>
    </li>
  );
}
