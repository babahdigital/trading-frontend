import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { Link } from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

const PILLARS = [
  {
    title: 'Strategy Framework',
    href: '/platform/strategies/smc',
    description:
      'Six independently validated strategies spanning Smart Money Concepts, Wyckoff accumulation-distribution, Astronacci harmonic geometry, AI-driven momentum, energy-sector macro plays, and multi-day SMC swing positioning. Each strategy operates on a strict multi-timeframe confluence model -- H4 for bias, H1 for structure, M15 for entry, M5 for precision -- ensuring that every trade is backed by layered confirmation across time horizons.',
  },
  {
    title: 'Technology Stack',
    href: '/platform/technology',
    description:
      'A purpose-built execution pipeline anchored by Gemini 2.5 Flash for real-time market analysis and confidence scoring, a ZeroMQ bridge delivering sub-2ms order routing, and MetaTrader 5 for broker connectivity. The entire stack runs on isolated VPS infrastructure behind Cloudflare Tunnel with zero-trust network policies, PostgreSQL for persistent state, and Docker for reproducible deployments.',
  },
  {
    title: 'Risk Discipline',
    href: '/platform/risk-framework',
    description:
      'Capital preservation is not a feature -- it is the architecture. Twelve independent risk layers operate simultaneously: dynamic lot sizing, catastrophic breakers, daily loss limits, spread guards, news blackout windows, session drawdown monitors, cooldown trackers, and more. No single failure can cascade into uncontrolled loss.',
  },
];

const INSTRUMENTS = [
  { ticker: 'EURUSD', assetClass: 'Forex', status: 'Active' },
  { ticker: 'GBPUSD', assetClass: 'Forex', status: 'Active' },
  { ticker: 'USDJPY', assetClass: 'Forex', status: 'Active' },
  { ticker: 'AUDUSD', assetClass: 'Forex', status: 'Active' },
  { ticker: 'USDCHF', assetClass: 'Forex', status: 'Active' },
  { ticker: 'NZDUSD', assetClass: 'Forex', status: 'Active' },
  { ticker: 'USDCAD', assetClass: 'Forex', status: 'Active' },
  { ticker: 'XAUUSD', assetClass: 'Metals', status: 'Active' },
  { ticker: 'XAGUSD', assetClass: 'Metals', status: 'Active' },
  { ticker: 'USOIL', assetClass: 'Energy', status: 'Active' },
  { ticker: 'UKOIL', assetClass: 'Energy', status: 'Active' },
  { ticker: 'XNGUSD', assetClass: 'Energy', status: 'Active' },
  { ticker: 'BTCUSD', assetClass: 'Crypto', status: 'Active' },
  { ticker: 'ETHUSD', assetClass: 'Crypto', status: 'Active' },
];

export default async function PlatformPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main className="max-w-4xl mx-auto px-6 py-20">
        {/* Hero */}
        <section className="mb-20">
          <h1 className="font-display text-display-lg md:text-display-xl text-foreground mb-6">
            The infrastructure behind every decision.
          </h1>
          <p className="text-muted-foreground leading-relaxed mb-8 max-w-2xl">
            BabahAlgo is a quantitative trading platform that combines multi-strategy
            execution, AI-driven analysis, and institutional-grade risk management into a
            single, auditable pipeline. Every component -- from signal generation to order
            routing -- is purpose-built for consistency, transparency, and capital preservation.
          </p>
        </section>

        {/* Pillars */}
        <section className="mb-20">
          <h2 className="font-display text-display-sm text-foreground mb-4">
            Three pillars
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-8">
            The platform is organized around three foundational disciplines. Each operates
            independently but reinforces the others.
          </p>
          <div className="space-y-6">
            {PILLARS.map((pillar) => (
              <div key={pillar.title} className="border border-border rounded-lg p-8 bg-card">
                <h3 className="font-display text-xl text-foreground mb-3">
                  {pillar.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  {pillar.description}
                </p>
                <Link
                  href={pillar.href}
                  className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors"
                >
                  Learn more <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Architecture */}
        <section className="mb-20">
          <h2 className="font-display text-display-sm text-foreground mb-4">
            Execution architecture
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-8">
            Every trade follows a deterministic pipeline with no manual intervention. The
            flow is linear and auditable at every stage.
          </p>
          <div className="border border-border rounded-lg p-8 bg-card">
            <div className="space-y-4 font-mono text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="text-accent font-semibold">1.</span>
                <span>Market Data Feeds</span>
                <span className="text-border">---&gt;</span>
                <span>Real-time tick aggregation and candle construction</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-accent font-semibold">2.</span>
                <span>AI Advisor</span>
                <span className="text-border">---&gt;</span>
                <span>Gemini 2.5 Flash analysis, confidence scoring, bias determination</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-accent font-semibold">3.</span>
                <span>Strategy Engine</span>
                <span className="text-border">---&gt;</span>
                <span>Multi-timeframe confluence check across active strategies</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-accent font-semibold">4.</span>
                <span>Risk Filter</span>
                <span className="text-border">---&gt;</span>
                <span>12-layer validation: lot sizing, drawdown, spread, session checks</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-accent font-semibold">5.</span>
                <span>ZeroMQ Bridge</span>
                <span className="text-border">---&gt;</span>
                <span>Sub-2ms order serialization and transmission</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-accent font-semibold">6.</span>
                <span>MetaTrader 5</span>
                <span className="text-border">---&gt;</span>
                <span>Order execution via broker liquidity pool</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-accent font-semibold">7.</span>
                <span>Broker</span>
                <span className="text-border">---&gt;</span>
                <span>Fill confirmation, position tracking, equity reconciliation</span>
              </div>
            </div>
          </div>
        </section>

        {/* Instruments */}
        <section className="mb-20">
          <h2 className="font-display text-display-sm text-foreground mb-4">
            Instruments coverage
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-8">
            14 instruments across four asset classes, selected for liquidity depth, spread
            efficiency, and strategy compatibility.
          </p>
          <div className="border border-border rounded-lg bg-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-sm font-semibold text-foreground px-6 py-3">
                    Ticker
                  </th>
                  <th className="text-left text-sm font-semibold text-foreground px-6 py-3">
                    Asset Class
                  </th>
                  <th className="text-right text-sm font-semibold text-foreground px-6 py-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {INSTRUMENTS.map((inst) => (
                  <tr key={inst.ticker} className="border-b border-border last:border-0">
                    <td className="font-mono text-sm px-6 py-3">{inst.ticker}</td>
                    <td className="text-sm text-muted-foreground px-6 py-3">
                      {inst.assetClass}
                    </td>
                    <td className="font-mono text-sm text-right px-6 py-3 text-accent">
                      {inst.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Link
              href="/platform/instruments"
              className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors"
            >
              View detailed instrument specifications <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* Downloads */}
        <section className="mb-20">
          <h2 className="font-display text-display-sm text-foreground mb-4">
            Documentation
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-8">
            Detailed methodology and technical documentation available for review.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-border rounded-lg p-8 bg-card">
              <h3 className="font-display text-lg text-foreground mb-2">
                Methodology PDF
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                Complete description of strategy logic, entry/exit criteria, backtesting
                methodology, and walk-forward validation results across all six strategies.
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground/50">
                Coming soon <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="border border-border rounded-lg p-8 bg-card">
              <h3 className="font-display text-lg text-foreground mb-2">
                Technical Whitepaper
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                Infrastructure architecture, security model, execution latency benchmarks,
                and risk framework formal specification.
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground/50">
                Coming soon <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
