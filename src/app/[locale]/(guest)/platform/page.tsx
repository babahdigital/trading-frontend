import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { Link } from '@/i18n/navigation';
import { getPageMetadata } from '@/lib/seo';
import { breadcrumbSchema, ldJson, organizationSchema, professionalServiceSchema } from '@/lib/seo-jsonld';

export async function generateMetadata() {
  return getPageMetadata('/platform', {
    title: 'Platform Overview — Quantitative Trading Infrastructure | BabahAlgo',
    description:
      'Tiga pilar BabahAlgo: AI Confluence Engine, Sub-2ms ZeroMQ Bridge, 12-Layer Risk Framework. Multi-strategi (SMC, Wyckoff, Momentum) untuk Forex + Crypto.',
  });
}
import { ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

const PILLARS = [
  {
    title: 'Strategy Framework',
    href: '/platform/strategies/smc',
    description:
      'Six independently validated strategies spanning Smart Money Concepts, Wyckoff accumulation-distribution, Astronacci harmonic geometry, AI-driven momentum, energy-sector macro plays, and multi-day SMC swing positioning. Each strategy operates on a strict multi-timeframe confluence model.',
  },
  {
    title: 'Technology Stack',
    href: '/platform/technology',
    description:
      'A purpose-built execution pipeline anchored by Gemini 2.5 Flash for real-time analysis and confidence scoring, a ZeroMQ bridge delivering sub-2ms order routing, and MetaTrader 5 for broker connectivity. The entire stack runs on isolated VPS infrastructure behind Cloudflare Tunnel.',
  },
  {
    title: 'Risk Discipline',
    href: '/platform/risk-framework',
    description:
      'Capital preservation is not a feature — it is the architecture. Twelve independent risk layers operate simultaneously: dynamic lot sizing, catastrophic breakers, daily loss limits, spread guards, news blackout windows, session drawdown monitors, and more.',
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

const PIPELINE_STEPS = [
  { step: 1, name: 'Market Data', desc: 'Real-time tick aggregation and candle construction' },
  { step: 2, name: 'AI Advisor', desc: 'Gemini 2.5 Flash analysis, confidence scoring, bias' },
  { step: 3, name: 'Strategy Engine', desc: 'Multi-timeframe confluence across active strategies' },
  { step: 4, name: 'Risk Filter', desc: '12-layer validation: lot sizing, drawdown, spread, session' },
  { step: 5, name: 'ZeroMQ Bridge', desc: 'Sub-2ms order serialization and transmission' },
  { step: 6, name: 'MetaTrader 5', desc: 'Order execution via broker liquidity pool' },
  { step: 7, name: 'Broker', desc: 'Fill confirmation, position tracking, equity reconciliation' },
];

export default async function PlatformPage() {
  const breadcrumb = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Platform', url: '/platform' },
  ]);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(organizationSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(professionalServiceSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(breadcrumb) }} />
      <EnterpriseNav />
      <main id="main-content">
        {/* Hero */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">Platform</p>
            <h1 className="t-display-page mb-6">
              The infrastructure behind<br className="hidden sm:block" /> every decision.
            </h1>
            <p className="t-lead text-foreground/60 max-w-3xl">
              BabahAlgo is a quantitative trading platform combining multi-strategy
              execution, AI-driven analysis, and institutional-grade risk management into a
              single, auditable pipeline.
            </p>
          </div>
        </section>

        {/* Three Pillars */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">Foundation</p>
            <h2 className="t-display-sub mb-4">Three pillars</h2>
            <p className="t-body text-foreground/60 mb-12 max-w-2xl">
              The platform is organized around three foundational disciplines. Each operates
              independently but reinforces the others.
            </p>
            <div className="grid lg:grid-cols-3 gap-6">
              {PILLARS.map((pillar) => (
                <Link key={pillar.title} href={pillar.href} className="card-enterprise group flex flex-col">
                  <h3 className="text-xl font-medium mb-4 group-hover:text-amber-400 transition-colors">
                    {pillar.title}
                  </h3>
                  <p className="t-body-sm text-foreground/60 leading-relaxed mb-6 flex-1">
                    {pillar.description}
                  </p>
                  <span className="btn-tertiary text-sm">
                    Learn more <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Execution Pipeline */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">Architecture</p>
            <h2 className="t-display-sub mb-4">Execution pipeline</h2>
            <p className="t-body text-foreground/60 mb-12 max-w-2xl">
              Every trade follows a deterministic pipeline with no manual intervention.
            </p>
            <div className="card-enterprise p-8">
              <div className="space-y-0">
                {PIPELINE_STEPS.map((s, i) => (
                  <div key={s.step} className="flex items-start gap-4 py-4 border-b border-border/40 last:border-b-0">
                    <span className="font-mono text-amber-400 font-semibold text-sm w-6 shrink-0 mt-0.5">{s.step}.</span>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                      <span className="font-mono text-sm text-foreground min-w-[140px]">{s.name}</span>
                      {i < PIPELINE_STEPS.length - 1 && <span className="hidden sm:inline text-foreground/20">&rarr;</span>}
                      <span className="text-sm text-foreground/50">{s.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Instruments */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">Coverage</p>
            <h2 className="t-display-sub mb-4">Instruments</h2>
            <p className="t-body text-foreground/60 mb-12 max-w-2xl">
              14 instruments across four asset classes, selected for liquidity depth, spread
              efficiency, and strategy compatibility.
            </p>
            <div className="table-enterprise-wrapper">
              <table className="table-enterprise">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Asset Class</th>
                    <th className="text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {INSTRUMENTS.map((inst) => (
                    <tr key={inst.ticker}>
                      <td className="font-semibold">{inst.ticker}</td>
                      <td className="!text-foreground/50">{inst.assetClass}</td>
                      <td className="text-right text-emerald-400">{inst.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <Link href="/platform/instruments" className="btn-tertiary text-sm">
                View detailed specifications <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Documentation */}
        <section className="section-padding">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">Documents</p>
            <h2 className="t-display-sub mb-8">Documentation</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card-enterprise">
                <h3 className="text-lg font-medium mb-2">Methodology PDF</h3>
                <p className="t-body-sm text-foreground/60 leading-relaxed mb-4">
                  Deskripsi lengkap logika strategi, kriteria entry/exit, metodologi backtesting,
                  dan hasil walk-forward validation.
                </p>
                <Link
                  href="/contact?subject=methodology-request"
                  className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 font-medium"
                >
                  Request akses dokumen <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="card-enterprise">
                <h3 className="text-lg font-medium mb-2">Technical Whitepaper</h3>
                <p className="t-body-sm text-foreground/60 leading-relaxed mb-4">
                  Arsitektur infrastruktur, security model, benchmark latency eksekusi,
                  dan spesifikasi formal risk framework.
                </p>
                <Link
                  href="/contact?subject=whitepaper-request"
                  className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 font-medium"
                >
                  Request akses dokumen <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
