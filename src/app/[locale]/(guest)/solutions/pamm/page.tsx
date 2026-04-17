import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

const FEATURES = [
  { title: 'Fully managed execution', description: 'Our algorithms execute trades on your behalf from a master account. No manual intervention — your capital works while you focus on other priorities.' },
  { title: 'Transparent profit sharing', description: 'You only pay performance fees on realized profits. If the account does not generate returns in a given period, you pay nothing.' },
  { title: 'Real-time monitoring', description: 'Access your dedicated dashboard to monitor equity, drawdown, open positions, and historical performance in real time.' },
  { title: '12-layer risk framework', description: 'Every trade passes through our proprietary risk engine covering position sizing, correlation limits, volatility filters, and drawdown circuit breakers.' },
  { title: 'Monthly reporting', description: 'Receive a detailed monthly performance report including trade-by-trade breakdown, risk metrics, and commentary on market conditions.' },
  { title: 'Flexible withdrawals', description: 'Request a partial or full withdrawal at any time. Processed within 3 business days through your broker, with no lock-up period.' },
];

const PRICING = [
  { tier: 'PAMM Standard', share: '20%', label: 'profit share', features: ['Minimum allocation: $5,000', 'Standard risk profile', 'Monthly performance reports', 'Email support', 'Dashboard access'] },
  { tier: 'PAMM Premier', share: '30%', label: 'profit share', popular: true, features: ['Minimum allocation: $25,000', 'Aggressive risk profile available', 'Weekly performance reports', 'Priority WhatsApp support', 'Custom risk parameters', 'Quarterly strategy review call'] },
];

const STEPS = [
  { step: '01', title: 'Open account', description: 'Register on BabahAlgo and complete your investor profile. We assess your risk tolerance and return expectations.' },
  { step: '02', title: 'Fund your account', description: 'Open a trading account with our partner broker and deposit your capital. Your funds remain in your name at all times.' },
  { step: '03', title: 'Start earning', description: 'Once your account is linked to our master account, trading begins automatically. Monitor performance from your dashboard.' },
];

const FAQ = [
  { q: 'Is my capital safe?', a: 'Your funds are held at a regulated broker in a segregated client account under your name. BabahAlgo has trading authority only — we cannot withdraw your funds.' },
  { q: 'What is the minimum investment?', a: 'Standard requires $5,000, Premier requires $25,000. These minimums ensure proper position sizing across our instrument universe.' },
  { q: 'How is profit share calculated?', a: 'Calculated on net realized profits using a high-water mark. You never pay performance fees on recovering previous losses. Fees are deducted monthly.' },
  { q: 'What happens during a drawdown?', a: 'Our risk framework includes hard drawdown limits. If the account reaches a predefined threshold, trading is automatically reduced or paused.' },
  { q: 'Can I set custom risk parameters?', a: 'Premier investors can define custom parameters including maximum drawdown limits, instrument restrictions, and position size caps.' },
];

export default async function PAMMPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">
        {/* Hero */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-4">PAMM Account</p>
            <h1 className="t-display-page mb-6">
              Managed trading with<br className="hidden sm:block" /> profit sharing.
            </h1>
            <p className="t-lead text-foreground/60 max-w-2xl">
              Allocate capital to our managed account and share in the returns. Your funds stay at the broker
              under your name. We handle execution, risk management, and reporting.
            </p>
            <div className="flex flex-wrap gap-4 mt-10">
              <Link href="/register/pamm" className="btn-primary">
                Apply for PAMM <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/performance" className="btn-secondary">
                View Track Record
              </Link>
            </div>
          </div>
        </section>

        {/* Who it's for */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <div className="grid lg:grid-cols-5 gap-16">
              <div className="lg:col-span-2">
                <p className="t-eyebrow mb-3">Audience</p>
                <h2 className="t-display-sub">Who it&apos;s for</h2>
              </div>
              <ul className="lg:col-span-3 space-y-5 t-body text-foreground/70">
                <li className="flex items-start gap-3">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  Investors with $5K+ who want exposure to algorithmic trading without managing trades themselves.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  Professionals who lack time to actively trade but want their capital working in liquid markets.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  Traders who recognize the value of systematic execution and prefer to delegate to a proven record.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-3">Features</p>
            <h2 className="t-display-sub mb-12">What you get</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((f) => (
                <div key={f.title} className="card-enterprise">
                  <h3 className="text-lg font-medium mb-3">{f.title}</h3>
                  <p className="t-body-sm text-foreground/60 leading-relaxed">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-3">Pricing</p>
            <h2 className="t-display-sub mb-12">Choose your tier</h2>
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {PRICING.map((plan) => (
                <div key={plan.tier} className={`card-enterprise relative ${plan.popular ? 'border-amber-500/40' : ''}`}>
                  {plan.popular && (
                    <span className="absolute -top-3 left-6 bg-amber-500 text-black text-xs font-medium px-3 py-1 rounded-full">
                      Recommended
                    </span>
                  )}
                  <p className="t-eyebrow mb-3">{plan.tier}</p>
                  <p className="font-display text-4xl font-medium mb-1">
                    {plan.share}<span className="text-lg text-foreground/40 font-normal ml-2">{plan.label}</span>
                  </p>
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-sm text-foreground/60">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/register/pamm" className={`mt-8 w-full justify-center ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}>
                    Apply now <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Onboarding */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-3">Getting Started</p>
            <h2 className="t-display-sub mb-12">Three simple steps</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {STEPS.map((step, i) => (
                <div key={step.step} className="relative">
                  <p className="font-mono text-5xl text-amber-500/20 mb-4">{step.step}</p>
                  <h3 className="text-lg font-medium mb-2">{step.title}</h3>
                  <p className="t-body-sm text-foreground/60 leading-relaxed">{step.description}</p>
                  {i < STEPS.length - 1 && (
                    <ArrowRight className="hidden md:block absolute top-6 -right-5 w-5 h-5 text-foreground/20" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <div className="grid lg:grid-cols-5 gap-16">
              <div className="lg:col-span-2">
                <p className="t-eyebrow mb-3">FAQ</p>
                <h2 className="t-display-sub">Common questions</h2>
              </div>
              <div className="lg:col-span-3 space-y-8">
                {FAQ.map((item) => (
                  <div key={item.q} className="border-b border-white/[0.04] pb-8 last:border-b-0">
                    <h3 className="text-base font-medium mb-2">{item.q}</h3>
                    <p className="t-body-sm text-foreground/60 leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section-padding text-center">
          <div className="container-default px-6">
            <h2 className="t-display-sub mb-4">Start investing today</h2>
            <p className="t-body text-foreground/60 mb-8 max-w-lg mx-auto">
              Open your managed account, fund it with your broker, and let our algorithms go to work.
            </p>
            <Link href="/register/pamm" className="btn-primary">
              Apply for PAMM <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
