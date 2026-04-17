import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

const MILESTONES = [
  { year: '2023', title: 'Research', description: 'Initial strategy research, backtesting, and validation across 5 years of tick data.' },
  { year: '2024', title: 'Platform launch', description: 'Production deployment with live trading on 14 instruments. Infrastructure buildout.' },
  { year: '2024', title: 'Signal service', description: 'Launch of retail signal service with Telegram and MT5 trade copier integration.' },
  { year: '2025', title: 'PAMM accounts', description: 'Introduction of managed accounts with profit sharing for passive investors.' },
  { year: '2026', title: 'Institutional', description: 'Custom mandate service for family offices, small funds, and high-net-worth individuals.' },
];

export default async function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main>
        {/* Hero */}
        <section className="border-b border-border">
          <div className="max-w-5xl mx-auto px-6 py-24">
            <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-6">
              About BabahAlgo
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Quantitative trading infrastructure for serious market participants.
            </p>
          </div>
        </section>

        {/* Philosophy */}
        <section className="border-b border-border">
          <div className="max-w-5xl mx-auto px-6 py-20">
            <h2 className="font-display text-2xl font-semibold mb-8">Philosophy</h2>
            <div className="max-w-3xl space-y-6 text-muted-foreground leading-relaxed">
              <p>
                BabahAlgo exists because we believe the tools of institutional trading should not be locked behind
                seven-figure minimums and prime brokerage relationships. The mathematics of market microstructure,
                the discipline of systematic risk management, and the infrastructure to execute both reliably --
                these are engineering problems, not privilege problems.
              </p>
              <p>
                Our approach is deliberately narrow. We trade 14 instruments, not 50. We use three timeframes,
                not twelve. We run a single strategy architecture with proven edge, not a marketplace of untested
                ideas. This focus allows us to understand every parameter, every correlation, and every failure
                mode in our system at a depth that broader platforms cannot match.
              </p>
              <p>
                We are builders first. Every component of the BabahAlgo platform -- from the signal generation
                engine to the risk framework to the client dashboard -- was designed and built in-house. We do
                not resell third-party signals or white-label someone else&apos;s infrastructure. When something
                breaks at 3am Tokyo time, we know exactly which line of code to look at because we wrote it.
              </p>
              <p>
                Transparency is non-negotiable. Our production track record is independently verified on
                MyFxBook. Our risk framework is documented publicly. Our fee structures have no hidden charges.
                We believe that in an industry plagued by opacity and misaligned incentives, the competitive
                advantage belongs to those who have nothing to hide.
              </p>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="border-b border-border">
          <div className="max-w-5xl mx-auto px-6 py-20">
            <h2 className="font-display text-2xl font-semibold mb-12">Milestones</h2>
            <div className="hidden md:flex items-start justify-between gap-4">
              {MILESTONES.map((milestone, i) => (
                <div key={`${milestone.year}-${milestone.title}`} className="flex-1 relative">
                  <div className="flex items-center mb-4">
                    <div className="w-3 h-3 rounded-full bg-foreground shrink-0" />
                    {i < MILESTONES.length - 1 && (
                      <div className="h-px bg-border flex-1" />
                    )}
                  </div>
                  <p className="font-mono text-sm text-muted-foreground mb-1">{milestone.year}</p>
                  <h3 className="font-semibold text-sm mb-2">{milestone.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed pr-4">{milestone.description}</p>
                </div>
              ))}
            </div>
            {/* Mobile: vertical layout */}
            <div className="md:hidden space-y-8">
              {MILESTONES.map((milestone) => (
                <div key={`${milestone.year}-${milestone.title}`} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-foreground shrink-0" />
                    <div className="w-px bg-border flex-1 mt-2" />
                  </div>
                  <div className="pb-4">
                    <p className="font-mono text-sm text-muted-foreground mb-1">{milestone.year}</p>
                    <h3 className="font-semibold text-sm mb-2">{milestone.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{milestone.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Links */}
        <section>
          <div className="max-w-5xl mx-auto px-6 py-20">
            <div className="grid md:grid-cols-2 gap-8 max-w-2xl">
              <Link
                href="/about/team"
                className="border border-border rounded-lg p-8 bg-card hover:border-foreground/20 transition-colors group"
              >
                <h3 className="font-semibold mb-2">Our team</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Meet the people behind BabahAlgo.
                </p>
                <span className="inline-flex items-center gap-2 text-sm group-hover:gap-3 transition-all">
                  View team
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
              <Link
                href="/about/governance"
                className="border border-border rounded-lg p-8 bg-card hover:border-foreground/20 transition-colors group"
              >
                <h3 className="font-semibold mb-2">Governance</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Legal structure, compliance, and disclosures.
                </p>
                <span className="inline-flex items-center gap-2 text-sm group-hover:gap-3 transition-all">
                  View governance
                  <ArrowRight className="w-4 h-4" />
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
