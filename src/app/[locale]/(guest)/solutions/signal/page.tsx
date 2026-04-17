'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { ArrowRight, BarChart3, Clock, Shield, Send, FileText, LineChart } from 'lucide-react';

const FEATURES = [
  { title: 'Real-time trade alerts', description: 'Receive entry, stop-loss, and take-profit levels the moment our system identifies a high-probability setup across 14 curated instruments.', icon: 'chart' },
  { title: 'Multi-timeframe analysis', description: 'Every signal is generated from confluence across H1, H4, and D1 timeframes, reducing false signals and improving hit rate.', icon: 'clock' },
  { title: 'Risk-sized recommendations', description: 'Each alert includes a suggested position size calibrated to your account balance and our 12-layer risk framework.', icon: 'shield' },
  { title: 'Telegram & MT5 delivery', description: 'Signals delivered instantly via private Telegram channel and can be auto-copied to your MT5 terminal with our trade copier.', icon: 'send' },
  { title: 'Weekly market brief', description: 'A concise research note every Monday covering key levels, macro catalysts, and the week-ahead outlook.', icon: 'file' },
  { title: 'Performance dashboard', description: 'Track every signal in your personal dashboard with full transparency: entry, exit, duration, and P&L for every trade.', icon: 'line' },
];

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  chart: <BarChart3 className="w-5 h-5 text-amber-400" />,
  clock: <Clock className="w-5 h-5 text-amber-400" />,
  shield: <Shield className="w-5 h-5 text-amber-400" />,
  send: <Send className="w-5 h-5 text-amber-400" />,
  file: <FileText className="w-5 h-5 text-amber-400" />,
  line: <LineChart className="w-5 h-5 text-amber-400" />,
};

const PRICING = [
  { tier: 'Signal Standard', price: '$49', period: '/mo', features: ['Up to 10 signals per week', 'Telegram channel access', 'Basic performance dashboard', 'Email support'] },
  { tier: 'Signal Pro', price: '$149', period: '/mo', popular: true, features: ['Unlimited signals', 'Telegram + MT5 trade copier', 'Full performance dashboard', 'Weekly market brief', 'Priority WhatsApp support', 'Early access to new strategies'] },
];

const STEPS = [
  { step: '01', title: 'Sign up', description: 'Create your account on BabahAlgo. Verify your email and complete your trader profile.' },
  { step: '02', title: 'Choose a plan', description: 'Select Standard or Pro and complete payment. We accept bank transfer, credit card, and crypto.' },
  { step: '03', title: 'Start trading', description: 'Within 1 business day, receive your Telegram invite, dashboard access, and MT5 copier setup guide.' },
];

const FAQ_FALLBACK = [
  { q: 'Do I need to change my broker?', a: 'No. Our signal service is broker-agnostic. You keep your existing broker account and simply execute the signals we provide, or use our MT5 trade copier.' },
  { q: 'What instruments do you cover?', a: 'We trade 14 carefully selected instruments across forex majors, crosses, and gold. Each has been validated through extensive backtesting and live trading.' },
  { q: 'What is the expected win rate?', a: 'Our historical win rate is approximately 62–68%. Our edge comes from favorable risk-reward ratios averaging 1:1.8 per trade.' },
  { q: 'Can I cancel at any time?', a: 'Yes. All subscriptions are month-to-month with no lock-in. Cancel before your next billing date. No questions asked.' },
  { q: 'What is the minimum account size?', a: 'We recommend $1,000 for Standard and $5,000 for Pro to properly follow position sizing recommendations.' },
];

interface FaqItem {
  q: string;
  a: string;
}

export default function SignalPage() {
  const [faq, setFaq] = useState<FaqItem[]>(FAQ_FALLBACK);

  useEffect(() => {
    async function loadFaq() {
      try {
        const res = await fetch('/api/public/faq?category=PRICING');
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setFaq(
            data.map((item: Record<string, unknown>) => ({
              q: (item.question as string) || (item.q as string) || '',
              a: (item.answer as string) || (item.a as string) || '',
            }))
          );
        }
      } catch {
        // keep fallback
      }
    }
    loadFaq();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">
        {/* Hero */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-4">Signal Service</p>
            <h1 className="t-display-page mb-6">
              Trading signals for<br className="hidden sm:block" /> retail traders.
            </h1>
            <p className="t-lead text-foreground/60 max-w-2xl">
              Institutional-grade trade alerts delivered to your Telegram and MT5 terminal.
              You keep full control of your capital and your broker relationship.
            </p>
            <div className="flex flex-wrap gap-4 mt-10">
              <Link href="/register/signal" className="btn-primary">
                Open Signal Account <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/performance" className="btn-secondary">
                View Track Record
              </Link>
            </div>
          </div>
        </section>

        {/* Pricing — prominent comparison table first */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-3">Pricing</p>
            <h2 className="t-display-sub mb-4">Choose your plan</h2>
            <p className="t-body text-foreground/60 mb-10 max-w-xl">
              Compare features side-by-side and pick the plan that fits your trading style.
            </p>

            {/* Comparison table */}
            <div className="table-enterprise-wrapper max-w-4xl">
              <table className="table-enterprise w-full">
                <thead>
                  <tr className="border-b border-white/8">
                    <th className="text-left px-6 py-4 w-1/2">Feature</th>
                    <th className="text-center px-6 py-4">
                      <span className="block text-foreground/80">Standard</span>
                      <span className="block font-display text-2xl font-medium mt-1">$49<span className="text-sm text-foreground/40 font-normal">/mo</span></span>
                    </th>
                    <th className="text-center px-6 py-4 relative">
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-xs font-medium px-3 py-0.5 rounded-full">Most popular</span>
                      <span className="block text-foreground/80">Pro</span>
                      <span className="block font-display text-2xl font-medium mt-1">$149<span className="text-sm text-foreground/40 font-normal">/mo</span></span>
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {[
                    { feature: 'Signals per week', standard: 'Up to 10', pro: 'Unlimited' },
                    { feature: 'Telegram channel', standard: true, pro: true },
                    { feature: 'MT5 trade copier', standard: false, pro: true },
                    { feature: 'Performance dashboard', standard: 'Basic', pro: 'Full' },
                    { feature: 'Weekly market brief', standard: false, pro: true },
                    { feature: 'Support channel', standard: 'Email', pro: 'Priority WhatsApp' },
                    { feature: 'Early access to strategies', standard: false, pro: true },
                  ].map((row) => (
                    <tr key={row.feature} className="border-b border-white/8 last:border-0">
                      <td className="px-6 py-3 text-foreground/70">{row.feature}</td>
                      <td className="px-6 py-3 text-center">
                        {typeof row.standard === 'boolean'
                          ? row.standard
                            ? <span className="text-amber-400 font-mono">Yes</span>
                            : <span className="text-foreground/25">--</span>
                          : <span className="text-foreground/60">{row.standard}</span>}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {typeof row.pro === 'boolean'
                          ? row.pro
                            ? <span className="text-amber-400 font-mono">Yes</span>
                            : <span className="text-foreground/25">--</span>
                          : <span className="text-foreground/60">{row.pro}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* CTA buttons under table */}
            <div className="flex flex-wrap gap-4 mt-8 max-w-4xl">
              <Link href="/register/signal" className="btn-secondary">
                Get Standard <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/register/signal" className="btn-primary">
                Get Pro <ArrowRight className="w-4 h-4" />
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
                  Retail traders with $1K–$50K who want data-driven entries without building their own system.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  Part-time traders who cannot monitor charts but want high-probability setups.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  Experienced traders looking to complement discretionary analysis with a quantitative edge.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Features — 2-column icon grid */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-3">Features</p>
            <h2 className="t-display-sub mb-12">What you get</h2>
            <div className="grid md:grid-cols-2 gap-x-12 gap-y-10">
              {FEATURES.map((f) => (
                <div key={f.title} className="flex items-start gap-5">
                  <div className="w-11 h-11 rounded-lg border border-white/8 bg-white/[0.03] flex items-center justify-center shrink-0">
                    {FEATURE_ICONS[f.icon]}
                  </div>
                  <div>
                    <h3 className="text-base font-medium mb-1.5">{f.title}</h3>
                    <p className="t-body-sm text-foreground/60 leading-relaxed">{f.description}</p>
                  </div>
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
                {faq.map((item) => (
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
            <h2 className="t-display-sub mb-4">Ready to start?</h2>
            <p className="t-body text-foreground/60 mb-8 max-w-lg mx-auto">
              Create your account, pick your plan, and receive your first signal within 24 hours.
            </p>
            <Link href="/register/signal" className="btn-primary">
              Open Signal Account <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
