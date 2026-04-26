'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import {
  ArrowRight, BarChart3, Clock, Shield, Send, FileText, LineChart,
  Cpu, Activity, Award, Check,
} from 'lucide-react';
import { financialProductSchema, ldJson, breadcrumbSchema, faqPageSchema } from '@/lib/seo-jsonld';

// ─── Robot Meta — feature highlights ───
const FEATURES = [
  { title: 'Auto-eksekusi di MetaTrader 5', description: 'Bridge ZeroMQ native ke MT5 customer. Bot eksekusi entry, modify, dan close otomatis tanpa intervensi manual — modal tetap di akun broker Anda.', icon: 'cpu' },
  { title: 'Multi-strategi confluence', description: 'SMC + Wyckoff + Astronacci + AI Momentum + Mean-Reversion + Oil/Gas. Strategi paralel dengan multi-timeframe scoring (H4 → H1 → M15 → M5).', icon: 'chart' },
  { title: '12-lapisan risk control', description: 'Spread guard, news blackout, dynamic lot sizing, kill-switch — risk control adalah substrat, bukan fitur. Hadir di setiap trade.', icon: 'shield' },
  { title: 'Notifikasi multi-channel', description: 'Tier 2+ dapat WhatsApp + Telegram + Email per signal. Tier All-In tambah dedicated support 24/7 dan custom alert routing.', icon: 'send' },
  { title: 'AI Explainability per trade', description: 'Setiap entry punya rationale yang ter-log: confidence score, indikator yang trigger, dan counterfactual analysis untuk audit.', icon: 'file' },
  { title: 'Performance dashboard', description: 'Track equity curve real-time + per-trade audit trail. Sharpe ratio, win rate, profit factor — terupdate setiap eksekusi.', icon: 'line' },
];

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  cpu: <Cpu className="w-5 h-5 text-amber-400" />,
  chart: <BarChart3 className="w-5 h-5 text-amber-400" />,
  clock: <Clock className="w-5 h-5 text-amber-400" />,
  shield: <Shield className="w-5 h-5 text-amber-400" />,
  send: <Send className="w-5 h-5 text-amber-400" />,
  file: <FileText className="w-5 h-5 text-amber-400" />,
  line: <LineChart className="w-5 h-5 text-amber-400" />,
  activity: <Activity className="w-5 h-5 text-amber-400" />,
  award: <Award className="w-5 h-5 text-amber-400" />,
};

// ─── Robot Meta tier ladder (matches landing PRICING_PLANS.forex) ───
const PRICING = [
  {
    tier: 'TIER 1',
    name: 'Robot Meta · Swing',
    price: '$19',
    period: '/bulan',
    tagline: 'Entry tier — strategi swing untuk modal kecil',
    features: [
      '3 pair major (EURUSD · GBPUSD · USDJPY)',
      'Strategi swing only (durasi 4–24 jam)',
      'Indikator dasar: SMC + Wyckoff',
      'Notifikasi: Email + Dashboard',
      'Auto-eksekusi di MT5 Anda',
    ],
    cta: { label: 'Mulai Tier Swing', href: '/register/signal?tier=swing' },
  },
  {
    tier: 'TIER 2',
    name: 'Robot Meta · Scalping',
    price: '$79',
    period: '/bulan',
    popular: true,
    tagline: 'Trader aktif — swing + scalping multi-strategi',
    features: [
      '8 pair (Major · Cross · Gold · Silver)',
      'Strategi swing + scalping',
      'Indikator advanced: SMC + Wyckoff + AI Momentum',
      'Notifikasi: WhatsApp + Telegram + Email',
      'Mid-tier AI explainability per trade',
    ],
    cta: { label: 'Mulai Tier Scalping', href: '/register/signal?tier=scalping' },
  },
  {
    tier: 'TIER 3',
    name: 'Robot Meta · All-In',
    price: '$299',
    period: '/bulan',
    tagline: 'Premium full-stack — semua strategi, semua pair',
    features: [
      'Unlimited pair (Major · Cross · Metals · Index)',
      'Semua 6 strategi paralel',
      'Premium AI advisor + copy-trade dashboard',
      'Notifikasi all channels + dedicated support 24/7',
      'Custom backtest sweep + Payout API',
    ],
    cta: { label: 'Mulai Tier All-In', href: '/register/signal?tier=all' },
  },
];

const STEPS = [
  { step: '01', title: 'Daftar founding member', description: 'Akses founding member gratis selama beta. Verifikasi manual oleh tim, lalu kami kirim invite Telegram + dashboard credentials.' },
  { step: '02', title: 'Buka akun MT5 Exness', description: 'Daftar akun MT5 lewat partner broker Exness lewat link affiliate kami — Anda dapat discount commission, modal tetap di akun Anda.' },
  { step: '03', title: 'Connect bridge', description: 'Kami pasang ZmqEa di terminal MT5 Anda + lakukan health check end-to-end. Setelah hijau, bot mulai auto-eksekusi sesuai tier.' },
];

const FAQ_FALLBACK = [
  { q: 'Apa beda Robot Meta dengan signal-only service?', a: 'Robot Meta auto-eksekusi penuh di MT5 Anda — bot yang taruh order, modify SL/TP, dan close. Signal-only kirim alert tapi Anda harus eksekusi manual. Modal tetap di akun broker Anda di kedua skenario.' },
  { q: 'Apakah saya harus ganti broker?', a: 'Tidak wajib, tapi kami rekomendasikan partner broker Exness lewat link affiliate untuk discount commission. Bridge ZeroMQ kami compatible dengan MT5 broker mana saja yang allow EA/automated trading.' },
  { q: 'Berapa modal minimal untuk mulai?', a: 'Tier Swing $19/bulan: rekomendasi $1K minimum agar position sizing optimal. Tier Scalping $79: $5K minimum. Tier All-In $299: $25K minimum untuk diversifikasi multi-strategi.' },
  { q: 'Bagaimana risk management bekerja?', a: 'Setiap trade lewat 12-layer framework: pre-trade (spread guard, dynamic lot sizing, news blackout), in-trade (protective stop-loss, max hold time, breakeven trail), post-system (cooldown, catastrophic breaker, kill-switch). Detailnya di /platform/risk-framework.' },
  { q: 'Apakah ada demo atau free trial?', a: 'Ya. Robot Meta · Demo gratis 7 hari di akun MT5 demo Anda — bot full eksekusi tapi di paper money. Akses /demo untuk daftar.' },
  { q: 'Bisa cancel kapan saja?', a: 'Ya, semua tier month-to-month tanpa lock-in. Cancel kapan saja sebelum billing date berikutnya. Bot auto-detach dari MT5 Anda setelah cancel.' },
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

  const breadcrumb = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Solutions', url: '/solutions' },
    { name: 'Robot Meta', url: '/solutions/signal' },
  ]);
  const faqJson = faqPageSchema(faq.map((f) => ({ question: f.q, answer: f.a })));
  const tierProducts = PRICING.map((tier) => financialProductSchema({
    name: `${tier.name} — ${tier.price}${tier.period}`,
    description: tier.features.join(' · '),
    price: tier.price.replace(/[^0-9.]/g, ''),
    currency: 'USD',
    url: '/solutions/signal',
  }));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(faqJson) }} />
      {tierProducts.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(schema) }} />
      ))}
      <EnterpriseNav />
      <main id="main-content">
        {/* Hero */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">Robot Meta · MetaTrader 5</p>
            <h1 className="t-display-page mb-6">
              Auto-trading Forex<br className="hidden sm:block" /> di terminal Anda.
            </h1>
            <p className="t-lead text-foreground/60 max-w-2xl">
              Bot institusional yang eksekusi langsung di akun MT5 Anda lewat bridge ZeroMQ
              sub-2ms target. Forex Major, Cross, Gold, dan Silver — modal tetap di broker
              Anda, kami tidak custody dana sama sekali.
            </p>
            <div className="flex flex-wrap gap-4 mt-10">
              <Link href="/register/signal?tier=scalping" className="btn-primary">
                Daftar Robot Meta <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/demo?product=robot-meta" className="btn-secondary">
                Coba Demo Gratis
              </Link>
              <Link href="/performance" className="btn-tertiary">
                Lihat track record
              </Link>
            </div>
            <p className="text-xs text-foreground/50 mt-6 max-w-2xl">
              Sedang fase beta. Akses gratis untuk founding members hingga track record live
              90 hari produksi (Q3 2026). Pricing tier di bawah berlaku setelah beta selesai.
            </p>
          </div>
        </section>

        {/* Pricing — 3-tier card layout */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">Pricing — Pasca Beta</p>
            <h2 className="t-display-sub mb-4">Tiga tier, satu platform</h2>
            <p className="t-body text-foreground/60 mb-10 max-w-2xl">
              Semakin tinggi tier, semakin banyak pair, strategi, dan kanal notifikasi.
              Semua tier mendapat framework risiko 12-layer yang sama — itu non-negotiable.
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              {PRICING.map((tier) => (
                <div
                  key={tier.name}
                  className={`rounded-xl p-6 sm:p-7 border transition-colors ${
                    tier.popular
                      ? 'border-amber-500 ring-1 ring-amber-500 bg-amber-500/[0.02]'
                      : 'border-border/80 hover:border-amber-500/30 bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="t-eyebrow text-amber-400">{tier.tier}</span>
                    {tier.popular && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[11px] font-medium tracking-wider uppercase">
                        Popular
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-xl font-medium mb-1">{tier.name}</h3>
                  <p className="t-body-sm text-muted-foreground mb-4">{tier.tagline}</p>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="font-mono text-3xl font-semibold">{tier.price}</span>
                    <span className="t-body-sm text-foreground/40">{tier.period}</span>
                  </div>
                  <ul className="space-y-2.5 mb-6">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 t-body-sm text-foreground/85">
                        <Check className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <span className="break-words">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={tier.cta.href}
                    className={`w-full justify-center ${tier.popular ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {tier.cta.label}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Who it's for */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <div className="grid lg:grid-cols-5 gap-16">
              <div className="lg:col-span-2">
                <p className="t-eyebrow mb-3">Audience</p>
                <h2 className="t-display-sub">Untuk siapa Robot Meta</h2>
              </div>
              <ul className="lg:col-span-3 space-y-5 t-body text-foreground/70">
                <li className="flex items-start gap-3">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  Trader retail dengan modal $1K–$50K yang ingin sistematik tanpa harus bangun bot sendiri.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  Part-time trader yang tidak bisa pantau chart 24/7 tapi ingin setup high-probability tetap dieksekusi.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  Trader berpengalaman yang mau konsisten via auto-execution tanpa bias emosional.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  Asset manager / family office yang ingin diversifikasi multi-strategi dengan auditable execution log.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Features grid */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">Features</p>
            <h2 className="t-display-sub mb-12">Apa yang Anda dapat</h2>
            <div className="grid md:grid-cols-2 gap-x-12 gap-y-10">
              {FEATURES.map((f) => (
                <div key={f.title} className="flex items-start gap-5">
                  <div className="w-11 h-11 rounded-lg border border-border/60 bg-muted/40 flex items-center justify-center shrink-0">
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
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">Onboarding</p>
            <h2 className="t-display-sub mb-12">Tiga langkah saja</h2>
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
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <div className="grid lg:grid-cols-5 gap-16">
              <div className="lg:col-span-2">
                <p className="t-eyebrow mb-3">FAQ</p>
                <h2 className="t-display-sub">Pertanyaan umum</h2>
              </div>
              <div className="lg:col-span-3 space-y-8">
                {faq.map((item) => (
                  <div key={item.q} className="border-b border-border/40 pb-8 last:border-b-0">
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
          <div className="container-default px-4 sm:px-6">
            <h2 className="t-display-sub mb-4">Siap mulai dengan Robot Meta?</h2>
            <p className="t-body text-foreground/60 mb-8 max-w-lg mx-auto">
              Daftar founding member gratis selama beta — atau coba demo dulu di akun MT5 demo
              tanpa risiko modal real.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/contact?subject=beta-founding-member" className="btn-primary">
                Daftar Founding Member <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/demo?product=robot-meta" className="btn-secondary">
                Coba Demo Gratis
              </Link>
            </div>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
