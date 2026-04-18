'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { EquityCurve } from '@/components/charts/equity-curve';
import { AnimatedSection } from '@/components/ui/animated-section';
import { ArrowRight, ArrowUpRight, Shield, Zap, Brain, ChevronDown, Check } from 'lucide-react';

// ─── Demo equity data generator ───
function generateDemoEquity(): { time: string; value: number }[] {
  const data: { time: string; value: number }[] = [];
  let value = 10000;
  const now = new Date();
  for (let i = 90; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    value += (Math.random() - 0.38) * 110;
    if (value < 8500) value = 8500 + Math.random() * 200;
    data.push({ time: d.toISOString().split('T')[0], value: Math.round(value * 100) / 100 });
  }
  return data;
}

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
  { id: 'retail', label: 'Retail Trader' },
  { id: 'investor', label: 'Investor' },
  { id: 'institutional', label: 'Institutional' },
];

const PRICING_PLANS: Record<string, Array<{
  name: string; tier: string; price: string; period: string;
  tagline: string; features: string[]; cta: { label: string; href: string };
  popular?: boolean;
}>> = {
  retail: [
    {
      name: 'Signal Standard', tier: 'SIGNAL', price: '$49', period: 'mo',
      tagline: 'Daily trading signals with analysis',
      features: ['Daily signal alerts', 'Weekly performance report', 'Client dashboard access', 'Email support'],
      cta: { label: 'Start Signal', href: '/register/signal' },
    },
    {
      name: 'Signal Pro', tier: 'SIGNAL PRO', price: '$149', period: 'mo',
      tagline: 'Real-time alerts with priority access',
      features: ['Real-time signal alerts', 'Daily detailed reports', 'VIP Telegram group', 'Priority support', 'Strategy deep-dives'],
      cta: { label: 'Start Pro', href: '/register/signal' },
      popular: true,
    },
  ],
  investor: [
    {
      name: 'PAMM Standard', tier: 'PAMM', price: '20%', period: 'profit share',
      tagline: 'Managed account with verified performance',
      features: ['Fully managed trading', 'Verified track record', 'Monthly statements', 'Capital withdrawal anytime', 'Dedicated account manager'],
      cta: { label: 'Apply for PAMM', href: '/register/pamm' },
    },
    {
      name: 'PAMM Premier', tier: 'PAMM PRO', price: '30%', period: 'profit share',
      tagline: 'Premium allocation with enhanced reporting',
      features: ['All Standard features', 'Daily performance updates', 'Custom risk parameters', 'Direct line to quant team', 'Quarterly review calls'],
      cta: { label: 'Apply Premier', href: '/register/pamm' },
      popular: true,
    },
  ],
  institutional: [
    {
      name: 'Managed Account', tier: 'INSTITUTIONAL', price: '$250K', period: 'minimum',
      tagline: 'Dedicated mandate with custom parameters',
      features: ['Custom strategy allocation', 'Dedicated VPS deployment', 'Full audit trail access', 'Custom risk framework', 'SLA-backed uptime'],
      cta: { label: 'Schedule briefing', href: '/contact' },
    },
    {
      name: 'API Access', tier: 'API', price: 'Custom', period: 'usage-based',
      tagline: 'Direct API integration for your infrastructure',
      features: ['REST + WebSocket API', 'Signal streaming', 'Custom integration support', 'Dedicated engineering contact', 'White-label available'],
      cta: { label: 'Speak with IR', href: '/register/institutional' },
    },
  ],
};

// ─── FAQ Data ───
const FAQ_ITEMS = [
  { q: 'How can I verify your track record?', a: 'Our equity statements are independently verified and available on request. We use live production accounts with partner brokers. You can schedule a briefing to review our complete audit trail, including trade-by-trade history.' },
  { q: 'Is BabahAlgo regulated?', a: 'CV Babah Digital is a registered technology company in Indonesia. We are a technology provider — not a broker, financial advisor, or asset manager. All trading is executed through regulated partner brokers. We operate with full transparency and provide audit reports on request.' },
  { q: 'What happens during a flash crash or black swan event?', a: 'Our 12-layer risk framework includes a catastrophic breaker that automatically shuts down all trading when drawdown exceeds a critical threshold. Combined with the kill-switch (manual override) and news blackout system, capital is protected even in extreme market conditions.' },
  { q: 'Can I withdraw my capital at any time?', a: 'Yes. For PAMM accounts, withdrawal requests are processed within your broker\'s standard timeline (typically 1-3 business days). There are no lock-up periods. For signal subscriptions, you can cancel anytime — your capital remains in your own broker account at all times.' },
  { q: 'What is the difference between Signal Standard and Pro?', a: 'Signal Standard provides daily trading signals with weekly reports. Signal Pro adds real-time alerts, a dedicated VIP Telegram group with live commentary, daily detailed reports, and priority support. Both include dashboard access.' },
  { q: 'Can I see live positions from the bot?', a: 'PAMM and VPS License clients have real-time dashboard access showing live positions, equity curve, and all risk metrics. Signal clients receive alerts at entry and exit points.' },
  { q: 'How do you handle slippage and rejected orders?', a: 'Our ZeroMQ execution bridge operates with sub-2ms latency to minimize slippage. Each trade includes a deterministic slippage budget — if slippage exceeds the threshold, the order is automatically rejected. This is logged and auditable.' },
];

export function LandingClient({ sections, testimonials, faqs }: LandingClientProps) {
  const [equityData] = useState(generateDemoEquity);
  const [equityPeriod, setEquityPeriod] = useState('90D');
  const [pricingTab, setPricingTab] = useState('retail');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const filteredEquity = (() => {
    const days = equityPeriod === '30D' ? 30 : equityPeriod === '7D' ? 7 : 90;
    return equityData.slice(-days);
  })();

  const hero = sections['hero'];
  const perf = sections['performance'];

  // Use CMS testimonials if available, otherwise empty
  const displayTestimonials = testimonials?.length > 0 ? testimonials : [];
  // Use CMS FAQs if available, otherwise use defaults
  const displayFaqs = faqs?.length > 0
    ? faqs.map(f => ({ q: f.question, a: f.answer }))
    : FAQ_ITEMS;

  return (
    <div className="min-h-screen bg-background text-foreground">
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

        <div className="container-default w-full px-6 py-24 relative z-10">
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
                    <div className="t-eyebrow">EQUITY CURVE</div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider text-data-positive bg-data-positive/10 ring-1 ring-data-positive/20">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-data-positive opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-data-positive" />
                      </span>
                      Live
                    </span>
                  </div>
                  <EquityCurve
                    data={filteredEquity.slice(-30)}
                    height={210}
                    periods={[]}
                    activePeriod="30D"
                  />
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/8">
                    <div>
                      <div className="text-xs text-ink-400">Verified &middot; 90D</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-lg font-medium text-amber-400">1.85</div>
                      <div className="text-xs text-ink-400">Sharpe Ratio</div>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            </div>
          </div>

          {/* KPI Strip */}
          <AnimatedSection delay={0.4}>
            <div className="mt-16 pt-12 border-t border-white/8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-16">
                <KpiItem label="YTD RETURN" value="+32.4%" sublabel="since Jan 2024" />
                <KpiItem label="STRATEGIES DEPLOYED" value="6" sublabel="Multi-strategy confluence" />
                <KpiItem label="EXECUTION LATENCY" value="<2ms" sublabel="ZeroMQ → MT5 bridge" />
                <KpiItem label="UPTIME" value="99.95%" sublabel="Cloudflare Tunnel" />
              </div>
            </div>
          </AnimatedSection>

          {/* Tech trust strip */}
          <AnimatedSection delay={0.45}>
            <div className="mt-12 flex items-center gap-6 text-xs text-ink-400">
              <span className="uppercase tracking-wider">Built on</span>
              <span className="font-mono">MetaTrader 5</span>
              <span className="w-px h-3 bg-white/10" />
              <span className="font-mono">ZeroMQ</span>
              <span className="w-px h-3 bg-white/10" />
              <span className="font-mono">PostgreSQL</span>
              <span className="w-px h-3 bg-white/10" />
              <span className="font-mono">Cloudflare</span>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 2 — TRACK RECORD
          ═══════════════════════════════════════════ */}
      <section className="section-padding border-t border-white/8">
        <div className="container-default px-6">
          <AnimatedSection>
            <div className="t-eyebrow mb-4">TRACK RECORD</div>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10">
              <div>
                <h2 className="t-display-section text-foreground mb-2">
                  {perf?.title || 'Real money. Real audits.'}
                </h2>
                <p className="t-body-sm text-ink-400">
                  Verified &middot; Production account &middot; Updated every 4 hours
                </p>
              </div>
              <Link
                href="/performance"
                className="btn-tertiary mt-4 md:mt-0"
              >
                Full performance details
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </AnimatedSection>

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

          {/* KPI Grid */}
          <AnimatedSection delay={0.2}>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
              <div className="kpi-card">
                <div className="t-eyebrow mb-3">NET RETURN</div>
                <div className="t-data-kpi text-amber-400">+24.6%</div>
                <div className="t-body-sm text-ink-400 mt-2">since Jan 2024</div>
              </div>
              <div className="kpi-card">
                <div className="t-eyebrow mb-3">MAX DRAWDOWN</div>
                <div className="t-data-kpi text-data-negative">-8.3%</div>
                <div className="t-body-sm text-ink-400 mt-2">peak-to-trough</div>
              </div>
              <div className="kpi-card">
                <div className="t-eyebrow mb-3">SHARPE RATIO</div>
                <div className="t-data-kpi text-amber-400">1.85</div>
                <div className="t-body-sm text-ink-400 mt-2">90D rolling</div>
              </div>
              <div className="kpi-card">
                <div className="t-eyebrow mb-3">PROFIT FACTOR</div>
                <div className="t-data-kpi text-amber-400">2.14</div>
                <div className="t-body-sm text-ink-400 mt-2">wins / losses</div>
              </div>
              <div className="kpi-card">
                <div className="t-eyebrow mb-3">AVG HOLD</div>
                <div className="t-data-kpi text-foreground">47m</div>
                <div className="t-body-sm text-ink-400 mt-2">across 1,247 trades</div>
              </div>
            </div>
          </AnimatedSection>

          <div className="mt-6 text-xs text-ink-400 italic">
            Past performance does not guarantee future results. Verified equity statements available on request.
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 3 — THREE PILLARS
          ═══════════════════════════════════════════ */}
      <section className="section-padding border-t border-white/8">
        <div className="container-default px-6">
          <AnimatedSection>
            <div className="t-eyebrow mb-4">PLATFORM</div>
            <h2 className="t-display-section text-foreground mb-4">Built on three pillars.</h2>
            <p className="t-lead text-ink-400 max-w-2xl mb-16">
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
      <section className="section-padding border-t border-white/8">
        <div className="container-default px-6">
          <AnimatedSection>
            <div className="t-eyebrow mb-4">RISK FRAMEWORK</div>
            <h2 className="t-display-section text-foreground mb-2">12 layers, every trade.</h2>
            <p className="t-lead text-ink-400 max-w-2xl mb-16">
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
      <section className="section-padding border-t border-white/8">
        <div className="container-default px-6">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
            {/* Left column — heading, description, tabs */}
            <div className="lg:col-span-4 lg:sticky lg:top-28 lg:self-start">
              <AnimatedSection>
                <div className="t-eyebrow mb-4">PRICING</div>
                <h2 className="t-display-section text-foreground mb-4">Choose your path.</h2>
                <p className="t-body text-ink-400 mb-8">
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
                          : 'text-ink-400 hover:text-foreground hover:bg-white/[0.04]'
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
                        : 'border-white/8 hover:border-amber-500/30'
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
                          <p className="t-body-sm text-ink-500">{plan.tagline}</p>
                        </div>
                        <div className="flex items-baseline gap-1 sm:text-right shrink-0">
                          <span className="font-mono text-3xl font-semibold text-foreground">{plan.price}</span>
                          <span className="t-body-sm text-ink-400">/{plan.period}</span>
                        </div>
                      </div>

                      {/* Features + CTA — horizontal on larger screens */}
                      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
                        <ul className="flex flex-wrap gap-x-6 gap-y-2">
                          {plan.features.map(f => (
                            <li key={f} className="flex gap-2 t-body-sm">
                              <Check className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                              <span className="text-ink-300">{f}</span>
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
                      <div className="t-body-sm text-ink-400">Custom installation with private infrastructure. From $3,000.</div>
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
          SECTION 6 — TESTIMONIALS (if available)
          ═══════════════════════════════════════════ */}
      {displayTestimonials.length > 0 && (
        <section className="section-padding border-t border-white/8">
          <div className="container-default px-6">
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
                    <div className="border-t border-white/8 pt-4">
                      <div className="font-medium text-foreground">{t.name}</div>
                      {t.role && <div className="t-body-sm text-ink-400">{t.role}</div>}
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          SECTION 7 — FAQ
          ═══════════════════════════════════════════ */}
      <section className="section-padding border-t border-white/8">
        <div className="container-default px-6">
          {/* Header row — heading left, CTA right */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-12">
            <AnimatedSection>
              <div className="t-eyebrow mb-4">FAQ</div>
              <h2 className="t-display-section text-foreground mb-2">Common questions.</h2>
              <p className="t-body text-ink-400">
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
                <div className="py-5 border-b border-white/8">
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
                      <ChevronDown className={`w-5 h-5 text-ink-400 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                    </span>
                  </button>
                  {openFaq === i && (
                    <div className="mt-3 t-body-sm text-ink-400 leading-relaxed">
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
      <section className="relative section-padding border-t border-white/8">
        {/* Subtle amber radial glow */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full bg-amber-500/[0.04] blur-3xl" />
        </div>

        <div className="container-prose px-6 text-center relative z-10">
          <AnimatedSection>
            <div className="t-eyebrow mb-6">GET STARTED</div>
            <h2 className="t-display-section text-foreground mb-6">
              The next step is a conversation.
            </h2>
            <p className="t-lead text-ink-400 mb-12">
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
            <p className="t-body-sm text-ink-400">
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
      <div className="t-body-sm text-ink-400 mt-1">{sublabel}</div>
    </div>
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
        <p className="t-body text-ink-500 flex-1 mb-6">{description}</p>
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
                <span className="font-mono text-xs text-ink-400 mt-0.5 w-5 shrink-0">
                  {String(l.num).padStart(2, '0')}
                </span>
                <div>
                  <div className="text-sm font-medium text-foreground group-hover/layer:text-amber-400 transition-colors">
                    {l.name}
                  </div>
                  <div className="text-xs text-ink-400 mt-0.5">{l.desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}
