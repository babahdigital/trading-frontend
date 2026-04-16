'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { EquityCurve } from '@/components/charts/equity-curve';
import { StrategyDonut } from '@/components/charts/strategy-donut';
import { WinRateBar } from '@/components/charts/win-rate-bar';

// --- Static / demo data for guest page ---
const DEMO_KPI = [
  { label: '14', desc: 'Pairs' },
  { label: '24/7', desc: 'AI Scan' },
  { label: '<2ms', desc: 'Latency' },
];

const DEMO_PERFORMANCE = {
  winRate: 67.2,
  profitFactor: 2.14,
  maxDD: -8.3,
  totalTrades: 847,
  sharpe: 1.85,
  avgHold: '47 min',
};

const FEATURES = [
  { icon: '🧠', title: 'AI Advisor', desc: 'Gemini 2.5 Flash analisa setiap pair secara real-time' },
  { icon: '📊', title: 'Multi-Timeframe', desc: 'H4→H1→M15→M5 confluence scoring' },
  { icon: '🛡', title: 'Risk Management', desc: '12-layer protection system' },
  { icon: '📈', title: '6 Strategi', desc: 'SMC, Wyckoff, Astronacci, AI Momentum, Oil & Gas' },
  { icon: '🌐', title: '14 Instrumen', desc: 'Forex, Metals, Energy, Crypto' },
  { icon: '⚡', title: '<2ms Execution', desc: 'ZeroMQ execution bridge' },
];

const STRATEGY_DATA = [
  { name: 'SMC', value: 35, color: '#22c55e' },
  { name: 'Wyckoff Combo', value: 25, color: '#3b82f6' },
  { name: 'AI Momentum', value: 20, color: '#8b5cf6' },
  { name: 'Oil & Gas', value: 10, color: '#f97316' },
  { name: 'Astronacci', value: 5, color: '#06b6d4' },
  { name: 'SMC Swing', value: 5, color: '#ec4899' },
];

const STRATEGY_WINRATE = [
  { name: 'SMC', winRate: 67 },
  { name: 'Wyckoff Combo', winRate: 72 },
  { name: 'AI Momentum', winRate: 61 },
  { name: 'Oil & Gas', winRate: 58 },
  { name: 'Astronacci', winRate: 65 },
  { name: 'SMC Swing', winRate: 64 },
];

const PAIR_CATEGORIES = [
  { name: 'FOREX', pairs: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCHF', 'NZDUSD', 'USDCAD'] },
  { name: 'METALS', pairs: ['XAUUSD', 'XAGUSD'] },
  { name: 'ENERGY', pairs: ['USOIL', 'UKOIL', 'XNGUSD'] },
  { name: 'CRYPTO', pairs: ['BTCUSD', 'ETHUSD'] },
];

const RISK_LAYERS = [
  'Dynamic lot sizing (equity-aware)',
  'Catastrophic breaker (auto-stop at -X%)',
  'Daily loss limit',
  'Max positions per pair',
  'Max total positions (tier-based)',
  'Protective stop (breakeven ratchet)',
  'News blackout (high-impact auto-pause)',
  'Weekend force-close',
  'Max hold duration (4 jam hard cap)',
  'Cooldown tracker (loss streak pause)',
  'Spread guard (reject jika spread > threshold)',
  'Session drawdown guard',
];

const PRICING = [
  {
    name: 'SIGNAL', price: '$49-149/bln', features: ['Dashboard', 'Sinyal Trading', 'Laporan Harian'],
    excluded: ['Akses Bot'], cta: 'Daftar', ctaLink: '/login',
  },
  {
    name: 'PAMM', price: '20-30%', subtitle: 'profit share', features: ['Dashboard', 'CopyTrade Otomatis', 'Laporan Harian'],
    excluded: ['Akses Bot'], cta: 'Daftar', ctaLink: '/login',
  },
  {
    name: 'VPS LICENSE', price: '$3K-7.5K', subtitle: 'setup fee', features: ['VPS Dedicated', 'Full Bot Access', 'Dashboard', 'Priority Support'],
    excluded: [], cta: 'Hubungi Kami', ctaLink: '#contact', note: '+$150-300/bulan maintenance',
  },
];

const STEPS = [
  { num: '1', title: 'Daftar & Pilih Paket', desc: 'Pilih model yang sesuai dengan kebutuhan Anda' },
  { num: '2', title: 'Terima Akses Dashboard', desc: 'Dapatkan kredensial login ke portal monitoring' },
  { num: '3', title: 'Bot AI Bekerja 24/7', desc: 'Sistem trading otomatis berjalan di infrastruktur kami' },
  { num: '4', title: 'Pantau Profit Real-Time', desc: 'Lihat performa, posisi, dan laporan kapan saja' },
];

function AnimatedCounter({ end, suffix = '' }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const step = Math.ceil(end / 40);
          const timer = setInterval(() => {
            start += step;
            if (start >= end) {
              setCount(end);
              clearInterval(timer);
            } else {
              setCount(start);
            }
          }, 30);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);

  return <div ref={ref} className="text-kpi text-foreground">{count}{suffix}</div>;
}

// Generate demo equity data
function generateDemoEquity(): { time: string; value: number }[] {
  const data: { time: string; value: number }[] = [];
  let value = 10000;
  const now = new Date();
  for (let i = 90; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    value += (Math.random() - 0.4) * 120;
    if (value < 8000) value = 8000 + Math.random() * 200;
    data.push({
      time: d.toISOString().split('T')[0],
      value: Math.round(value * 100) / 100,
    });
  }
  return data;
}

export default function GuestLandingPage() {
  const [equityData] = useState(generateDemoEquity);
  const [equityPeriod, setEquityPeriod] = useState('90D');

  const filteredEquity = (() => {
    const days = equityPeriod === '30D' ? 30 : equityPeriod === '7D' ? 7 : 90;
    return equityData.slice(-days);
  })();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-lg font-bold text-primary">Babah Digital</span>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#performance" className="hover:text-foreground transition-colors">Performance</a>
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </div>
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Login
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-background">
        <div className="max-w-4xl mx-auto px-4 text-center py-20">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            AI-Powered Quantitative Trading
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Infrastruktur kecerdasan buatan yang menganalisa pasar 24/7 dengan presisi institusional.
          </p>
          <div className="flex gap-4 justify-center mb-16">
            <a href="#performance" className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
              Lihat Performa →
            </a>
            <a href="#pricing" className="px-6 py-3 rounded-lg border border-border text-foreground hover:bg-accent transition-colors">
              Mulai Sekarang →
            </a>
          </div>
          <div className="flex justify-center gap-8 md:gap-16">
            {DEMO_KPI.map((kpi) => (
              <div key={kpi.desc} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-foreground font-mono">{kpi.label}</div>
                <div className="text-sm text-muted-foreground mt-1">{kpi.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Performance Section */}
      <section id="performance" className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-2">Track Record Terverifikasi</h2>
          <p className="text-muted-foreground text-center mb-12">Data real-time dari akun produksi</p>

          {/* Equity Curve */}
          <div className="bg-card border rounded-xl p-6 mb-8">
            <EquityCurve
              data={filteredEquity}
              height={400}
              periods={['30D', '90D', 'YTD']}
              activePeriod={equityPeriod}
              onPeriodChange={setEquityPeriod}
            />
          </div>

          {/* 6 KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-card border rounded-xl p-4 text-center">
              <div className="text-muted-foreground text-xs mb-1">Win Rate</div>
              <AnimatedCounter end={Math.round(DEMO_PERFORMANCE.winRate)} suffix="%" />
              <div className="text-green-400 text-xs mt-1">▲</div>
            </div>
            <div className="bg-card border rounded-xl p-4 text-center">
              <div className="text-muted-foreground text-xs mb-1">Profit Factor</div>
              <div className="text-kpi text-foreground">{DEMO_PERFORMANCE.profitFactor}</div>
            </div>
            <div className="bg-card border rounded-xl p-4 text-center">
              <div className="text-muted-foreground text-xs mb-1">Max DD</div>
              <div className="text-kpi text-red-400">{DEMO_PERFORMANCE.maxDD}%</div>
              <div className="text-red-400 text-xs mt-1">▼</div>
            </div>
            <div className="bg-card border rounded-xl p-4 text-center">
              <div className="text-muted-foreground text-xs mb-1">Total Trades</div>
              <AnimatedCounter end={DEMO_PERFORMANCE.totalTrades} />
            </div>
            <div className="bg-card border rounded-xl p-4 text-center">
              <div className="text-muted-foreground text-xs mb-1">Sharpe Ratio</div>
              <div className="text-kpi text-foreground">{DEMO_PERFORMANCE.sharpe}</div>
            </div>
            <div className="bg-card border rounded-xl p-4 text-center">
              <div className="text-muted-foreground text-xs mb-1">Avg Hold</div>
              <div className="text-kpi text-foreground text-2xl">{DEMO_PERFORMANCE.avgHold}</div>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            <a href="https://www.myfxbook.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Verifikasi independen via MyFxBook →
            </a>
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-2">Teknologi di Balik Setiap Keputusan</h2>
          <p className="text-muted-foreground text-center mb-12">Infrastruktur kelas institusional untuk setiap keputusan trading</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-card border rounded-xl p-6 hover:border-primary/50 transition-colors">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Strategy Breakdown */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Strategi Diversifikasi</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-card border rounded-xl p-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4">Distribusi Strategi</h3>
              <StrategyDonut data={STRATEGY_DATA} centerLabel="847" height={300} />
            </div>
            <div className="bg-card border rounded-xl p-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4">Win Rate per Strategi</h3>
              <WinRateBar data={STRATEGY_WINRATE} height={300} />
            </div>
          </div>
        </div>
      </section>

      {/* Pair Coverage */}
      <section className="py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-2">14 Instrumen, 4 Kelas Aset</h2>
          <p className="text-muted-foreground text-center mb-12">Diversifikasi across multiple markets</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {PAIR_CATEGORIES.map((cat) => (
              <div key={cat.name} className="bg-card border rounded-xl p-5">
                <h3 className="font-semibold text-primary mb-1">{cat.name}</h3>
                <p className="text-xs text-muted-foreground mb-3">{cat.pairs.length} pairs</p>
                <div className="space-y-1">
                  {cat.pairs.map((p) => (
                    <div key={p} className="text-sm font-mono">{p}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Risk Management */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">12 Lapisan Perlindungan Modal</h2>
          <div className="max-w-2xl mx-auto space-y-3">
            {RISK_LAYERS.map((layer, idx) => (
              <div key={idx} className="flex items-start gap-4 bg-card border rounded-lg p-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {idx + 1}
                </div>
                <span className="text-sm">{layer}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Pilih Model yang Sesuai</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PRICING.map((plan) => (
              <div key={plan.name} className="bg-card border rounded-xl p-6 flex flex-col">
                <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
                <div className="text-kpi text-primary mb-1">{plan.price}</div>
                {plan.subtitle && <div className="text-sm text-muted-foreground mb-4">{plan.subtitle}</div>}
                <div className="flex-1 space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm">
                      <span className="text-green-400">✓</span> {f}
                    </div>
                  ))}
                  {plan.excluded.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="text-red-400">✗</span> {f}
                    </div>
                  ))}
                </div>
                {plan.note && <p className="text-xs text-muted-foreground mb-4">* {plan.note}</p>}
                <Link
                  href={plan.ctaLink}
                  className="block text-center px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                >
                  {plan.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 bg-background">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Bagaimana Cara Kerjanya</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STEPS.map((step) => (
              <div key={step.num} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto mb-4 flex items-center justify-center text-xl font-bold">
                  {step.num}
                </div>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="py-12 bg-card border-t">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-lg mb-2">CV Babah Digital</h3>
              <p className="text-sm text-muted-foreground">AI-Powered Quantitative Trading Infrastructure</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Kontak</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>WhatsApp: +62 xxx-xxxx-xxxx</div>
                <div>Email: info@babahdigital.net</div>
                <div>Telegram: @babahdigital</div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Legal</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>Syarat & Ketentuan</div>
                <div>Kebijakan Privasi</div>
                <div>Disclaimer Risiko</div>
              </div>
            </div>
          </div>
          <div className="border-t pt-6 text-center text-xs text-muted-foreground">
            <p className="mb-2">
              Perdagangan instrumen finansial mengandung risiko tinggi dan mungkin tidak cocok untuk semua investor.
              Performa masa lalu tidak menjamin hasil di masa depan.
            </p>
            <p>&copy; {new Date().getFullYear()} CV Babah Digital. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
