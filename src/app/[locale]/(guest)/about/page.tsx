import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { ArrowRight } from 'lucide-react';
import { getPageMetadata } from '@/lib/seo';
import { breadcrumbSchema, ldJson, organizationSchema } from '@/lib/seo-jsonld';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return getPageMetadata('/about', {
    title: 'Tentang BabahAlgo — Quantitative Trading Infrastructure | CV Babah Digital',
    description:
      'BabahAlgo dioperasikan oleh CV Babah Digital. Tim quant Indonesia membangun infrastruktur trading kuantitatif untuk Forex (SMC, Wyckoff) dan Crypto Bot Binance Futures. Track record terverifikasi.',
  });
}

const MILESTONES = [
  { year: '2023', title: 'Research', description: 'Initial strategy research, backtesting, dan validation lintas 5 tahun tick data.' },
  { year: '2024', title: 'Platform launch', description: 'Production deployment dengan live trading di 14 instrumen. Infrastructure buildout.' },
  { year: '2024', title: 'Signal Service', description: 'Launch retail signal service dengan Telegram + MT5 trade copier — model affiliate-broker, customer pegang dana sendiri.' },
  { year: '2025', title: 'Crypto Bot', description: 'Binance Futures bot dengan 6 strategi institusional + risk overlay 12-layer. Customer pegang Binance API key.' },
  { year: '2026', title: 'Public API Marketplace', description: '9 container API (News, Signals, Indicators, Calendar, Market Data, Execution, Correlation, Broker Specs, AI Explainability) untuk integrasi B2B + institutional.' },
];

const PRINCIPLES = [
  { title: 'Focus over breadth', body: 'We trade 14 instruments, not 50. We use three timeframes, not twelve. Depth of understanding beats superficial coverage.' },
  { title: 'Build, don\'t buy', body: 'Every component — from signal generation to risk framework to client dashboard — is designed and built in-house. No white-label, no resold signals.' },
  { title: 'Transparency is non-negotiable', body: 'Production track record on MyFxBook. Risk framework documented publicly. Fee structures with no hidden charges.' },
];

export default async function AboutPage() {
  const breadcrumb = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'About', url: '/about' },
  ]);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(organizationSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(breadcrumb) }} />
      <EnterpriseNav />
      <main id="main-content">
        {/* Hero */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">About</p>
            <h1 className="t-display-page mb-6">About BabahAlgo</h1>
            <p className="t-lead text-foreground/60 max-w-2xl">
              Quantitative trading infrastructure for serious market participants.
            </p>
          </div>
        </section>

        {/* Philosophy — Editorial prose */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <div className="grid lg:grid-cols-5 gap-16">
              <div className="lg:col-span-2">
                <p className="t-eyebrow mb-3">Philosophy</p>
                <h2 className="t-display-sub">Why we exist</h2>
              </div>
              <div className="lg:col-span-3 space-y-6 t-body text-foreground/70 leading-relaxed">
                <p>
                  BabahAlgo exists because we believe the tools of institutional trading should not be locked behind
                  seven-figure minimums and prime brokerage relationships. The mathematics of market microstructure,
                  the discipline of systematic risk management, and the infrastructure to execute both reliably &mdash;
                  these are engineering problems, not privilege problems.
                </p>
                <p>
                  Our approach is deliberately narrow. We trade 14 instruments, not 50. We use three timeframes,
                  not twelve. We run a single strategy architecture with proven edge, not a marketplace of untested
                  ideas. This focus allows us to understand every parameter, every correlation, and every failure
                  mode in our system at a depth that broader platforms cannot match.
                </p>
                <p>
                  We are builders first. Every component of the BabahAlgo platform was designed and built in-house.
                  We do not resell third-party signals or white-label someone else&apos;s infrastructure. When something
                  breaks at 3am Tokyo time, we know exactly which line of code to look at because we wrote it.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Principles */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">Principles</p>
            <h2 className="t-display-sub mb-12">What we believe</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {PRINCIPLES.map((p) => (
                <div key={p.title} className="card-enterprise">
                  <h3 className="text-lg font-medium mb-3">{p.title}</h3>
                  <p className="t-body-sm text-foreground/60 leading-relaxed">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">Journey</p>
            <h2 className="t-display-sub mb-12">Milestones</h2>
            <div className="hidden md:flex items-start justify-between gap-4">
              {MILESTONES.map((milestone, i) => (
                <div key={`${milestone.year}-${milestone.title}`} className="flex-1 relative">
                  <div className="flex items-center mb-4">
                    <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                    {i < MILESTONES.length - 1 && (
                      <div className="h-px bg-border flex-1" />
                    )}
                  </div>
                  <p className="font-mono text-sm text-foreground/40 mb-1">{milestone.year}</p>
                  <h3 className="font-medium text-sm mb-2">{milestone.title}</h3>
                  <p className="text-xs text-foreground/50 leading-relaxed pr-4">{milestone.description}</p>
                </div>
              ))}
            </div>
            <div className="md:hidden space-y-8">
              {MILESTONES.map((milestone) => (
                <div key={`${milestone.year}-${milestone.title}`} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                    <div className="w-px bg-border flex-1 mt-2" />
                  </div>
                  <div className="pb-4">
                    <p className="font-mono text-sm text-foreground/40 mb-1">{milestone.year}</p>
                    <h3 className="font-medium text-sm mb-2">{milestone.title}</h3>
                    <p className="text-sm text-foreground/50 leading-relaxed">{milestone.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Navigation cards */}
        <section className="section-padding">
          <div className="container-default px-4 sm:px-6">
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl">
              <Link href="/about/team" className="card-enterprise group">
                <h3 className="text-lg font-medium mb-2 group-hover:text-amber-400 transition-colors">Our team</h3>
                <p className="t-body-sm text-foreground/60 mb-4">Meet the people behind BabahAlgo.</p>
                <span className="btn-tertiary text-sm">
                  View team <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
              <Link href="/about/governance" className="card-enterprise group">
                <h3 className="text-lg font-medium mb-2 group-hover:text-amber-400 transition-colors">Governance</h3>
                <p className="t-body-sm text-foreground/60 mb-4">Legal structure, compliance, and disclosures.</p>
                <span className="btn-tertiary text-sm">
                  View governance <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
