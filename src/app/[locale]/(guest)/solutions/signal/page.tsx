import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

const FEATURES = [
  {
    title: 'Real-time trade alerts',
    description:
      'Receive entry, stop-loss, and take-profit levels the moment our system identifies a high-probability setup across 14 curated instruments.',
  },
  {
    title: 'Multi-timeframe analysis',
    description:
      'Every signal is generated from confluence across H1, H4, and D1 timeframes, reducing false signals and improving hit rate.',
  },
  {
    title: 'Risk-sized recommendations',
    description:
      'Each alert includes a suggested position size calibrated to your account balance and our 12-layer risk framework.',
  },
  {
    title: 'Telegram & MT5 delivery',
    description:
      'Signals are delivered instantly via a private Telegram channel and can be auto-copied to your MT5 terminal with our trade copier.',
  },
  {
    title: 'Weekly market brief',
    description:
      'A concise research note every Monday covering key levels, macro catalysts, and the week-ahead outlook for each instrument.',
  },
  {
    title: 'Performance dashboard',
    description:
      'Track every signal in your personal dashboard with full transparency: entry, exit, duration, and P&L for every trade.',
  },
];

const PRICING = [
  {
    tier: 'Basic',
    price: '$49',
    period: '/mo',
    features: [
      'Up to 10 signals per week',
      'Telegram channel access',
      'Basic performance dashboard',
      'Email support',
    ],
  },
  {
    tier: 'VIP',
    price: '$149',
    period: '/mo',
    features: [
      'Unlimited signals',
      'Telegram + MT5 trade copier',
      'Full performance dashboard',
      'Weekly market brief',
      'Priority support via WhatsApp',
      'Early access to new strategies',
    ],
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Sign up',
    description:
      'Create your account on the BabahAlgo platform. Verify your email and complete your trader profile.',
  },
  {
    step: '02',
    title: 'Pay',
    description:
      'Choose your plan and complete payment. We accept bank transfer, credit card, and cryptocurrency.',
  },
  {
    step: '03',
    title: 'Receive credentials',
    description:
      'Within 1 business day you will receive your Telegram invite link, dashboard access, and MT5 copier setup guide.',
  },
];

const FAQ = [
  {
    q: 'Do I need to change my broker?',
    a: 'No. Our signal service is broker-agnostic. You keep your existing broker account and simply execute the signals we provide, or use our MT5 trade copier to automate execution.',
  },
  {
    q: 'What instruments do you cover?',
    a: 'We trade 14 carefully selected instruments across forex majors (EUR/USD, GBP/USD, USD/JPY, AUD/USD), crosses, and gold (XAU/USD). Each instrument has been validated through extensive backtesting and live trading.',
  },
  {
    q: 'What is the expected win rate?',
    a: 'Our historical win rate across all instruments is approximately 62-68%. However, win rate alone is not a meaningful metric -- our edge comes from favorable risk-reward ratios averaging 1:1.8 per trade.',
  },
  {
    q: 'Can I cancel at any time?',
    a: 'Yes. All subscriptions are month-to-month with no lock-in. Cancel before your next billing date and you will not be charged again. No questions asked.',
  },
  {
    q: 'What is the minimum account size?',
    a: 'We recommend a minimum of $1,000 for Basic and $5,000 for VIP to properly follow position sizing recommendations. Smaller accounts can still follow signals but may need to adjust lot sizes.',
  },
];

export default async function SignalPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main>
        {/* Hero */}
        <section className="border-b border-border">
          <div className="max-w-5xl mx-auto px-6 py-24">
            <p className="text-sm font-mono text-muted-foreground mb-4">SIGNAL SERVICE</p>
            <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-6">
              Trading signals for retail traders.
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Institutional-grade trade alerts delivered to your Telegram and MT5 terminal.
              You keep full control of your capital and your broker relationship.
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
                <span>Retail traders with $1,000 to $50,000 in trading capital who want data-driven entries without building their own system.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                <span>Part-time traders who cannot monitor charts during market hours but still want to participate in high-probability setups.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                <span>Experienced traders looking to complement their discretionary analysis with a systematic, quantitative edge.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                <span>Traders who want full transparency into trade rationale, entry/exit logic, and verified performance history.</span>
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
                    {plan.price}
                    <span className="text-base text-muted-foreground font-normal">{plan.period}</span>
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
            <h2 className="font-display text-2xl font-semibold mb-4">Ready to start?</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Create your account, pick your plan, and receive your first signal within 24 hours.
            </p>
            <Link
              href="/register/signal"
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
