import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

const FEATURES = [
  {
    title: 'Custom managed account',
    description:
      'A dedicated trading account managed under a bespoke Investment Management Agreement (IMA) tailored to your mandate, risk parameters, and return objectives.',
  },
  {
    title: 'API access',
    description:
      'Programmatic access to real-time portfolio data, trade history, risk metrics, and reporting through our authenticated REST API. Integrate with your own systems.',
  },
  {
    title: 'White-label capability',
    description:
      'Offer BabahAlgo strategies under your own brand to your clients. We provide the infrastructure, execution, and reporting -- you own the relationship.',
  },
  {
    title: 'Custom mandate',
    description:
      'Define your own instrument universe, risk limits, drawdown thresholds, exposure caps, and rebalancing schedule. Every parameter is negotiable.',
  },
  {
    title: 'Dedicated relationship manager',
    description:
      'A single point of contact for all operational, strategic, and compliance matters. Direct access via phone, WhatsApp, and email.',
  },
  {
    title: 'Institutional reporting',
    description:
      'Monthly and quarterly performance reports formatted for LP distribution, fund administration, and regulatory filings. GIPS-compliant on request.',
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Briefing',
    description:
      'An introductory call to understand your investment mandate, capital allocation, risk appetite, and operational requirements.',
  },
  {
    step: '02',
    title: 'Discovery',
    description:
      'Our team conducts due diligence on both sides: we share our track record, risk framework, and infrastructure details. You share your compliance requirements and investment criteria.',
  },
  {
    step: '03',
    title: 'Proposal',
    description:
      'We deliver a comprehensive proposal covering strategy design, risk parameters, fee structure, reporting cadence, and legal framework.',
  },
  {
    step: '04',
    title: 'IMA signing',
    description:
      'Upon agreement, we execute the Investment Management Agreement and establish the legal and operational framework for the mandate.',
  },
  {
    step: '05',
    title: 'Funding & go-live',
    description:
      'Capital is deposited at the designated broker. Trading begins according to the agreed mandate with full reporting from day one.',
  },
];

const FAQ = [
  {
    q: 'What is the minimum AUM?',
    a: 'The starting AUM for institutional mandates is $250,000. This minimum ensures adequate diversification across our instrument universe and proper position sizing within the risk framework.',
  },
  {
    q: 'What is the fee structure?',
    a: 'Fee structures are mandate-specific and negotiated during the proposal phase. Typical arrangements include a management fee (1-2% annually) plus performance fee (15-25% of profits above high-water mark). We are flexible on structure.',
  },
  {
    q: 'Where are client funds held?',
    a: 'All client funds are held at regulated brokers in segregated accounts under the client entity name. BabahAlgo holds limited power of attorney for trading purposes only. We cannot transfer or withdraw client funds.',
  },
  {
    q: 'Do you support multi-currency mandates?',
    a: 'Yes. We can configure mandates to trade in multiple base currencies and across currency pairs. P&L reporting can be denominated in USD, EUR, GBP, or SGD.',
  },
  {
    q: 'What regulatory framework applies?',
    a: 'BabahAlgo operates as a technology and advisory provider under Indonesian commercial law (CV Babah Digital). For mandates requiring specific regulatory coverage, we work with regulated partner entities in the relevant jurisdictions.',
  },
];

export default async function InstitutionalPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main>
        {/* Hero */}
        <section className="border-b border-border">
          <div className="max-w-5xl mx-auto px-6 py-24">
            <p className="text-sm font-mono text-muted-foreground mb-4">INSTITUTIONAL</p>
            <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-6">
              Custom mandate for family offices and funds.
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Bespoke trading mandates with dedicated infrastructure, custom risk parameters,
              and institutional-grade reporting. Built for allocators who demand full control and transparency.
            </p>
          </div>
        </section>

        {/* Who it's for */}
        <section className="border-b border-border">
          <div className="max-w-5xl mx-auto px-6 py-20">
            <h2 className="font-display text-2xl font-semibold mb-8">Who it is for</h2>
            <ul className="space-y-4 text-muted-foreground max-w-2xl">
              <li className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                <span>Family offices seeking systematic, uncorrelated return streams with institutional-grade risk management and reporting.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                <span>Small hedge funds and CTA programs looking for turnkey quantitative trading infrastructure with custom mandate design.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                <span>High-net-worth individuals with $250,000 or more in liquid assets who want professionally managed, algorithm-driven exposure to FX and commodities markets.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* What you get */}
        <section className="border-b border-border">
          <div className="max-w-5xl mx-auto px-6 py-20">
            <h2 className="font-display text-2xl font-semibold mb-12">What you get</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="border border-border rounded-lg p-8 bg-card">
                  <h3 className="font-semibold mb-3">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="border-b border-border">
          <div className="max-w-5xl mx-auto px-6 py-20">
            <h2 className="font-display text-2xl font-semibold mb-12">Pricing</h2>
            <div className="border border-border rounded-lg p-8 bg-card max-w-xl">
              <p className="text-sm font-mono text-muted-foreground mb-4">MANDATE-BASED</p>
              <p className="font-display text-2xl font-semibold mb-2">Starting AUM: $250,000</p>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Fee structures are negotiated on a per-mandate basis. Typical arrangements include a management fee
                and performance fee with high-water mark protection. All terms are documented in the Investment Management Agreement.
              </p>
              <p className="text-sm text-muted-foreground">
                Schedule a briefing to discuss your specific requirements and receive a tailored proposal.
              </p>
            </div>
          </div>
        </section>

        {/* Onboarding */}
        <section className="border-b border-border">
          <div className="max-w-5xl mx-auto px-6 py-20">
            <h2 className="font-display text-2xl font-semibold mb-12">Onboarding process</h2>
            <div className="grid md:grid-cols-5 gap-6">
              {STEPS.map((step, i) => (
                <div key={step.step} className="relative">
                  <p className="font-mono text-3xl text-muted-foreground/30 mb-3">{step.step}</p>
                  <h3 className="font-semibold text-sm mb-2">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                  {i < STEPS.length - 1 && (
                    <ArrowRight className="hidden md:block absolute top-4 -right-4 w-4 h-4 text-muted-foreground/30" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-b border-border">
          <div className="max-w-5xl mx-auto px-6 py-20">
            <h2 className="font-display text-2xl font-semibold mb-12">Frequently asked questions</h2>
            <div className="space-y-8 max-w-3xl">
              {FAQ.map((item) => (
                <div key={item.q}>
                  <h3 className="font-semibold mb-2">{item.q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section>
          <div className="max-w-5xl mx-auto px-6 py-20 text-center">
            <h2 className="font-display text-2xl font-semibold mb-4">Let us discuss your mandate</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Schedule an introductory briefing with our institutional team. No commitment, no pressure --
              just a conversation about whether our capabilities align with your objectives.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-accent text-accent-foreground rounded-md px-6 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Request introduction
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
