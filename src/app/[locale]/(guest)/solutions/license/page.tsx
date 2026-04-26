import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { ArrowRight } from 'lucide-react';
import { breadcrumbSchema, financialProductSchema, ldJson, organizationSchema } from '@/lib/seo-jsonld';

export const dynamic = 'force-dynamic';

const SPECS = [
  { spec: 'CPU', value: '4 vCPUs (dedicated)', note: 'Guaranteed cores, no shared contention' },
  { spec: 'RAM', value: '8 GB DDR4', note: 'Expandable to 16 GB on request' },
  { spec: 'Storage', value: '100 GB NVMe SSD', note: 'Sub-millisecond I/O for trade logging' },
  { spec: 'Network', value: '1 Gbps dedicated', note: 'Low-latency broker connectivity' },
  { spec: 'Uptime SLA', value: '99.9%', note: 'Contractual guarantee with failover' },
  { spec: 'OS', value: 'Linux (hardened)', note: 'Minimal attack surface, auto-patched' },
  { spec: 'Monitoring', value: '60-second health checks', note: '24/7 automated alerting' },
  { spec: 'Backup', value: 'Daily snapshots', note: '7-day retention with point-in-time recovery' },
];

const FEATURES = [
  {
    title: 'Dedicated VPS instance',
    description:
      'Your own isolated virtual private server running our trading bot with guaranteed CPU, RAM, and network resources. No shared infrastructure.',
  },
  {
    title: 'Custom strategy configuration',
    description:
      'Work with our quant team to configure the bot for your specific instruments, timeframes, risk parameters, and trading schedule.',
  },
  {
    title: 'Direct MT5 integration',
    description:
      'The bot connects directly to your MT5 broker account with sub-millisecond execution latency. Supports multiple broker connections.',
  },
  {
    title: '99.9% uptime SLA',
    description:
      'Enterprise-grade infrastructure with automated failover, health monitoring, and proactive alerting. Backed by a contractual uptime guarantee.',
  },
  {
    title: 'Full audit trail',
    description:
      'Every trade decision, risk check, and execution event is logged and available through your dashboard and API. Complete operational transparency.',
  },
  {
    title: 'Ongoing maintenance',
    description:
      'Monthly maintenance includes system updates, security patches, performance optimization, and strategy parameter reviews.',
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Schedule a call',
    description:
      'Book a 30-minute consultation with our team. We will discuss your trading objectives, capital allocation, and infrastructure requirements.',
  },
  {
    step: '02',
    title: 'Discovery',
    description:
      'Our quant team conducts a detailed assessment of your requirements: instrument universe, risk tolerance, broker preferences, and operational needs.',
  },
  {
    step: '03',
    title: 'Proposal',
    description:
      'We deliver a technical proposal covering system architecture, strategy configuration, risk parameters, pricing, and timeline.',
  },
  {
    step: '04',
    title: 'Setup',
    description:
      'Upon agreement, we provision your dedicated VPS, configure the trading bot, connect to your broker, and run a controlled paper-trading validation phase.',
  },
  {
    step: '05',
    title: 'Training & go-live',
    description:
      'We walk you through the dashboard, alerting system, and operational procedures. Once confirmed, we switch to live trading with your capital.',
  },
];

const FAQ = [
  {
    q: 'What hardware specifications are included?',
    a: 'Each VPS instance includes a minimum of 4 vCPUs, 8GB RAM, 100GB NVMe SSD, and a dedicated 1Gbps network connection. We can scale these resources based on the number of instruments and strategies deployed.',
  },
  {
    q: 'Can I use my own broker?',
    a: 'Yes. The bot supports any MT5-compatible broker. We have pre-tested integrations with several brokers and can validate connectivity with your preferred broker during the discovery phase.',
  },
  {
    q: 'What happens if the server goes down?',
    a: 'Our monitoring system detects failures within 30 seconds and initiates automatic recovery. If a hardware failure occurs, the bot is migrated to backup infrastructure. All open positions have server-side stop-losses as an additional safety layer.',
  },
  {
    q: 'Can I modify the strategy after deployment?',
    a: 'Yes. Strategy parameters can be adjusted at any time through a structured change request process. Material changes go through our validation pipeline before deployment to ensure they do not compromise the risk framework.',
  },
  {
    q: 'Is the setup fee refundable?',
    a: 'The setup fee covers infrastructure provisioning, strategy configuration, and training. It is non-refundable after the discovery phase begins. You may cancel the monthly maintenance at any time with 30 days notice.',
  },
];

export default async function LicensePage() {
  const breadcrumb = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Solutions', url: '/solutions' },
    { name: 'VPS License', url: '/solutions/license' },
  ]);
  const tiers = [
    { name: 'VPS Standard — $3,000 setup + $150/mo', description: 'Dedicated VPS broker-level, full bot access, custom configuration', price: '3000', currency: 'USD' },
    { name: 'VPS Premium — $7,500 setup + $300/mo', description: 'Multi-broker bridge MT4+MT5, 3 akun paralel, priority support 24/7', price: '7500', currency: 'USD' },
    { name: 'VPS Dedicated — $1,499/mo', description: 'Single-customer isolated VPS, dedicated MT5 bridge, 24/7 incident channel, SLA 99.9%', price: '1499', currency: 'USD' },
  ].map((t) => financialProductSchema({ ...t, url: '/solutions/license' }));
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(organizationSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(breadcrumb) }} />
      {tiers.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(schema) }} />
      ))}
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">
        {/* Hero */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">VPS License</p>
            <h1 className="t-display-page mb-6">
              Dedicated bot infrastructure for professional traders.
            </h1>
            <p className="t-lead text-foreground/60 max-w-2xl">
              Your own isolated server running our trading algorithms, configured to your specifications.
              Full control, full transparency, enterprise-grade reliability.
            </p>
          </div>
        </section>

        {/* Technical Specs Table */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">Infrastructure</p>
            <h2 className="t-display-sub mb-4">Technical specifications</h2>
            <p className="t-body text-foreground/60 mb-10 max-w-xl">
              Every VPS license includes enterprise-grade hardware with guaranteed resources.
            </p>
            <div className="overflow-x-auto max-w-4xl">
              <div className="table-enterprise-wrapper min-w-[500px]">
              <table className="table-enterprise w-full">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="text-left px-6 py-3">Component</th>
                    <th className="text-left px-6 py-3">Specification</th>
                    <th className="text-left px-6 py-3 hidden md:table-cell">Notes</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {SPECS.map((row) => (
                    <tr key={row.spec} className="border-b border-border/60 last:border-0">
                      <td className="px-6 py-3 font-medium text-foreground/80">{row.spec}</td>
                      <td className="px-6 py-3 font-mono text-amber-400">{row.value}</td>
                      <td className="px-6 py-3 text-foreground/50 hidden md:table-cell">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
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
                <span>Professional traders managing $50,000 or more who want dedicated infrastructure without sharing resources.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>Trading firms and prop desks looking for turnkey algorithmic trading infrastructure with custom configuration.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>Traders who want full operational control and the ability to customize every aspect of the system.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Features — alternating left-right sections */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">Capabilities</p>
            <h2 className="t-display-sub mb-14">What you get</h2>
            <div className="space-y-16">
              {FEATURES.map((feature, i) => (
                <div
                  key={feature.title}
                  className={`grid md:grid-cols-2 gap-8 md:gap-16 items-center ${
                    i % 2 === 1 ? 'md:[direction:rtl]' : ''
                  }`}
                >
                  {/* Image placeholder */}
                  <div className={`${i % 2 === 1 ? 'md:[direction:ltr]' : ''}`}>
                    <div className="aspect-[4/3] rounded-lg border border-border/60 bg-muted/30 flex items-center justify-center">
                      <div className="text-center">
                        <p className="font-mono text-6xl text-amber-500/10 font-bold">{String(i + 1).padStart(2, '0')}</p>
                        <p className="t-body-sm text-foreground/20 mt-2">{feature.title}</p>
                      </div>
                    </div>
                  </div>
                  {/* Text */}
                  <div className={`${i % 2 === 1 ? 'md:[direction:ltr]' : ''}`}>
                    <h3 className="font-display text-xl font-medium mb-4">{feature.title}</h3>
                    <p className="t-body text-foreground/60 leading-relaxed">{feature.description}</p>
                  </div>
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
              <div className="space-y-6">
                <div>
                  <p className="t-eyebrow mb-1">Setup fee</p>
                  <p className="font-display text-4xl font-medium">
                    $3,000
                    <span className="text-base text-foreground/60 font-normal ml-2">one-time</span>
                  </p>
                </div>
                <div className="border-t border-border/60 pt-6">
                  <p className="t-eyebrow mb-1">Maintenance</p>
                  <p className="font-display text-4xl font-medium">
                    $150
                    <span className="text-base text-foreground/60 font-normal">/mo</span>
                  </p>
                </div>
                <div className="border-t border-border/60 pt-6">
                  <p className="t-body-sm text-foreground/60 leading-relaxed">
                    Setup fee covers infrastructure provisioning, strategy configuration, paper-trading validation,
                    and training. Monthly maintenance covers hosting, monitoring, updates, and support.
                    Custom configurations may incur additional fees based on scope.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Onboarding */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">Process</p>
            <h2 className="t-display-sub mb-12">Onboarding process</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
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
            <h2 className="t-display-sub mb-4">Ready to discuss your setup?</h2>
            <p className="text-foreground/60 mb-8 max-w-lg mx-auto">
              Schedule a 30-minute call with our team to scope your infrastructure requirements and get a detailed proposal.
            </p>
            <Link
              href="/contact"
              className="btn-primary inline-flex items-center gap-2"
            >
              Schedule call
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
    </>
  );
}
