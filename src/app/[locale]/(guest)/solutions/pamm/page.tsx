import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

const FEATURES = [
  {
    title: 'Fully managed execution',
    description:
      'Our algorithms execute trades on your behalf from a master account. No manual intervention required -- your capital works while you focus on other priorities.',
  },
  {
    title: 'Transparent profit sharing',
    description:
      'You only pay performance fees on realized profits. If the account does not generate returns in a given period, you pay nothing. Fully aligned incentives.',
  },
  {
    title: 'Real-time monitoring',
    description:
      'Access your dedicated dashboard to monitor equity, drawdown, open positions, and historical performance in real time. Full transparency at every level.',
  },
  {
    title: '12-layer risk framework',
    description:
      'Every trade passes through our proprietary risk engine covering position sizing, correlation limits, volatility filters, drawdown circuit breakers, and more.',
  },
  {
    title: 'Monthly reporting',
    description:
      'Receive a detailed monthly performance report including trade-by-trade breakdown, risk metrics, and commentary on market conditions.',
  },
  {
    title: 'Flexible withdrawals',
    description:
      'Request a partial or full withdrawal at any time. Withdrawals are processed within 3 business days through your broker, with no lock-up period.',
  },
];

const PRICING = [
  {
    tier: 'Basic',
    share: '20%',
    label: 'profit share',
    features: [
      'Minimum allocation: $5,000',
      'Standard risk profile',
      'Monthly performance reports',
      'Email support',
      'Dashboard access',
    ],
  },
  {
    tier: 'Pro',
    share: '30%',
    label: 'profit share',
    features: [
      'Minimum allocation: $25,000',
      'Aggressive risk profile available',
      'Weekly performance reports',
      'Priority WhatsApp support',
      'Custom risk parameters',
      'Quarterly strategy review call',
    ],
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Open account',
    description:
      'Register on BabahAlgo and complete your investor profile. We will assess your risk tolerance, investment horizon, and return expectations.',
  },
  {
    step: '02',
    title: 'Fund your account',
    description:
      'Open a trading account with our partner broker and deposit your capital. Your funds remain in your name at the broker at all times.',
  },
  {
    step: '03',
    title: 'Start earning',
    description:
      'Once your account is linked to our master account, trading begins automatically. Monitor performance from your dashboard.',
  },
];

const FAQ = [
  {
    q: 'Is my capital safe?',
    a: 'Your funds are held at a regulated broker in a segregated client account under your name. BabahAlgo has trading authority only -- we cannot withdraw your funds. You retain full ownership and can withdraw at any time.',
  },
  {
    q: 'What is the minimum investment?',
    a: 'The Basic tier requires a minimum of $5,000. The Pro tier requires $25,000. These minimums ensure proper position sizing and risk management across our instrument universe.',
  },
  {
    q: 'How is profit share calculated?',
    a: 'Profit share is calculated on net realized profits using a high-water mark. This means you never pay performance fees on recovering previous losses. Fees are calculated and deducted monthly.',
  },
  {
    q: 'What happens during a drawdown?',
    a: 'Our risk framework includes hard drawdown limits. If the account reaches a predefined drawdown threshold, trading is automatically reduced or paused. You will be notified immediately of any circuit breaker activation.',
  },
  {
    q: 'Can I set custom risk parameters?',
    a: 'Pro tier investors can work with our team to define custom risk parameters including maximum drawdown limits, instrument restrictions, and position size caps. Basic tier uses our standard risk profile.',
  },
];

export default async function PAMMPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main>
        {/* Hero */}
        <section className="border-b border-border">
          <div className="max-w-5xl mx-auto px-6 py-24">
            <p className="text-sm font-mono text-muted-foreground mb-4">PAMM ACCOUNT</p>
            <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-6">
              Managed trading with profit sharing.
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Allocate capital to our managed account and share in the returns. Your funds stay at the broker
              under your name. We handle execution, risk management, and reporting.
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
                <span>Investors with $5,000 or more who want exposure to algorithmic trading without managing trades themselves.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                <span>Professionals who lack the time to actively trade but want their capital working in liquid markets.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                <span>Traders who recognize the value of systematic execution but prefer to delegate to a proven track record.</span>
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
            <div className="grid md:grid-cols-2 gap-8 max-w-3xl">
              {PRICING.map((plan) => (
                <div key={plan.tier} className="border border-border rounded-lg p-8 bg-card">
                  <p className="text-sm font-mono text-muted-foreground mb-2">{plan.tier}</p>
                  <p className="font-display text-3xl font-semibold mb-1">
                    {plan.share}
                    <span className="text-base text-muted-foreground font-normal ml-2">{plan.label}</span>
                  </p>
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Onboarding */}
        <section className="border-b border-border">
          <div className="max-w-5xl mx-auto px-6 py-20">
            <h2 className="font-display text-2xl font-semibold mb-12">How to get started</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {STEPS.map((step, i) => (
                <div key={step.step} className="relative">
                  <p className="font-mono text-4xl text-muted-foreground/30 mb-4">{step.step}</p>
                  <h3 className="font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                  {i < STEPS.length - 1 && (
                    <ArrowRight className="hidden md:block absolute top-6 -right-5 w-5 h-5 text-muted-foreground/30" />
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
            <h2 className="font-display text-2xl font-semibold mb-4">Start investing today</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Open your managed account, fund it with your broker, and let our algorithms go to work.
            </p>
            <Link
              href="/register/pamm"
              className="inline-flex items-center gap-2 bg-accent text-accent-foreground rounded-md px-6 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Open account
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
