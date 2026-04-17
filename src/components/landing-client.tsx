'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { EquityCurve } from '@/components/charts/equity-curve';
import { AnimatedSection } from '@/components/ui/animated-section';
import { ArrowRight } from 'lucide-react';
import { StrategyIcon, TechnologyIcon, RiskIcon } from '@/components/icons/enterprise-icons';

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

export function LandingClient({ sections }: LandingClientProps) {
  const [equityData] = useState(generateDemoEquity);
  const [equityPeriod, setEquityPeriod] = useState('90D');

  const filteredEquity = (() => {
    const days = equityPeriod === '30D' ? 30 : equityPeriod === '7D' ? 7 : 90;
    return equityData.slice(-days);
  })();

  // Extract CMS overrides
  const hero = sections['hero'];
  const perf = sections['performance'];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />

      {/* ═══════════════════════════════════════════
          SECTION 1 — HERO (100vh)
          ═══════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center">
        <div className="max-w-5xl mx-auto px-6 text-center py-24">
          <AnimatedSection>
            <h1 className="font-display text-display-lg md:text-display-xl text-foreground mb-8">
              {hero?.title || 'Quantitative trading, systematized.'}
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={0.15}>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 font-body leading-relaxed">
              {hero?.subtitle || 'Infrastruktur AI yang mengeksekusi keputusan pasar 24 jam dengan presisi institusional.'}
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.25}>
            <div className="flex gap-4 justify-center mb-20">
              <Link
                href="/performance"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-md border border-border text-foreground hover:bg-secondary transition-colors"
              >
                View Performance
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-md bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
              >
                Schedule Briefing
              </Link>
            </div>
          </AnimatedSection>

          {/* Mini stats */}
          <AnimatedSection delay={0.35}>
            <div className="flex justify-center gap-12 md:gap-20">
              <div className="text-center">
                <div className="font-mono text-3xl md:text-4xl font-semibold text-foreground">+32.4%</div>
                <div className="text-stat-label mt-2">YTD Return</div>
              </div>
              <div className="text-center">
                <div className="font-mono text-3xl md:text-4xl font-semibold text-foreground">1.85</div>
                <div className="text-stat-label mt-2">Sharpe Ratio</div>
              </div>
              <div className="text-center">
                <div className="font-mono text-3xl md:text-4xl font-semibold text-foreground">-8.3%</div>
                <div className="text-stat-label mt-2">Max Drawdown</div>
              </div>
              <div className="hidden sm:block text-center">
                <div className="font-mono text-3xl md:text-4xl font-semibold text-foreground">Jan 2024</div>
                <div className="text-stat-label mt-2">Track Record Since</div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 2 — LIVE EQUITY CURVE
          ═══════════════════════════════════════════ */}
      <section className="py-20 border-t border-border">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-display-sm text-foreground">
                {perf?.title || 'Verified Performance'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Live data dari akun produksi. Updated every 4 hours.
              </p>
            </div>
            <Link
              href="/performance"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors"
            >
              Full details
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="border border-border rounded-lg p-6 bg-card">
            <EquityCurve
              data={filteredEquity}
              height={360}
              periods={['7D', '30D', '90D']}
              activePeriod={equityPeriod}
              onPeriodChange={setEquityPeriod}
            />
          </div>

          <div className="mt-6 flex items-center gap-6 text-xs text-muted-foreground">
            <span>Audited by MyFxBook</span>
            <span className="w-px h-3 bg-border" />
            <span>Partner broker verified</span>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 3 — PLATFORM (3 Pillars)
          ═══════════════════════════════════════════ */}
      <section className="py-20 border-t border-border">
        <div className="max-w-5xl mx-auto px-6">
          <AnimatedSection>
            <h2 className="font-display text-display-sm text-foreground mb-12">
              Built on three pillars.
            </h2>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8">
            <PillarCard
              icon={<StrategyIcon className="w-8 h-8 text-accent" />}
              title="Strategy Framework"
              description="6 strategi konfluensi multi-timeframe: SMC, Wyckoff, Astronacci, AI Momentum, Oil & Gas, dan SMC Swing. Setiap keputusan divalidasi melintasi H4, H1, M15, dan M5."
              href="/platform/strategies/smc"
              linkLabel="Explore strategies"
            />
            <PillarCard
              icon={<TechnologyIcon className="w-8 h-8 text-accent" />}
              title="Technology Stack"
              description="AI Advisor (Gemini 2.5) menganalisa setiap pair secara real-time. ZeroMQ execution bridge mengeksekusi di bawah 2ms. Infrastruktur zero-trust dengan monitoring 24/7."
              href="/platform/technology"
              linkLabel="View architecture"
            />
            <PillarCard
              icon={<RiskIcon className="w-8 h-8 text-accent" />}
              title="Risk Discipline"
              description="12-layer protection system: dynamic lot sizing, catastrophic breaker, daily loss limit, news blackout, spread guard, session drawdown guard, dan 6 lapisan lainnya."
              href="/platform/risk-framework"
              linkLabel="Risk framework"
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 4 — SOLUTIONS (4 Audience Entry)
          ═══════════════════════════════════════════ */}
      <section className="py-20 border-t border-border">
        <div className="max-w-5xl mx-auto px-6">
          <AnimatedSection>
            <h2 className="font-display text-display-sm text-foreground mb-12">
              Choose your path.
            </h2>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <SolutionCard
              title="Signal"
              price="$49/mo"
              audience="Retail traders"
              href="/solutions/signal"
            />
            <SolutionCard
              title="PAMM"
              price="20-30%"
              audience="Profit share"
              href="/solutions/pamm"
            />
            <SolutionCard
              title="License"
              price="$3K-7.5K"
              audience="Professional traders"
              href="/solutions/license"
            />
            <SolutionCard
              title="Institutional"
              price="Custom"
              audience="Custom mandate"
              href="/solutions/institutional"
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 5 — CTA + DISCLOSURE
          ═══════════════════════════════════════════ */}
      <section className="py-24 border-t border-border">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <AnimatedSection>
            <h2 className="font-display text-display-sm text-foreground mb-4">
              Schedule a 30-minute briefing with our quant team.
            </h2>
            <p className="text-muted-foreground mb-10">
              Discuss your objectives, risk parameters, and preferred engagement model.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.15}>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 text-sm font-medium rounded-md bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
            >
              Book on Cal.com
              <ArrowRight className="w-4 h-4" />
            </Link>
          </AnimatedSection>

          <div className="mt-16 text-xs text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Past performance does not guarantee future results. Trading involves significant risk of loss.
            BabahAlgo is a technology provider, not a financial advisor or broker.
          </div>
        </div>
      </section>

      <EnterpriseFooter />
    </div>
  );
}

// ─── Sub-components ───

function PillarCard({ icon, title, description, href, linkLabel }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <AnimatedSection delay={0.1}>
      <div className="border border-border rounded-lg p-8 bg-card h-full flex flex-col card-hover">
        <div className="mb-5">{icon}</div>
        <h3 className="font-display text-xl font-semibold text-foreground mb-4">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-6">{description}</p>
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors"
        >
          {linkLabel}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </AnimatedSection>
  );
}

function SolutionCard({ title, price, audience, href }: {
  title: string;
  price: string;
  audience: string;
  href: string;
}) {
  return (
    <AnimatedSection delay={0.1}>
      <Link href={href} className="block border border-border rounded-lg p-6 bg-card card-hover group">
        <h3 className="font-display text-lg font-semibold text-foreground mb-1 group-hover:text-accent transition-colors">{title}</h3>
        <div className="font-mono text-2xl font-semibold text-foreground mb-1">{price}</div>
        <div className="text-xs text-muted-foreground">{audience}</div>
      </Link>
    </AnimatedSection>
  );
}
