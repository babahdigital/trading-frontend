'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { motion } from 'framer-motion';
import { EquityCurve } from '@/components/charts/equity-curve';
import { StrategyDonut } from '@/components/charts/strategy-donut';
import { WinRateBar } from '@/components/charts/win-rate-bar';
import { DynamicSection } from '@/components/cms/dynamic-section';
import { AnimatedSection } from '@/components/ui/animated-section';
import { StaggerContainer, StaggerItem } from '@/components/ui/stagger-container';
import { SmoothAccordion } from '@/components/ui/smooth-accordion';
import { LanguageSwitcher } from '@/components/ui/language-switcher';

// --- Fallback data (used when CMS has no content) ---
const FALLBACK_HERO_KPIS = [
  { label: '14', desc: 'Pairs' },
  { label: '24/7', desc: 'AI Scan' },
  { label: '<2ms', desc: 'Latency' },
];

const FALLBACK_PERFORMANCE = {
  winRate: 67.2, profitFactor: 2.14, maxDD: -8.3, totalTrades: 847, sharpe: 1.85, avgHold: '47 min',
};

const FALLBACK_FEATURES = [
  { icon: 'brain', title: 'AI Advisor', desc: 'Gemini 2.5 Flash analisa setiap pair secara real-time' },
  { icon: 'chart', title: 'Multi-Timeframe', desc: 'H4→H1→M15→M5 confluence scoring' },
  { icon: 'shield', title: 'Risk Management', desc: '12-layer protection system' },
  { icon: 'trending', title: '6 Strategi', desc: 'SMC, Wyckoff, Astronacci, AI Momentum, Oil & Gas' },
  { icon: 'globe', title: '14 Instrumen', desc: 'Forex, Metals, Energy, Crypto' },
  { icon: 'zap', title: '<2ms Execution', desc: 'ZeroMQ execution bridge' },
];

const FALLBACK_STRATEGIES = [
  { name: 'SMC', value: 35, color: '#22c55e' },
  { name: 'Wyckoff Combo', value: 25, color: '#3b82f6' },
  { name: 'AI Momentum', value: 20, color: '#8b5cf6' },
  { name: 'Oil & Gas', value: 10, color: '#f97316' },
  { name: 'Astronacci', value: 5, color: '#06b6d4' },
  { name: 'SMC Swing', value: 5, color: '#ec4899' },
];

const FALLBACK_WINRATES = [
  { name: 'SMC', winRate: 67 },
  { name: 'Wyckoff Combo', winRate: 72 },
  { name: 'AI Momentum', winRate: 61 },
  { name: 'Oil & Gas', winRate: 58 },
  { name: 'Astronacci', winRate: 65 },
  { name: 'SMC Swing', winRate: 64 },
];

const FALLBACK_PAIRS = [
  { name: 'FOREX', pairs: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCHF', 'NZDUSD', 'USDCAD'] },
  { name: 'METALS', pairs: ['XAUUSD', 'XAGUSD'] },
  { name: 'ENERGY', pairs: ['USOIL', 'UKOIL', 'XNGUSD'] },
  { name: 'CRYPTO', pairs: ['BTCUSD', 'ETHUSD'] },
];

const FALLBACK_RISK_LAYERS = [
  'Dynamic lot sizing (equity-aware)', 'Catastrophic breaker (auto-stop at -X%)',
  'Daily loss limit', 'Max positions per pair', 'Max total positions (tier-based)',
  'Protective stop (breakeven ratchet)', 'News blackout (high-impact auto-pause)',
  'Weekend force-close', 'Max hold duration (4 jam hard cap)',
  'Cooldown tracker (loss streak pause)', 'Spread guard (reject jika spread > threshold)',
  'Session drawdown guard',
];

const FALLBACK_STEPS = [
  { num: '1', title: 'Daftar & Pilih Paket', desc: 'Pilih model yang sesuai dengan kebutuhan Anda' },
  { num: '2', title: 'Terima Akses Dashboard', desc: 'Dapatkan kredensial login ke portal monitoring' },
  { num: '3', title: 'Bot AI Bekerja 24/7', desc: 'Sistem trading otomatis berjalan di infrastruktur kami' },
  { num: '4', title: 'Pantau Profit Real-Time', desc: 'Lihat performa, posisi, dan laporan kapan saja' },
];

const ICON_MAP: Record<string, string> = {
  brain: '🧠', chart: '📊', shield: '🛡', trending: '📈', globe: '🌐', zap: '⚡',
};

// --- Helpers ---
function getSection(sections: Record<string, { title: string; subtitle: string | null; content: Record<string, unknown> }>, slug: string) {
  return sections[slug] || null;
}

function AnimatedCounter({ end, suffix = '' }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = 0;
        const step = Math.ceil(end / 40);
        const timer = setInterval(() => {
          start += step;
          if (start >= end) { setCount(end); clearInterval(timer); } else { setCount(start); }
        }, 30);
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);

  return <div ref={ref} className="text-kpi text-foreground">{count}{suffix}</div>;
}

function generateDemoEquity(): { time: string; value: number }[] {
  const data: { time: string; value: number }[] = [];
  let value = 10000;
  const now = new Date();
  for (let i = 90; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    value += (Math.random() - 0.4) * 120;
    if (value < 8000) value = 8000 + Math.random() * 200;
    data.push({ time: d.toISOString().split('T')[0], value: Math.round(value * 100) / 100 });
  }
  return data;
}

// --- Types ---
interface LandingClientProps {
  sections: Record<string, { title: string; subtitle: string | null; content: Record<string, unknown> }>;
  pricingTiers: Array<{ id: string; slug: string; name: string; price: string; subtitle: string | null; features: unknown; excluded: unknown; note: string | null; ctaLabel: string; ctaLink: string }>;
  testimonials: Array<{ id: string; name: string; role: string | null; content: string; rating: number; avatarUrl: string | null }>;
  faqs: Array<{ id: string; question: string; answer: string; category: string }>;
}

export function LandingClient({ sections, pricingTiers, testimonials, faqs }: LandingClientProps) {
  const t = useTranslations();
  const [equityData] = useState(generateDemoEquity);
  const [equityPeriod, setEquityPeriod] = useState('90D');

  const filteredEquity = (() => {
    const days = equityPeriod === '30D' ? 30 : equityPeriod === '7D' ? 7 : 90;
    return equityData.slice(-days);
  })();

  // Extract CMS data with fallbacks
  const hero = getSection(sections, 'hero');
  const heroKpis = (hero?.content?.kpis as Array<{ label: string; desc: string }>) || FALLBACK_HERO_KPIS;
  const heroCtaPrimary = (hero?.content?.ctaPrimary as { label: string; href: string }) || { label: 'Lihat Performa', href: '#performance' };
  const heroCtaSecondary = (hero?.content?.ctaSecondary as { label: string; href: string }) || { label: 'Mulai Sekarang', href: '#pricing' };

  const perf = getSection(sections, 'performance');
  const metrics = (perf?.content?.metrics as typeof FALLBACK_PERFORMANCE) || FALLBACK_PERFORMANCE;

  const feat = getSection(sections, 'features');
  const features = (feat?.content?.items as typeof FALLBACK_FEATURES) || FALLBACK_FEATURES;

  const strat = getSection(sections, 'strategies');
  const stratDistribution = (strat?.content?.distribution as typeof FALLBACK_STRATEGIES) || FALLBACK_STRATEGIES;
  const stratWinRates = (strat?.content?.winRates as typeof FALLBACK_WINRATES) || FALLBACK_WINRATES;

  const pairsSection = getSection(sections, 'pairs');
  const pairCategories = (pairsSection?.content?.categories as typeof FALLBACK_PAIRS) || FALLBACK_PAIRS;

  const riskSection = getSection(sections, 'risk');
  const riskLayers = (riskSection?.content?.layers as string[]) || FALLBACK_RISK_LAYERS;

  const howSection = getSection(sections, 'how-it-works');
  const howSteps = (howSection?.content?.steps as typeof FALLBACK_STEPS) || FALLBACK_STEPS;

  const ctaSection = getSection(sections, 'cta');
  const footerSection = getSection(sections, 'footer');
  const footerContact = (footerSection?.content?.contact as { whatsapp: string; email: string; telegram: string }) || { whatsapp: '+62 xxx-xxxx-xxxx', email: 'info@babahalgo.com', telegram: '@babahalgo' };
  const footerLegal = (footerSection?.content?.legal as string[]) || ['Syarat & Ketentuan', 'Kebijakan Privasi', 'Disclaimer Risiko'];
  const footerDisclaimer = (footerSection?.content?.disclaimer as string) || 'Perdagangan instrumen finansial mengandung risiko tinggi dan mungkin tidak cocok untuk semua investor. Performa masa lalu tidak menjamin hasil di masa depan.';

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-primary">BabahAlgo</Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#performance" className="hover:text-foreground transition-colors">{t('nav.performance')}</a>
            <a href="#features" className="hover:text-foreground transition-colors">{t('nav.features')}</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">{t('nav.pricing')}</a>
            <a href="#faq" className="hover:text-foreground transition-colors">{t('nav.faq')}</a>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link href="/login" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              {t('nav.login')}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-[80vh] flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-background">
        <div className="max-w-4xl mx-auto px-4 text-center py-20">
          <AnimatedSection>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              {hero?.title || 'AI-Powered Quantitative Trading'}
            </h1>
          </AnimatedSection>
          <AnimatedSection delay={0.2}>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              {hero?.subtitle || 'Infrastruktur kecerdasan buatan yang menganalisa pasar 24/7 dengan presisi institusional.'}
            </p>
          </AnimatedSection>
          <AnimatedSection delay={0.3}>
            <div className="flex gap-4 justify-center mb-16">
              <a href={heroCtaPrimary.href} className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
                {heroCtaPrimary.label} →
              </a>
              <a href={heroCtaSecondary.href} className="px-6 py-3 rounded-lg border border-border text-foreground hover:bg-accent transition-colors">
                {heroCtaSecondary.label} →
              </a>
            </div>
          </AnimatedSection>
          <StaggerContainer className="flex justify-center gap-8 md:gap-16" staggerDelay={0.15}>
            {heroKpis.map((kpi) => (
              <StaggerItem key={kpi.desc} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-foreground font-mono">{kpi.label}</div>
                <div className="text-sm text-muted-foreground mt-1">{kpi.desc}</div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Performance */}
      <section id="performance" className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4">
          <AnimatedSection>
            <h2 className="text-3xl font-bold text-center mb-2">{perf?.title || 'Track Record Terverifikasi'}</h2>
            <p className="text-muted-foreground text-center mb-12">{perf?.subtitle || 'Data real-time dari akun produksi'}</p>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <div className="bg-card border rounded-xl p-6 mb-8">
              <EquityCurve data={filteredEquity} height={400} periods={['30D', '90D', 'YTD']} activePeriod={equityPeriod} onPeriodChange={setEquityPeriod} />
            </div>
          </AnimatedSection>

          <StaggerContainer className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <StaggerItem>
              <div className="bg-card border rounded-xl p-4 text-center card-hover">
                <div className="text-muted-foreground text-xs mb-1">Win Rate</div>
                <AnimatedCounter end={Math.round(metrics.winRate)} suffix="%" />
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="bg-card border rounded-xl p-4 text-center card-hover">
                <div className="text-muted-foreground text-xs mb-1">Profit Factor</div>
                <div className="text-kpi text-foreground">{metrics.profitFactor}</div>
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="bg-card border rounded-xl p-4 text-center card-hover">
                <div className="text-muted-foreground text-xs mb-1">Max DD</div>
                <div className="text-kpi text-red-400">{metrics.maxDD}%</div>
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="bg-card border rounded-xl p-4 text-center card-hover">
                <div className="text-muted-foreground text-xs mb-1">Total Trades</div>
                <AnimatedCounter end={metrics.totalTrades} />
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="bg-card border rounded-xl p-4 text-center card-hover">
                <div className="text-muted-foreground text-xs mb-1">Sharpe Ratio</div>
                <div className="text-kpi text-foreground">{metrics.sharpe}</div>
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="bg-card border rounded-xl p-4 text-center card-hover">
                <div className="text-muted-foreground text-xs mb-1">Avg Hold</div>
                <div className="text-kpi text-foreground text-2xl">{metrics.avgHold}</div>
              </div>
            </StaggerItem>
          </StaggerContainer>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4">
          <AnimatedSection>
            <h2 className="text-3xl font-bold text-center mb-2">{feat?.title || 'Teknologi di Balik Setiap Keputusan'}</h2>
            <p className="text-muted-foreground text-center mb-12">{feat?.subtitle || ''}</p>
          </AnimatedSection>
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" staggerDelay={0.08}>
            {features.map((f) => (
              <StaggerItem key={f.title}>
                <div className="bg-card border rounded-xl p-6 hover:border-primary/50 transition-colors card-hover">
                  <div className="text-3xl mb-3">{ICON_MAP[f.icon] || f.icon}</div>
                  <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Strategies */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4">
          <AnimatedSection>
            <h2 className="text-3xl font-bold text-center mb-12">{strat?.title || 'Strategi Diversifikasi'}</h2>
          </AnimatedSection>
          <div className="grid md:grid-cols-2 gap-8">
            <AnimatedSection direction="left" delay={0.1}>
              <div className="bg-card border rounded-xl p-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-4">Distribusi Strategi</h3>
                <StrategyDonut data={stratDistribution} centerLabel={String(metrics.totalTrades)} height={300} />
              </div>
            </AnimatedSection>
            <AnimatedSection direction="right" delay={0.1}>
              <div className="bg-card border rounded-xl p-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-4">Win Rate per Strategi</h3>
                <WinRateBar data={stratWinRates} height={300} />
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Pairs */}
      <section className="py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4">
          <AnimatedSection>
            <h2 className="text-3xl font-bold text-center mb-2">{pairsSection?.title || '14 Instrumen, 4 Kelas Aset'}</h2>
            <p className="text-muted-foreground text-center mb-12">{pairsSection?.subtitle || ''}</p>
          </AnimatedSection>
          <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {pairCategories.map((cat) => (
              <StaggerItem key={cat.name}>
                <div className="bg-card border rounded-xl p-5 card-hover">
                  <h3 className="font-semibold text-primary mb-1">{cat.name}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{cat.pairs.length} pairs</p>
                  <div className="space-y-1">
                    {cat.pairs.map((p) => <div key={p} className="text-sm font-mono">{p}</div>)}
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Risk Management */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4">
          <AnimatedSection>
            <h2 className="text-3xl font-bold text-center mb-12">{riskSection?.title || '12 Lapisan Perlindungan Modal'}</h2>
          </AnimatedSection>
          <StaggerContainer className="max-w-2xl mx-auto space-y-3" staggerDelay={0.06}>
            {riskLayers.map((layer, idx) => (
              <StaggerItem key={idx}>
                <div className="flex items-start gap-4 bg-card border rounded-lg p-4 card-hover">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">{idx + 1}</div>
                  <span className="text-sm">{layer}</span>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4">
          <AnimatedSection>
            <h2 className="text-3xl font-bold text-center mb-12">{getSection(sections, 'pricing')?.title || 'Pilih Model yang Sesuai'}</h2>
          </AnimatedSection>
          <StaggerContainer className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {(pricingTiers.length > 0 ? pricingTiers.filter((t) => ['signal-basic', 'pamm-basic', 'vps-license'].includes(t.slug) || pricingTiers.length <= 5) : [
              { id: '1', slug: 'signal', name: 'SIGNAL', price: '$49-149/bln', subtitle: null, features: ['Dashboard', 'Sinyal Trading', 'Laporan Harian'], excluded: ['Akses Bot'], note: null, ctaLabel: 'Daftar', ctaLink: '/register/signal' },
              { id: '2', slug: 'pamm', name: 'PAMM', price: '20-30%', subtitle: 'profit share', features: ['Dashboard', 'CopyTrade Otomatis', 'Laporan Harian'], excluded: ['Akses Bot'], note: null, ctaLabel: 'Daftar', ctaLink: '/register/pamm' },
              { id: '3', slug: 'vps', name: 'VPS LICENSE', price: '$3K-7.5K', subtitle: 'setup fee', features: ['VPS Dedicated', 'Full Bot Access', 'Dashboard', 'Priority Support'], excluded: [], note: '+$150-300/bulan maintenance', ctaLabel: 'Hubungi Kami', ctaLink: '/register/vps' },
            ]).map((plan, idx) => {
              const planFeatures = Array.isArray(plan.features) ? plan.features as string[] : [];
              const planExcluded = Array.isArray(plan.excluded) ? plan.excluded as string[] : [];
              const isPopular = idx === 1;
              return (
                <StaggerItem key={plan.id}>
                  <div className={`bg-card border rounded-xl p-6 flex flex-col h-full card-hover ${isPopular ? 'card-glow gradient-border' : ''}`}>
                  <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
                  <div className="text-kpi text-primary mb-1">{plan.price}</div>
                  {plan.subtitle && <div className="text-sm text-muted-foreground mb-4">{plan.subtitle}</div>}
                  <div className="flex-1 space-y-2 mb-6">
                    {planFeatures.map((f) => (
                      <div key={f} className="flex items-center gap-2 text-sm"><span className="text-green-400">&#10003;</span> {f}</div>
                    ))}
                    {planExcluded.map((f) => (
                      <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground"><span className="text-red-400">&#10007;</span> {f}</div>
                    ))}
                  </div>
                  {plan.note && <p className="text-xs text-muted-foreground mb-4">* {plan.note}</p>}
                  <Link href={plan.ctaLink} className="block text-center px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
                    {plan.ctaLabel} →
                  </Link>
                </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 bg-background">
        <div className="max-w-5xl mx-auto px-4">
          <AnimatedSection>
            <h2 className="text-3xl font-bold text-center mb-12">{howSection?.title || 'Bagaimana Cara Kerjanya'}</h2>
          </AnimatedSection>
          <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {howSteps.map((step) => (
              <StaggerItem key={step.num}>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto mb-4 flex items-center justify-center text-xl font-bold">{step.num}</div>
                  <h3 className="font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="py-20 bg-card/50">
          <div className="max-w-7xl mx-auto px-4">
            <AnimatedSection>
              <h2 className="text-3xl font-bold text-center mb-2">{getSection(sections, 'testimonials')?.title || 'Apa Kata Mereka'}</h2>
              <p className="text-muted-foreground text-center mb-12">{getSection(sections, 'testimonials')?.subtitle || ''}</p>
            </AnimatedSection>
            <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {testimonials.map((t) => (
                <StaggerItem key={t.id}>
                  <div className="bg-card border rounded-xl p-6 card-hover">
                    <div className="text-yellow-400 mb-3">{'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}</div>
                    <p className="text-sm mb-4 text-muted-foreground">&ldquo;{t.content}&rdquo;</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                        {t.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{t.name}</div>
                        {t.role && <div className="text-xs text-muted-foreground">{t.role}</div>}
                      </div>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>
      )}

      {/* FAQ */}
      {faqs.length > 0 && (
        <section id="faq" className="py-20 bg-background">
          <div className="max-w-3xl mx-auto px-4">
            <AnimatedSection>
              <h2 className="text-3xl font-bold text-center mb-2">{getSection(sections, 'faq')?.title || 'FAQ'}</h2>
              <p className="text-muted-foreground text-center mb-12">{getSection(sections, 'faq')?.subtitle || ''}</p>
            </AnimatedSection>
            <AnimatedSection delay={0.2}>
              <SmoothAccordion items={faqs.map((faq) => ({ id: faq.id, question: faq.question, answer: faq.answer }))} />
            </AnimatedSection>
          </div>
        </section>
      )}

      {/* Dynamic CMS Sections (custom sections added by admin) */}
      {Object.entries(sections)
        .filter(([slug]) => !['hero', 'performance', 'features', 'strategies', 'pairs', 'risk', 'pricing', 'how-it-works', 'testimonials', 'faq', 'cta', 'footer'].includes(slug))
        .map(([slug, data]) => (
          <DynamicSection key={slug} slug={slug} title={data.title} subtitle={data.subtitle} content={data.content} />
        ))}

      {/* CTA */}
      <section className="py-20 bg-gradient-to-b from-background to-slate-900">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <AnimatedSection>
            <h2 className="text-3xl font-bold mb-4">{ctaSection?.title || 'Siap Memulai?'}</h2>
            <p className="text-muted-foreground mb-8">{ctaSection?.subtitle || 'Bergabung dengan ratusan trader yang sudah menggunakan BabahAlgo'}</p>
          </AnimatedSection>
          <AnimatedSection delay={0.2}>
            <div className="flex gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link href={(ctaSection?.content?.ctaPrimary as { href: string })?.href || '/register'} className="inline-block px-8 py-4 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl">
                  {(ctaSection?.content?.ctaPrimary as { label: string })?.label || 'Daftar Sekarang'} →
                </Link>
              </motion.div>
              <Link href={(ctaSection?.content?.ctaSecondary as { href: string })?.href || '/register/vps'} className="px-8 py-4 rounded-lg border border-border text-foreground hover:bg-accent transition-colors">
                {(ctaSection?.content?.ctaSecondary as { label: string })?.label || 'Hubungi Kami'} →
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="py-12 bg-card border-t">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-lg mb-2">{footerSection?.title || 'BabahAlgo'}</h3>
              <p className="text-sm text-muted-foreground">{footerSection?.subtitle || 'Autonomous Intelligence. Institutional Precision.'}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Kontak</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>WhatsApp: {footerContact.whatsapp}</div>
                <div>Email: {footerContact.email}</div>
                <div>Telegram: {footerContact.telegram}</div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Legal</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                {footerLegal.map((item) => (
                  <div key={item}>{item}</div>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t pt-6 text-center text-xs text-muted-foreground">
            <p className="mb-2">{footerDisclaimer}</p>
            <p>&copy; {new Date().getFullYear()} BabahAlgo. {t('footer.copyright', { year: new Date().getFullYear() }).replace(`© ${new Date().getFullYear()} BabahAlgo. `, '')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
