'use client';

import { useEffect, useState } from 'react';
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
const RISK_LAYERS = {
  preTrade: [
    { num: 1, name: 'Spread guard', desc: 'Rejects entry when spread exceeds threshold' },
    { num: 2, name: 'Dynamic lot sizing', desc: 'Position size scaled to account equity and risk' },
    { num: 3, name: 'News blackout', desc: 'No entries during high-impact economic events' },
    { num: 4, name: 'Max open positions', desc: 'Hard cap on simultaneous trades' },
    { num: 5, name: 'Tier total cap', desc: 'Aggregate exposure limit across all strategies' },
  ],
  inTrade: [
    { num: 6, name: 'Protective stop-loss', desc: 'Every position has a hard stop' },
    { num: 7, name: 'Max hold time (4h)', desc: 'Auto-close after maximum holding period' },
    { num: 8, name: 'Trail to breakeven', desc: 'Move stop to entry after target reached' },
    { num: 9, name: 'Session DD guard', desc: 'Pause trading if session drawdown exceeds limit' },
  ],
  postSystem: [
    { num: 10, name: 'Cooldown period', desc: 'Enforced pause after consecutive losses' },
    { num: 11, name: 'Catastrophic breaker', desc: 'Full shutdown at critical drawdown level' },
    { num: 12, name: 'Kill-switch', desc: 'Admin remote shutdown via dashboard' },
  ],
};

// ─── Pricing Data ───
const PRICING_TABS = [
  { id: 'demo', label: 'Free Demo' },
  { id: 'forex', label: 'Forex Signal' },
  { id: 'crypto', label: 'Crypto Bot' },
  { id: 'vps', label: 'VPS License' },
  { id: 'apis', label: 'Public APIs' },
  { id: 'institutional', label: 'Institutional' },
];

const PRICING_PLANS: Record<string, Array<{
  name: string; tier: string; price: string; period: string;
  tagline: string; features: string[]; cta: { label: string; href: string };
  popular?: boolean;
}>> = {
  demo: [
    {
      name: 'Signal Demo', tier: 'DEMO', price: 'Gratis', period: 'beta',
      tagline: 'Coba sinyal Forex tanpa biaya — akun MT5 demo',
      features: ['Akses preview signal harian', 'MT5 demo account terhubung', 'Dashboard read-only', 'Tidak masuk track record live', 'Upgrade kapan saja'],
      cta: { label: 'Mulai Demo Gratis', href: '/demo' },
    },
    {
      name: 'Indicator Free', tier: 'INDICATOR', price: 'Gratis', period: 'beta',
      tagline: 'Indikator confluence + 12-layer risk preview',
      features: ['SMC + Wyckoff confluence overlay', '14 instrumen real-time', 'Risk score live', 'Tidak ada eksekusi otomatis', 'Untuk discretionary trader'],
      cta: { label: 'Aktifkan Indicator', href: '/demo?product=indicator' },
      popular: true,
    },
  ],
  forex: [
    {
      name: 'Signal Starter', tier: 'STARTER', price: '$19', period: '/bulan',
      tagline: 'Entry tier — coba sinyal harian',
      features: ['Live signals (≤3 simbol)', '1 strategy aktif', 'Rule-based AI explainability', 'MT5 bridge ringan', 'Email support'],
      cta: { label: 'Mulai Starter', href: '/register/signal' },
    },
    {
      name: 'Signal Pro', tier: 'PRO', price: '$79', period: '/bulan',
      tagline: 'Untuk trader aktif multi-pair',
      features: ['Unlimited symbols', '5 strategi paralel', 'Mid-tier AI explainability', 'Priority MT5 latency', 'Email + Telegram support'],
      cta: { label: 'Mulai Pro', href: '/register/signal' },
      popular: true,
    },
    {
      name: 'Signal VIP', tier: 'VIP', price: '$299', period: '/bulan',
      tagline: 'Premium AI + copy-trade dashboard',
      features: ['Semua fitur Pro', 'Premium AI (gradient boost)', 'Custom backtest sweep (≤10/bulan)', 'Payout API', 'Copy-trade lead dashboard', 'Priority support 24/7'],
      cta: { label: 'Mulai VIP', href: '/register/signal' },
    },
  ],
  crypto: [
    {
      name: 'Crypto Basic', tier: 'CRYPTO', price: '$49', period: '/bulan + 20%',
      tagline: 'Bot Binance Futures untuk trader pemula',
      features: ['3 pair otomatis', 'Leverage maks 5x', 'Strategi scalping_momentum', 'Telegram + dashboard', 'Email support'],
      cta: { label: 'Mulai Basic', href: '/register/crypto?tier=basic' },
    },
    {
      name: 'Crypto Pro', tier: 'CRYPTO PRO', price: '$199', period: '/bulan + 15%',
      tagline: 'Multi-strategi untuk trader aktif',
      features: ['8 pair + 1 manual whitelist', 'Leverage maks 10x', '4 strategi (SMC, Wyckoff, Momentum, Mean Reversion)', 'Telegram VIP', 'Priority support'],
      cta: { label: 'Mulai Pro', href: '/register/crypto?tier=pro' },
      popular: true,
    },
    {
      name: 'Crypto HNWI', tier: 'CRYPTO HNWI', price: '$499', period: '/bulan + 10%',
      tagline: 'Capital besar dengan dedicated manager',
      features: ['12 pair + custom whitelist/blacklist', 'Leverage maks 15x', 'Semua strategi + parameter tuning', 'Dedicated account manager', 'SLA 99.9%'],
      cta: { label: 'Konsultasi HNWI', href: '/contact?subject=crypto-hnwi' },
    },
  ],
  vps: [
    {
      name: 'VPS License', tier: 'VPS', price: '$3,000', period: 'one-time setup',
      tagline: 'Bot terinstal di VPS pribadi Anda — kontrol penuh',
      features: ['Dedicated VPS broker-level', 'Full bot access + risk parameter', 'Affiliate broker discount', 'Konfigurasi kustom', 'Maintenance $150/bulan'],
      cta: { label: 'Konsultasi Setup', href: '/register/vps' },
    },
    {
      name: 'VPS Premium', tier: 'VPS PRO', price: '$7,500', period: 'one-time setup',
      tagline: 'Multi-broker, multi-akun, dedicated support',
      features: ['Multi-broker bridge (MT4 + MT5)', 'Up to 3 akun paralel', 'Custom strategy parameter', 'Priority support 24/7', 'Maintenance $300/bulan'],
      cta: { label: 'Konsultasi Setup', href: '/register/vps' },
      popular: true,
    },
    {
      name: 'Dedicated Tier', tier: 'DEDICATED', price: '$1,499', period: '/bulan',
      tagline: 'VPS isolated single-customer',
      features: ['Dedicated MT5 bridge VPS', 'Isolated DB schema', '24/7 Telegram incident channel', 'Custom risk framework', 'SLA 99.9%'],
      cta: { label: 'Konsultasi Dedicated', href: '/contact?subject=dedicated-vps' },
    },
  ],
  apis: [
    {
      name: 'News & Sentiment API', tier: 'NEWS', price: 'Free', period: '— $99/bulan',
      tagline: 'Forex + Crypto news dengan sentiment scoring',
      features: ['Free: 100 req/hari curated', 'Starter $9 — 500 req/hari', 'Pro $29 — 5K req/hari + sentiment', 'VIP $99 — unlimited + websocket'],
      cta: { label: 'Lihat Tier News', href: '/pricing/apis#news' },
    },
    {
      name: 'Signals API', tier: 'SIGNALS', price: 'Free', period: '— $149/bulan',
      tagline: 'REST/WebSocket signal feed untuk integrasi',
      features: ['Free: 3 last published', 'Starter $19 — last 50/hari', 'Pro $49 — full feed', 'VIP $149 — premium AI confidence'],
      cta: { label: 'Lihat Tier Signals', href: '/pricing/apis#signals' },
    },
    {
      name: 'Indicators API', tier: 'INDICATORS', price: 'Free', period: '— $199/bulan',
      tagline: '14 indicator core + custom params',
      features: ['Free: 50 req/hari core', 'Hobby $19 — 500 req/hari', 'Pro $79 — custom params', 'VIP $199 — backtest sweep'],
      cta: { label: 'Lihat Tier Indicators', href: '/pricing/apis#indicators' },
      popular: true,
    },
    {
      name: 'Calendar API', tier: 'CALENDAR', price: 'Free', period: '— $99/bulan',
      tagline: 'Economic calendar high-impact + sentiment',
      features: ['Free: 100 req/hari high-impact', 'Hobby $19 — full calendar', 'Pro $49 — webhook delivery', 'VIP $99 — unlimited'],
      cta: { label: 'Lihat Tier Calendar', href: '/pricing/apis#calendar' },
    },
    {
      name: 'Market Data API', tier: 'MARKET', price: '$29', period: '— $249/bulan',
      tagline: 'Tick + bar data 14 instrumen real-time',
      features: ['Hobby $29 — 1y history', 'Pro $99 — 5y history + tick', 'VIP $249 — websocket stream', 'Enterprise: custom feed'],
      cta: { label: 'Lihat Tier Market', href: '/pricing/apis#market' },
    },
    {
      name: 'Execution Cloud API', tier: 'EXECUTION', price: '$19', period: '/akun/bulan',
      tagline: 'Order routing langsung MT5 lewat ZeroMQ bridge',
      features: ['Pro $19/akun — REST + WS execution', 'Enterprise $49/akun — zmq_ea native', 'Sub-2ms latency', 'Slippage budget per order'],
      cta: { label: 'Konsultasi Execution', href: '/contact?subject=execution-cloud' },
    },
    {
      name: 'Correlation API', tier: 'CORRELATION', price: '$9', period: '— $49/bulan',
      tagline: 'Korelasi pair real-time + heatmap',
      features: ['Free: 30 req/hari H1 matrix', 'Hobby $9 — multi-timeframe', 'Pro $19 — custom basket', 'VIP $49 — historical backtest'],
      cta: { label: 'Lihat Tier Correlation', href: '/pricing/apis#correlation' },
    },
    {
      name: 'Broker Specs API', tier: 'BROKER', price: 'Free', period: '— $49/bulan',
      tagline: 'Spec broker (spread, commission, leverage cap)',
      features: ['Free: 100 req/hari shared', 'Pro $19 — unlimited query', 'VIP $49 — historical spread'],
      cta: { label: 'Lihat Tier Broker', href: '/pricing/apis#broker' },
    },
    {
      name: 'AI Explainability API', tier: 'AI', price: '$99', period: '— $299/bulan (NDA)',
      tagline: 'Confidence scoring + decision rationale (Enterprise NDA)',
      features: ['Enterprise only — kontrak NDA', 'Per-trade rationale + counterfactual', 'Custom model fine-tuning', 'Audit-grade explainability'],
      cta: { label: 'Konsultasi NDA', href: '/contact?subject=ai-explainability' },
    },
  ],
  institutional: [
    {
      name: 'API Access', tier: 'API', price: 'Custom', period: 'usage-based',
      tagline: 'Integrasi API langsung ke infrastruktur Anda',
      features: ['REST + WebSocket API', 'Signal streaming', 'Custom integration support', 'Dedicated engineering contact', 'White-label tersedia'],
      cta: { label: 'Speak with IR', href: '/register/institutional' },
      popular: true,
    },
    {
      name: 'Backtest as a Service', tier: 'B2B', price: '$99', period: '— $999/bulan',
      tagline: 'Backtest engine on-demand untuk trading firm',
      features: ['Walk-forward + Monte Carlo', '5 tahun tick data 14 instrumen', 'Strategy parameter optimization', 'Whitelabel report PDF', 'API integration'],
      cta: { label: 'Konsultasi B2B', href: '/contact?subject=backtest-service' },
    },
  ],
};

// ─── FAQ Data ───
const FAQ_ITEMS = [
  { q: 'Bagaimana cara verifikasi track record?', a: 'Equity statement kami diaudit secara independen dan tersedia atas permintaan. Kami menggunakan production account live di partner broker resmi. Anda dapat schedule briefing untuk meninjau audit trail lengkap termasuk trade-by-trade history.' },
  { q: 'Apakah BabahAlgo diregulasi?', a: 'CV Babah Digital adalah perusahaan teknologi terdaftar di Indonesia. Kami adalah technology provider — bukan broker, bukan financial advisor, bukan asset manager. Eksekusi trading selalu lewat partner broker yang teregulasi. Transparansi penuh, audit report tersedia atas permintaan.' },
  { q: 'Apakah ada free trial atau demo?', a: 'Ya. Signal Demo gratis untuk beta user — Anda dapat connect MT5 demo account dan lihat signal preview tanpa biaya. Indicator Free juga tersedia untuk discretionary trader. Demo tidak masuk public track record (per DEMO_UX_GUIDE).' },
  { q: 'Apakah saya bisa cancel kapan saja?', a: 'Ya. Subscription Signal dan Crypto Bot bersifat month-to-month tanpa lock-in. Untuk VPS License (one-time setup), maintenance bisa dipause; bot tetap di VPS Anda. Modal selalu di akun broker/Binance Anda — bukan di kami.' },
  { q: 'Bagaimana model affiliate broker bekerja?', a: 'Customer membuka akun di partner broker (Exness, IC Markets, dll) lewat link affiliate kami. Customer dapat discount commission/spread, kami dapat affiliate fee dari broker. Bot kami running di akun customer — modal tetap di broker, kami tidak custody dana sama sekali.' },
  { q: 'Bagaimana skenario flash crash atau black swan?', a: '12-layer risk framework kami include catastrophic breaker yang otomatis shutdown semua trading saat drawdown melewati threshold kritis. Plus kill-switch manual override dan news blackout system. Modal terlindungi bahkan di kondisi pasar ekstrem.' },
  { q: 'Apa beda Signal Basic vs Signal VIP?', a: 'Basic: signal harian + weekly report + dashboard. VIP: real-time alerts via Telegram VIP group dengan commentary live, daily detailed report, priority support, plus strategy deep-dive notes. Keduanya termasuk dashboard access.' },
  { q: 'Bagaimana penanganan slippage dan rejected orders?', a: 'ZeroMQ execution bridge kami operasi sub-2ms untuk minimize slippage. Setiap trade punya deterministic slippage budget — kalau slippage melebihi threshold, order otomatis di-reject. Semua di-log dan auditable.' },
];

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

  // Use CMS testimonials if available, otherwise empty
  const displayTestimonials = testimonials?.length > 0 ? testimonials : [];
  // Use CMS FAQs if available, otherwise use defaults
  const displayFaqs = faqs?.length > 0
    ? faqs.map(f => ({ q: f.question, a: f.answer }))
    : FAQ_ITEMS;

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
      <section className="relative min-h-screen flex items-center">
        {/* Subtle grid background */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(245,245,247,1) 1px, transparent 1px), linear-gradient(90deg, rgba(245,245,247,1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        <div className="container-default w-full px-4 sm:px-6 py-16 sm:py-20 lg:py-24 relative z-10">
          <div className="grid lg:grid-cols-5 gap-16 lg:gap-20 items-center">
            {/* Left column — Copy */}
            <div className="lg:col-span-3">
              <AnimatedSection>
                <div className="t-eyebrow mb-6">
                  CV BABAH DIGITAL &middot; QUANTITATIVE INFRASTRUCTURE
                </div>
              </AnimatedSection>

              <AnimatedSection delay={0.1}>
                <h1 className="t-display-hero text-foreground mb-8">
                  {hero?.title || (<>Capital, with<br />conviction.</>)}
                </h1>
              </AnimatedSection>

              <AnimatedSection delay={0.2}>
                <p className="t-lead text-muted-foreground max-w-lg mb-10">
                  {hero?.subtitle || 'Sistem trading kuantitatif yang diaudit, dieksekusi, dan dijaga oleh disiplin — bukan emosi.'}
                </p>
              </AnimatedSection>

              <AnimatedSection delay={0.3}>
                <div className="flex flex-wrap gap-4 mb-16">
                  <Link href="/contact" className="btn-primary">
                    Schedule a briefing
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link href="/performance" className="btn-tertiary">
                    View track record
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              </AnimatedSection>
            </div>

            {/* Right column — Mini equity curve card */}
            <div className="lg:col-span-2">
              <AnimatedSection delay={0.35}>
                <div className="card-enterprise">
                  <div className="flex items-center justify-between mb-4">
                    <div className="t-eyebrow">{filteredEquity.length > 0 ? 'EQUITY CURVE' : 'PROJEKSI BACKTEST'}</div>
                    {filteredEquity.length > 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider text-data-positive bg-data-positive/10 ring-1 ring-data-positive/20">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-data-positive opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-data-positive" />
                        </span>
                        Live
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider text-amber-400 bg-amber-500/10 ring-1 ring-amber-500/30">
                        Beta
                      </span>
                    )}
                  </div>
                  <EquityCurve
                    data={filteredEquity.slice(-30)}
                    height={210}
                    periods={[]}
                    activePeriod="30D"
                  />
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <div>
                      <div className="text-xs text-muted-foreground">
                        {filteredEquity.length > 0
                          ? 'Verified · 90D'
                          : 'Track record live · Q3 2026'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-lg font-medium text-amber-400">{kpi.sharpeRatio}</div>
                      <div className="text-xs text-muted-foreground">Sharpe Ratio</div>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            </div>
          </div>

          {/* KPI Strip — factual capability claims (no fake metrics) */}
          <AnimatedSection delay={0.4}>
            <div className="mt-16 pt-12 border-t border-border">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-16">
                <KpiItem
                  label="STRATEGI AKTIF"
                  value="6"
                  sublabel="SMC · Wyckoff · Astronacci · AI Momentum · Mean-Rev · Oil/Gas"
                />
                <KpiItem
                  label="ASET TERSUPPORT"
                  value="14+"
                  sublabel="Forex Major · Metal · Index · Crypto Binance"
                />
                <KpiItem
                  label="LAPISAN RISIKO"
                  value="12"
                  sublabel="Pre-trade · In-trade · Post-system framework"
                />
                <KpiItem
                  label="PROGRAM"
                  value="BETA"
                  sublabel="Free akses untuk founding members"
                />
              </div>
            </div>
          </AnimatedSection>

          {/* Tech trust strip */}
          <AnimatedSection delay={0.45}>
            <div className="mt-12 flex items-center gap-6 text-xs text-muted-foreground">
              <span className="uppercase tracking-wider">Built on</span>
              <span className="font-mono">MetaTrader 5</span>
              <span className="w-px h-3 bg-border" />
              <span className="font-mono">ZeroMQ</span>
              <span className="w-px h-3 bg-border" />
              <span className="font-mono">PostgreSQL</span>
              <span className="w-px h-3 bg-border" />
              <span className="font-mono">Cloudflare</span>
            </div>
          </AnimatedSection>
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
                  <span className="t-eyebrow text-amber-400">FOUNDING MEMBERS BETA</span>
                </div>
                <h2 className="t-display-section text-foreground mb-4">
                  {betaSection.title}
                </h2>
                <p className="t-lead text-muted-foreground max-w-2xl mb-6">
                  {betaSection.subtitle ?? 'Kami sedang fase beta. Track record live akan dipublikasi setelah 90 hari operasi produksi.'}
                </p>
                <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-2 mb-8 max-w-2xl">
                  <li className="flex items-start gap-2 t-body-sm text-foreground/80">
                    <Check className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    Akses Forex Robot + Crypto Robot
                  </li>
                  <li className="flex items-start gap-2 t-body-sm text-foreground/80">
                    <Check className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    Telegram channel founding members
                  </li>
                  <li className="flex items-start gap-2 t-body-sm text-foreground/80">
                    <Check className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    Lock-in harga Phase 1 setelah beta
                  </li>
                  <li className="flex items-start gap-2 t-body-sm text-foreground/80">
                    <Check className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    Direct line ke tim engineering
                  </li>
                </ul>
              </AnimatedSection>
            </div>
            <div className="lg:col-span-5">
              <AnimatedSection delay={0.15}>
                <div className="rounded-xl border border-amber-500/30 bg-card p-6 md:p-8">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="font-mono text-3xl font-semibold text-amber-400">
                      {(betaSection.content as Record<string, unknown>)?.priceLabel as string ?? 'Gratis'}
                    </span>
                    <span className="t-body-sm text-muted-foreground">
                      {(betaSection.content as Record<string, unknown>)?.priceSubtext as string ?? 'selama beta'}
                    </span>
                  </div>
                  <p className="t-body-sm text-muted-foreground mb-6">
                    Tidak ada biaya bulanan, tidak ada minimum deposit. Modal tetap di akun broker
                    atau Binance Anda — kami tidak custody dana sama sekali.
                  </p>
                  <Link
                    href={(betaSection.content as Record<string, unknown>)?.ctaHref as string ?? '/contact?subject=beta-founding-member'}
                    className="btn-primary w-full justify-center"
                  >
                    {(betaSection.content as Record<string, unknown>)?.ctaLabel as string ?? 'Daftar founding member'}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <p className="text-[11px] text-muted-foreground/80 italic mt-4 text-center">
                    Slot terbatas. Verifikasi manual oleh tim kami.
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
          eyebrow="HIGHLIGHT"
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
            <div className="t-eyebrow mb-4">PRODUK</div>
            <h2 className="t-display-section text-foreground mb-4">
              {productsSection.title}
            </h2>
            <p className="t-lead text-muted-foreground max-w-2xl mb-12">
              {productsSection.subtitle ?? 'Mesin trading otomatis untuk dua kelas aset, dibangun di atas framework risiko 12-layer yang sama.'}
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-6">
            <ProductCard
              icon={<TrendingUp className="w-6 h-6" />}
              eyebrow="ROBOT FOREX"
              title="Forex · Metal · Index"
              tagline="MetaTrader 5 bridge dengan eksekusi sub-2ms ZeroMQ"
              bullets={[
                'Forex Major + Cross + Metal (Gold, Silver)',
                'Strategi: SMC · Wyckoff · Astronacci · AI Momentum',
                'Tier Starter $19 → VIP $299 / bulan',
                'Eksekusi via Exness partner broker',
              ]}
              href="/solutions/signal"
              ctaLabel="Lihat detail Robot Forex"
            />
            <ProductCard
              icon={<Bitcoin className="w-6 h-6" />}
              eyebrow="ROBOT CRYPTO"
              title="Binance Spot + Futures"
              tagline="Auto-trading dengan API key Anda — modal tetap di Binance"
              bullets={[
                'Spot + USDT-M Futures',
                'Multi-strategi: scalping_momentum · SMC · Mean-Rev',
                'Tier Basic $49 → HNWI $499 / bulan + performance fee',
                'Tidak ada custody dana, tidak ada withdraw permission',
              ]}
              href="/solutions/crypto"
              ctaLabel="Lihat detail Robot Crypto"
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
            <div className="t-eyebrow mb-4">TRACK RECORD</div>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10">
              <div>
                <h2 className="t-display-section text-foreground mb-2">
                  {perfSource === 'empty' || filteredEquity.length === 0
                    ? 'Sedang beta — track record live setelah 90 hari operasi.'
                    : (perf?.title || 'Real money. Real audits.')}
                </h2>
                <p className="t-body-sm text-muted-foreground">
                  {perfSource === 'empty' || filteredEquity.length === 0
                    ? 'Kami publikasi equity statement dan KPI hanya setelah produksi live ≥90 hari. Tidak ada angka palsu.'
                    : 'Verified · Production account · Updated every 4 hours'}
                </p>
              </div>
              {filteredEquity.length > 0 && (
                <Link
                  href="/performance"
                  className="btn-tertiary mt-4 md:mt-0"
                >
                  Full performance details
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
                    <div className="t-eyebrow mb-3">TOTAL RETURN</div>
                    <div className="t-data-kpi text-amber-400">{kpi.totalReturn}</div>
                    <div className="t-body-sm text-muted-foreground mt-2">sejak akun aktif</div>
                  </div>
                  <div className="kpi-card">
                    <div className="t-eyebrow mb-3">MAX DRAWDOWN</div>
                    <div className="t-data-kpi text-data-negative">{kpi.maxDrawdown}</div>
                    <div className="t-body-sm text-muted-foreground mt-2">peak-to-trough</div>
                  </div>
                  <div className="kpi-card">
                    <div className="t-eyebrow mb-3">SHARPE RATIO</div>
                    <div className="t-data-kpi text-amber-400">{kpi.sharpeRatio}</div>
                    <div className="t-body-sm text-muted-foreground mt-2">rolling 1y</div>
                  </div>
                  <div className="kpi-card">
                    <div className="t-eyebrow mb-3">PROFIT FACTOR</div>
                    <div className="t-data-kpi text-amber-400">{kpi.profitFactor}</div>
                    <div className="t-body-sm text-muted-foreground mt-2">wins / losses</div>
                  </div>
                  <div className="kpi-card">
                    <div className="t-eyebrow mb-3">WIN RATE</div>
                    <div className="t-data-kpi text-foreground">{kpi.winRate}</div>
                    <div className="t-body-sm text-muted-foreground mt-2">closed trades</div>
                  </div>
                </div>
              </AnimatedSection>

              <div className="mt-6 text-xs text-muted-foreground italic">
                Past performance does not guarantee future results. Verified equity statements
                available on request.
              </div>
            </>
          ) : (
            // Honest empty state — no fake numbers, no fake chart, just transparent timeline
            <AnimatedSection delay={0.1}>
              <div className="rounded-xl border border-border/80 bg-card p-8 md:p-12">
                <div className="grid md:grid-cols-3 gap-8">
                  <div>
                    <div className="t-eyebrow text-amber-400 mb-3">FASE SEKARANG</div>
                    <div className="font-display text-2xl text-foreground mb-2">Beta Tertutup</div>
                    <p className="t-body-sm text-muted-foreground">
                      Founding members trading dengan modal mereka sendiri. Kami kumpulkan data
                      eksekusi real-money sebelum publikasi.
                    </p>
                  </div>
                  <div className="md:border-l md:border-border/60 md:pl-8">
                    <div className="t-eyebrow text-amber-400 mb-3">90 HARI KE DEPAN</div>
                    <div className="font-display text-2xl text-foreground mb-2">Soft Launch</div>
                    <p className="t-body-sm text-muted-foreground">
                      Equity statement, max drawdown, win rate, dan Sharpe ratio rolling akan
                      dipublikasi mulai dari Q3 2026.
                    </p>
                  </div>
                  <div className="md:border-l md:border-border/60 md:pl-8">
                    <div className="t-eyebrow text-amber-400 mb-3">AUDIT POLICY</div>
                    <div className="font-display text-2xl text-foreground mb-2">Independen</div>
                    <p className="t-body-sm text-muted-foreground">
                      Equity statement diaudit pihak ketiga. Tersedia atas permintaan untuk
                      institutional inquiry.
                    </p>
                  </div>
                </div>
                <div className="border-t border-border/60 mt-8 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <p className="t-body-sm text-muted-foreground">
                    Mau melihat live demo dengan akun simulasi?
                  </p>
                  <Link href="/demo" className="btn-tertiary shrink-0">
                    Akses demo gratis
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
              <p className="mt-4 text-xs text-muted-foreground italic">
                Kami menolak menampilkan chart simulasi atau angka backtest sebagai &ldquo;track
                record&rdquo;. Kinerja masa lalu — termasuk simulasi — tidak menjamin hasil masa
                depan.
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
            <div className="t-eyebrow mb-4">PLATFORM</div>
            <h2 className="t-display-section text-foreground mb-4">Built on three pillars.</h2>
            <p className="t-lead text-muted-foreground max-w-2xl mb-16">
              Every trade passes through intelligence, execution, and risk control — in that order, every time.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-6">
            <PillarCard
              icon={<Brain className="w-6 h-6" />}
              eyebrow="INTELLIGENCE"
              title="AI Confluence Engine"
              description="Multi-timeframe scoring across H4, H1, M15, M5 confluence. Gemini 2.5 Flash advisory layer validates every signal."
              href="/platform/technology"
              linkLabel="Read technical brief"
            />
            <PillarCard
              icon={<Zap className="w-6 h-6" />}
              eyebrow="EXECUTION"
              title="Sub-2ms Bridge"
              description="ZeroMQ-based execution to MT5. Deterministic slippage budget. Verifiable execution logs for every order."
              href="/platform/execution"
              linkLabel="See architecture"
            />
            <PillarCard
              icon={<Shield className="w-6 h-6" />}
              eyebrow="RISK CONTROL"
              title="12-Layer Framework"
              description="Catastrophic breaker, daily DD guard, news blackout, kill-switch. Risk control isn't a feature — it's the substrate."
              href="/platform/risk-framework"
              linkLabel="See framework"
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
            <div className="t-eyebrow mb-4">RISK FRAMEWORK</div>
            <h2 className="t-display-section text-foreground mb-2">12 layers, every trade.</h2>
            <p className="t-lead text-muted-foreground max-w-2xl mb-16">
              Risk control isn&apos;t a feature — it&apos;s the substrate every strategy runs on.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8">
            <RiskPhase title="PRE-TRADE" layers={RISK_LAYERS.preTrade} />
            <RiskPhase title="IN-TRADE" layers={RISK_LAYERS.inTrade} />
            <RiskPhase title="POST / SYSTEM" layers={RISK_LAYERS.postSystem} />
          </div>

          <AnimatedSection delay={0.3}>
            <div className="mt-12 text-center">
              <Link href="/platform/risk-framework" className="btn-tertiary">
                Read the full risk framework
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
                <div className="t-eyebrow mb-4">PRICING</div>
                <h2 className="t-display-section text-foreground mb-4">Choose your path.</h2>
                <p className="t-body text-muted-foreground mb-8">
                  Three engagement models, each designed for a different type of capital.
                </p>
              </AnimatedSection>

              {/* Tab bar — vertical on desktop */}
              <AnimatedSection delay={0.1}>
                <div className="flex lg:flex-col gap-2 mb-8 lg:mb-10">
                  {PRICING_TABS.map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        pricingTab === tab.id
                          ? 'bg-amber-500 text-black'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                      onClick={() => setPricingTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <Link href="/pricing" className="btn-tertiary text-sm hidden lg:inline-flex">
                  Compare all plans <ArrowRight className="w-4 h-4" />
                </Link>
              </AnimatedSection>
            </div>

            {/* Right column — pricing cards */}
            <div className="lg:col-span-8">
              <div className="space-y-6">
                {(PRICING_PLANS[pricingTab] || []).map((plan, i) => (
                  <AnimatedSection key={plan.name} delay={0.15 + i * 0.1}>
                    <div className={`rounded-xl p-6 sm:p-8 transition-all duration-300 border ${
                      plan.popular
                        ? 'border-amber-500 ring-1 ring-amber-500'
                        : 'border-border/60 hover:border-amber-500/30'
                    }`}>
                      {/* Card header — horizontal layout */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-medium text-foreground">{plan.name}</h3>
                            {plan.popular && (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-black text-[11px] font-medium tracking-wider uppercase">
                                Popular
                              </span>
                            )}
                          </div>
                          <p className="t-body-sm text-muted-foreground">{plan.tagline}</p>
                        </div>
                        <div className="flex items-baseline gap-1 sm:text-right shrink-0">
                          <span className="font-mono text-3xl font-semibold text-foreground">{plan.price}</span>
                          <span className="t-body-sm text-muted-foreground">/{plan.period}</span>
                        </div>
                      </div>

                      {/* Features + CTA — horizontal on larger screens */}
                      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
                        <ul className="flex flex-wrap gap-x-6 gap-y-2">
                          {plan.features.map(f => (
                            <li key={f} className="flex gap-2 t-body-sm">
                              <Check className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                              <span className="text-foreground/85">{f}</span>
                            </li>
                          ))}
                        </ul>
                        <Link
                          href={plan.cta.href}
                          className={`shrink-0 text-center ${plan.popular ? 'btn-primary' : 'btn-secondary'} justify-center`}
                        >
                          {plan.cta.label}
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </AnimatedSection>
                ))}
              </div>

              {/* VPS Enterprise CTA */}
              {pricingTab === 'retail' && (
                <AnimatedSection delay={0.3}>
                  <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="font-medium text-foreground mb-1">Need a dedicated VPS deployment?</div>
                      <div className="t-body-sm text-muted-foreground">Custom installation with private infrastructure. From $3,000.</div>
                    </div>
                    <Link href="/solutions/license" className="btn-tertiary shrink-0">
                      Speak with our team
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </AnimatedSection>
              )}

              {/* Mobile: compare all plans link */}
              <div className="mt-6 lg:hidden">
                <Link href="/pricing" className="btn-tertiary text-sm">
                  Compare all plans <ArrowRight className="w-4 h-4" />
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
              <div className="t-eyebrow mb-4">CLIENTS</div>
              <h2 className="t-display-section text-foreground mb-16">What our partners say.</h2>
            </AnimatedSection>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayTestimonials.slice(0, 3).map((t, i) => (
                <AnimatedSection key={t.id} delay={0.1 + i * 0.1}>
                  <div className="card-enterprise p-8 h-full flex flex-col">
                    <blockquote className="t-lead text-foreground/90 italic flex-1 mb-6">
                      &ldquo;{t.content}&rdquo;
                    </blockquote>
                    <div className="border-t border-border/60 pt-4">
                      <div className="font-medium text-foreground">{t.name}</div>
                      {t.role && <div className="t-body-sm text-muted-foreground">{t.role}</div>}
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
              <div className="t-eyebrow mb-4">DIBANGUN DI ATAS</div>
              <h2 className="t-display-section text-foreground mb-4">
                Stack institusional, bukan kemasan.
              </h2>
              <p className="t-lead text-muted-foreground max-w-2xl mb-12">
                Kami belum menampilkan testimoni — slot founding member baru dibuka. Sebelum itu,
                kepercayaan berdiri di atas teknologi, partner, dan disiplin kami.
              </p>
            </AnimatedSection>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <TrustCard
                eyebrow="EKSEKUSI"
                title="MetaTrader 5 + ZeroMQ"
                description="Bridge native ke MT5 lewat ZeroMQ. Setiap order ber-deterministic slippage budget dan ter-log untuk audit."
              />
              <TrustCard
                eyebrow="BROKER"
                title="Exness Partner"
                description="Eksekusi via partner broker teregulasi (FCA, CySEC, FSCA). Modal di akun broker Anda — tidak ada custody dana."
              />
              <TrustCard
                eyebrow="CRYPTO"
                title="Binance API"
                description="Read + Trade scope only — kami tidak meminta withdraw permission. Modal tetap di Binance Anda."
              />
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="t-eyebrow text-amber-400 mb-2">UNDANGAN</p>
                <p className="t-body text-foreground">
                  Founding members feedback masuk langsung ke roadmap engineering kami.
                </p>
              </div>
              <Link href="/contact?subject=beta-founding-member" className="btn-primary shrink-0">
                Daftar founding member
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
              <div className="t-eyebrow mb-4">FAQ</div>
              <h2 className="t-display-section text-foreground mb-2">Common questions.</h2>
              <p className="t-body text-muted-foreground">
                Can&apos;t find what you&apos;re looking for?
              </p>
            </AnimatedSection>
            <AnimatedSection delay={0.1}>
              <Link href="/contact" className="btn-tertiary shrink-0">
                Schedule a 30-min briefing
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
            <div className="t-eyebrow mb-6">GET STARTED</div>
            <h2 className="t-display-section text-foreground mb-6">
              The next step is a conversation.
            </h2>
            <p className="t-lead text-muted-foreground mb-12">
              A 30-minute briefing with our team to walk through the platform, framework, and fit for your capital.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.15}>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <Link href="/contact" className="btn-primary">
                Schedule a briefing
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/performance" className="btn-secondary">
                View track record
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
            <p className="t-body-sm text-muted-foreground">
              No commitment. No fee. No high-pressure sales.
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

function KpiItem({ label, value, sublabel }: { label: string; value: string; sublabel: string }) {
  return (
    <div>
      <div className="t-eyebrow mb-2">{label}</div>
      <div className="font-mono text-2xl md:text-3xl font-medium text-foreground tabular-nums">{value}</div>
      <div className="t-body-sm text-muted-foreground mt-1">{sublabel}</div>
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
