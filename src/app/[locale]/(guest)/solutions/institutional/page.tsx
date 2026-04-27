import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { ArrowRight } from 'lucide-react';
import { breadcrumbSchema, ldJson, organizationSchema, professionalServiceSchema } from '@/lib/seo-jsonld';

export const dynamic = 'force-dynamic';

const FEATURES = [
  {
    title: 'Priority API access',
    description:
      'Akses prioritas ke 8 Developer API container kami (News, Signals, Indicators, Calendar, Market Data, Correlation, Broker Specs, AI Explainability) dengan rate limit khusus + dedicated infrastructure lane.',
  },
  {
    title: 'White-label capability',
    description:
      'Tawarkan teknologi BabahAlgo dengan brand Anda sendiri. Kami sediakan infrastructure + execution + reporting; Anda yang pegang relasi customer dan branding.',
  },
  {
    title: 'Custom integration support',
    description:
      'Tim engineering kami bantu integrasi langsung ke OMS/PMS/risk-system Anda. WebSocket subscription, REST batching, custom data formatter sesuai kebutuhan.',
  },
  {
    title: 'Backtest as a Service',
    description:
      'Walk-forward + Monte Carlo backtesting on-demand untuk strategi internal Anda. Tick data 5 tahun di 14 instrumen. Whitelabel report PDF + API automation.',
  },
  {
    title: 'Dedicated engineering contact',
    description:
      'Single point of contact dari engineering team — bukan customer support generic. Direct access via Telegram + email + scheduled call. SLA 99.9%.',
  },
  {
    title: 'Compliance & audit reporting',
    description:
      'Monthly + quarterly reports yang siap untuk audit, LP distribution, dan regulatory filings. Audit chain verification harian + immutable trail per ADR governance.',
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
  const breadcrumb = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Solutions', url: '/solutions' },
    { name: 'Institutional', url: '/solutions/institutional' },
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
            <p className="t-eyebrow mb-4">Institutional</p>
            <h1 className="t-display-page mb-6">
              Custom mandate for family offices and funds.
            </h1>
            <p className="t-lead text-foreground/60 max-w-2xl">
              Bespoke trading mandates with dedicated infrastructure, custom risk parameters,
              and institutional-grade reporting. Built for allocators who demand full control and transparency.
            </p>
          </div>
        </section>

        {/* Who it's for */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">Eligibility</p>
            <h2 className="t-display-sub mb-8">Who it is for</h2>
            <ul className="space-y-4 text-foreground/60 max-w-2xl">
              <li className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>Family offices seeking systematic, uncorrelated return streams with institutional-grade risk management and reporting.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>Small hedge funds and CTA programs looking for turnkey quantitative trading infrastructure with custom mandate design.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>High-net-worth individuals with $250,000 or more in liquid assets who want professionally managed, algorithm-driven exposure to FX and commodities markets.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* What you get */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">Capabilities</p>
            <h2 className="t-display-sub mb-12">What you get</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="card-enterprise">
                  <h3 className="font-semibold mb-3">{feature.title}</h3>
                  <p className="t-body-sm text-foreground/60 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">Pricing</p>
            <h2 className="t-display-sub mb-12">Pricing</h2>
            <div className="card-enterprise max-w-xl">
              <p className="t-eyebrow mb-4">Mandate-Based</p>
              <p className="font-display text-4xl font-medium mb-2">Starting AUM: $250,000</p>
              <p className="text-foreground/60 leading-relaxed mb-6">
                Fee structures are negotiated on a per-mandate basis. Typical arrangements include a management fee
                and performance fee with high-water mark protection. All terms are documented in the Investment Management Agreement.
              </p>
              <p className="t-body-sm text-foreground/60">
                Schedule a briefing to discuss your specific requirements and receive a tailored proposal.
              </p>
            </div>
          </div>
        </section>

        {/* Onboarding */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">Process</p>
            <h2 className="t-display-sub mb-12">Onboarding process</h2>
            <div className="grid md:grid-cols-5 gap-6">
              {STEPS.map((step, i) => (
                <div key={step.step} className="relative">
                  <p className="font-mono text-5xl text-amber-500/20 mb-3">{step.step}</p>
                  <h3 className="font-semibold text-sm mb-2">{step.title}</h3>
                  <p className="text-xs text-foreground/60 leading-relaxed">{step.description}</p>
                  {i < STEPS.length - 1 && (
                    <ArrowRight className="hidden md:block absolute top-4 -right-4 w-4 h-4 text-foreground/30" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <div className="grid lg:grid-cols-5 gap-12">
              <div className="lg:col-span-2">
                <p className="t-eyebrow mb-4">FAQ</p>
                <h2 className="t-display-sub">Frequently asked questions</h2>
              </div>
              <div className="lg:col-span-3 space-y-8">
                {FAQ.map((item) => (
                  <div key={item.q}>
                    <h3 className="font-semibold mb-2">{item.q}</h3>
                    <p className="t-body-sm text-foreground/60 leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section-padding">
          <div className="container-default px-4 sm:px-6 text-center">
            <p className="t-eyebrow mb-4">Get Started</p>
            <h2 className="t-display-sub mb-4">Let us discuss your mandate</h2>
            <p className="text-foreground/60 mb-8 max-w-lg mx-auto">
              Schedule an introductory briefing with our institutional team. No commitment, no pressure --
              just a conversation about whether our capabilities align with your objectives.
            </p>
            <Link
              href="/contact"
              className="btn-primary inline-flex items-center gap-2"
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
