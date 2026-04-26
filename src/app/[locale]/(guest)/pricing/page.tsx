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
  Zap,
  Database,
  Calendar,
  GitMerge,
  Building2,
  Brain,
  Newspaper,
} from 'lucide-react';

type Tier = Parameters<typeof localizePricingTier>[0];

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = await getTranslations('pricing');
  return getPageMetadata('/pricing', {
    title: `${t('title')} — BabahAlgo`,
    description:
      'Forex Signal $19-$299/mo, Crypto Bot $49-$499/mo, VPS License $3K+, 9 Public API marketplace, dan Institutional API access. Zero-custody — Anda selalu pegang dana sendiri.',
  });
}

const SIGNAL_TIERS = [
  { name: 'Starter', price: '$19', period: '/bulan', features: ['Live signals (≤3 simbol)', '1 strategy aktif', 'Rule-based AI explainability', 'MT5 bridge ringan', 'Email support'], cta: '/register/signal' },
  { name: 'Pro', price: '$79', period: '/bulan', popular: true, features: ['Unlimited symbols', '5 strategi paralel', 'Mid-tier AI explainability', 'Priority MT5 latency', 'Email + Telegram support'], cta: '/register/signal' },
  { name: 'VIP', price: '$299', period: '/bulan', features: ['Semua fitur Pro', 'Premium AI (gradient boost)', 'Custom backtest sweep (≤10/bulan)', 'Payout API', 'Copy-trade lead dashboard', 'Priority support 24/7'], cta: '/register/signal' },
];

const CRYPTO_TIERS = [
  { name: 'Crypto Basic', price: '$49', period: '/bulan + 20% PS', features: ['3 pair otomatis', 'Leverage maks 5x', 'Strategi scalping_momentum', 'Telegram + dashboard'], cta: '/register/crypto?tier=basic' },
  { name: 'Crypto Pro', price: '$199', period: '/bulan + 15% PS', popular: true, features: ['8 pair otomatis + 1 manual whitelist', 'Leverage maks 10x', '4 strategi (SMC, Wyckoff, Momentum, Mean Reversion)', 'Telegram VIP + priority support'], cta: '/register/crypto?tier=pro' },
  { name: 'Crypto HNWI', price: '$499', period: '/bulan + 10% PS', features: ['12 pair custom whitelist/blacklist', 'Leverage maks 15x', 'Semua strategi + parameter tuning', 'Dedicated account manager + SLA 99.9%'], cta: '/contact?subject=crypto-hnwi' },
];

const VPS_TIERS = [
  { name: 'VPS Standard', price: '$3,000', period: 'setup + $150/bulan', features: ['Dedicated VPS broker-level', 'Full bot access + risk parameter', 'Affiliate broker discount', 'Konfigurasi kustom'], cta: '/register/vps' },
  { name: 'VPS Premium', price: '$7,500', period: 'setup + $300/bulan', popular: true, features: ['Multi-broker bridge (MT4 + MT5)', 'Up to 3 akun paralel', 'Custom strategy parameter', 'Priority support 24/7'], cta: '/register/vps' },
  { name: 'Dedicated Tier', price: '$1,499', period: '/bulan', features: ['VPS isolated single-customer', 'Dedicated MT5 bridge', 'Isolated DB schema', '24/7 Telegram incident channel'], cta: '/contact?subject=dedicated-vps' },
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
  { id: 'execution', icon: Zap, name: 'Execution Cloud API', desc: 'Order routing langsung MT5 lewat ZeroMQ bridge sub-2ms latency', tiers: [
    { tier: 'Pro', price: '$19/akun/mo', spec: 'REST + WebSocket execution' },
    { tier: 'Enterprise', price: '$49/akun/mo', spec: 'zmq_ea native + slippage budget per order' },
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
            <p className="t-eyebrow mb-4">Pricing</p>
            <h1 className="t-display-page mb-4">{t('title')}</h1>
            <p className="t-lead text-foreground/60 max-w-2xl mx-auto">{t('subtitle')}</p>
            <p className="text-xs text-amber-300 font-mono uppercase tracking-wider mt-6">
              Zero-custody · Anda pegang dana di akun broker / Binance Anda sendiri
            </p>
          </div>
        </section>

        {/* Forex Signal */}
        <ProductSection
          eyebrow="Forex Signal"
          icon={TrendingUp}
          title="Sinyal trading Forex multi-tier"
          subtitle="3 tier sesuai intensitas trading Anda. Eksekusi tetap di akun broker pribadi Anda — kami tech provider, bukan asset manager."
          tiers={SIGNAL_TIERS}
        />

        {/* Capability ladder — sourced from /v1/capabilities backend */}
        <CapabilityLadder />

        {/* Crypto Bot */}
        <ProductSection
          eyebrow="Crypto Bot · Binance Futures"
          icon={Bitcoin}
          title="Bot trading kripto otomatis 24/7"
          subtitle="Anda pegang Binance API key (Read + Trade saja, tidak ada Withdraw). Profit share dipotong dari realized PnL bulanan."
          tiers={CRYPTO_TIERS}
        />

        {/* VPS License */}
        <ProductSection
          eyebrow="VPS License · One-time + Maintenance"
          icon={Server}
          title="Bot di VPS pribadi Anda"
          subtitle="Konfigurasi penuh, kontrol penuh, di server Anda sendiri. Cocok untuk trader serius yang butuh customization mendalam."
          tiers={VPS_TIERS}
        />

        {/* Public API Marketplace */}
        <section id="apis" className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">Public API Marketplace</p>
            <h2 className="t-display-section mb-3 max-w-2xl">9 API container untuk integrasi pihak ketiga</h2>
            <p className="t-body text-foreground/60 max-w-2xl mb-12">
              REST + WebSocket dengan rate limit per tier. API key issued setelah pembayaran. Untuk schema lengkap dan integrasi technical, hubungi
              {' '}<Link href="/contact?subject=api-docs" className="text-amber-400 hover:underline">tim engineering kami</Link>.
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
                          Populer
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
                Konsultasi API Custom <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Institutional / B2B */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">Institutional & B2B</p>
            <h2 className="t-display-section mb-3 max-w-2xl">API access + Backtest as a Service</h2>
            <p className="t-body text-foreground/60 max-w-2xl mb-12">
              Untuk trading firm, family office, dan high-net-worth individuals. <strong>Tidak ada Managed Account</strong> —
              kami tetap zero-custody. Yang kami sediakan: API integration, white-label tech, backtest engine on-demand.
            </p>
            <div className="grid md:grid-cols-2 gap-5 max-w-4xl">
              <div className="card-enterprise">
                <h3 className="text-xl font-semibold mb-2">API Access</h3>
                <p className="font-display text-3xl font-medium mb-1">Custom</p>
                <p className="text-xs text-amber-400 font-mono uppercase tracking-wider mb-6">usage-based pricing</p>
                <ul className="space-y-2.5 mb-6">
                  <FeatureItem>REST + WebSocket API priority lane</FeatureItem>
                  <FeatureItem>Signal streaming dedicated infra</FeatureItem>
                  <FeatureItem>Custom integration support</FeatureItem>
                  <FeatureItem>Dedicated engineering contact</FeatureItem>
                  <FeatureItem>White-label tersedia</FeatureItem>
                </ul>
                <Link href="/register/institutional" className="btn-secondary w-full justify-center">
                  Speak with IR <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="card-enterprise">
                <h3 className="text-xl font-semibold mb-2">Backtest as a Service</h3>
                <p className="font-display text-3xl font-medium mb-1">$99 — $999</p>
                <p className="text-xs text-amber-400 font-mono uppercase tracking-wider mb-6">/bulan</p>
                <ul className="space-y-2.5 mb-6">
                  <FeatureItem>Walk-forward + Monte Carlo</FeatureItem>
                  <FeatureItem>5 tahun tick data 14 instrumen</FeatureItem>
                  <FeatureItem>Strategy parameter optimization</FeatureItem>
                  <FeatureItem>Whitelabel report PDF</FeatureItem>
                  <FeatureItem>API integration + automation</FeatureItem>
                </ul>
                <Link href="/contact?subject=backtest-service" className="btn-secondary w-full justify-center">
                  Konsultasi B2B <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CMS tiers (admin override) */}
        {cmsTiers.length > 0 && (
          <section className="section-padding border-b border-border/60">
            <div className="container-default px-4 sm:px-6">
              <p className="t-eyebrow mb-3">Plans (CMS)</p>
              <h2 className="t-display-sub mb-12">Plan dari admin CMS</h2>
              <div className="grid md:grid-cols-3 gap-6">
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
            <h2 className="t-display-section mb-4">Coba dulu, gratis.</h2>
            <p className="t-body text-foreground/60 mb-8">
              Sebelum bayar tier apapun, coba sinyal kami di akun MT5 demo. Indicator confluence juga tersedia
              gratis untuk discretionary trader. Tidak masuk track record live, tidak ada batas waktu untuk evaluasi.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/demo" className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
                Mulai Demo Gratis <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/contact" className="btn-secondary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
                Konsultasi Tier Cocok
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
}: {
  eyebrow: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  tiers: PricingTier[];
}) {
  return (
    <section className="section-padding border-b border-border/60">
      <div className="container-default px-4 sm:px-6">
        <div className="flex items-center gap-2.5 mb-3">
          <Icon className="h-4 w-4 text-amber-400" />
          <p className="t-eyebrow !mb-0">{eyebrow}</p>
        </div>
        <h2 className="t-display-section mb-3 max-w-2xl">{title}</h2>
        <p className="t-body text-foreground/60 max-w-2xl mb-12">{subtitle}</p>
        <div className="grid md:grid-cols-3 gap-5">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`card-enterprise flex flex-col relative ${tier.popular ? 'border-amber-500/50 ring-2 ring-amber-500/20' : ''}`}
            >
              {tier.popular && (
                <span className="absolute -top-3 left-6 inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500 text-amber-50 text-[10px] font-bold uppercase tracking-wider">
                  Populer
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
                Pilih {tier.name} <ArrowRight className="w-4 h-4" />
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
