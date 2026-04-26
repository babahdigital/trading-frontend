import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { getPageMetadata } from '@/lib/seo';
import { breadcrumbSchema, faqPageSchema, ldJson, organizationSchema } from '@/lib/seo-jsonld';
import {
  ArrowRight,
  Bitcoin,
  ShieldCheck,
  Zap,
  Cpu,
  Activity,
  KeyRound,
  AlertOctagon,
  Check,
  TrendingUp,
} from 'lucide-react';

export async function generateMetadata() {
  return getPageMetadata('/solutions/crypto', {
    title: 'Robot Crypto — Auto-trading di Binance | BabahAlgo',
    description:
      'Robot Crypto institusional untuk Binance Spot + USDT-M Futures. Strategi SMC, Wyckoff, dan momentum 24/7 dengan framework risiko 12-layer. Modal tetap di akun Binance Anda — tidak ada custody dana.',
  });
}

const FEATURES = [
  {
    icon: Cpu,
    title: 'Strategi Institusional',
    desc: 'Smart Money Concepts, Wyckoff Method, dan momentum continuation. 6 strategi independen dengan confluence-scoring di backend.',
  },
  {
    icon: ShieldCheck,
    title: 'Anda Pegang API Key',
    desc: 'Dana selalu di Binance Anda. Bot hanya mengeksekusi trade — tidak bisa withdraw karena permission diatur khusus Read + Trade.',
  },
  {
    icon: Activity,
    title: 'Eksekusi 24/7',
    desc: 'Pasar kripto tidak tidur — bot juga tidak. Setiap detik bot men-scan order book, indikator, dan kondisi makro lintas timeframe.',
  },
  {
    icon: AlertOctagon,
    title: 'Kill Switch & Leverage Cap',
    desc: 'Tier-based leverage cap (5x → 15x), liquidation buffer ATR-based, daily loss limit, kill switch self-serve dan operator-grade.',
  },
  {
    icon: Zap,
    title: 'Latensi Rendah',
    desc: 'Direct REST + WebSocket ke Binance Futures API. Order routing dengan slippage budget yang bisa dikalibrasi per strategi.',
  },
  {
    icon: KeyRound,
    title: 'Vault-Backed Secret',
    desc: 'API key dienkripsi via Fernet master key + HashiCorp Vault. Rotation otomatis tiap 90 hari, audit trail untuk semua akses.',
  },
];

const TIERS = [
  {
    id: 'basic',
    name: 'Crypto Basic',
    price: '$49',
    period: '/bulan',
    profitShare: '+ 20% profit share',
    description: 'Entry tier untuk trader yang baru otomatisasi crypto.',
    features: [
      '3 pair otomatis (top-3 dynamic ranking)',
      'Leverage maksimal 5x',
      '3 posisi paralel',
      'Strategi: scalping_momentum',
      'Notifikasi Telegram + dashboard',
      'Email support',
    ],
    cta: 'Pilih Basic',
  },
  {
    id: 'pro',
    name: 'Crypto Pro',
    price: '$199',
    period: '/bulan',
    profitShare: '+ 15% profit share',
    description: 'Untuk trader aktif yang butuh diversifikasi multi-strategi.',
    popular: true,
    features: [
      '8 pair otomatis (top-8 + 1 manual whitelist)',
      'Leverage maksimal 10x',
      '5 posisi paralel',
      'Strategi: SMC, Wyckoff, Momentum, Mean Reversion',
      'Live equity polling 5 detik',
      'Telegram VIP + priority support',
    ],
    cta: 'Pilih Pro',
  },
  {
    id: 'hnwi',
    name: 'Crypto HNWI',
    price: '$499',
    period: '/bulan',
    profitShare: '+ 10% profit share',
    description: 'Untuk capital besar dengan pair custom & risk profile khusus.',
    features: [
      '12 pair + custom whitelist/blacklist',
      'Leverage maksimal 15x',
      '8 posisi paralel',
      'Semua strategi + parameter tuning',
      'Dedicated account manager',
      'SLA 99.9% + monthly review call',
    ],
    cta: 'Konsultasi HNWI',
  },
];

const STRATEGIES = [
  { name: 'Scalping Momentum', timeframe: 'M5/M15', market: 'Futures', desc: 'High-frequency entries riding momentum bursts setelah konfirmasi volume + ATR filter.' },
  { name: 'Swing SMC', timeframe: 'H1/H4', market: 'Spot + Futures', desc: 'Order block + Fair Value Gap setups dengan minimum risk-reward ratio 2.0.' },
  { name: 'Wyckoff Breakout', timeframe: 'H4', market: 'Spot + Futures', desc: 'Akumulasi/distribusi phase detection + spring-then-breakout dengan volume confirmation.' },
  { name: 'Mean Reversion', timeframe: 'M15', market: 'Futures', desc: 'Range-bound futures setups — fade overshoot 2σ ke VWAP.' },
  { name: 'Spot DCA Trend', timeframe: 'H4', market: 'Spot', desc: 'Trend-following dollar-cost averaging dengan 4 step interval 2% pullback.' },
  { name: 'Spot Swing Trend', timeframe: 'H4', market: 'Spot', desc: 'Trend continuation dengan trailing stop 2x ATR, optimal saat regime trending.' },
];

const STEPS = [
  {
    step: '01',
    title: 'Daftar & KYC',
    desc: 'Registrasi email + verifikasi identitas (KYC) sesuai standar institusional. Selesai dalam 1-2 hari kerja.',
  },
  {
    step: '02',
    title: 'Pilih Tier & Bayar',
    desc: 'Pilih Basic / Pro / HNWI di /pricing. Pembayaran via Midtrans (kartu kredit, transfer, e-wallet) atau Xendit.',
  },
  {
    step: '03',
    title: 'Hubungkan Binance',
    desc: 'Buat API key di Binance dengan permission Read + Futures Trade (NO Withdraw). Submit di portal — verifikasi 5 detik.',
  },
  {
    step: '04',
    title: 'Bot Aktif',
    desc: 'Strategi sesuai tier langsung berjalan. Monitor di /portal/crypto: equity real-time, posisi terbuka, riwayat, leverage, kill switch.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Bot ini berbeda dari copy-trading biasa?',
    a: 'Berbeda. Copy-trading meniru posisi trader lain. Bot kami menjalankan algoritma kuantitatif independen — strategi sudah backtested, ada risk overlay, dan tidak bergantung pada satu trader. Performance reproducible.',
  },
  {
    q: 'Bagaimana keamanan API key?',
    a: 'Kami WAJIB customer membuat API key dengan permission "Enable Reading" dan "Enable Futures Trade" SAJA — JANGAN aktifkan "Enable Withdrawals". Backend kami juga akan REJECT key yang punya withdraw permission. Selain itu, key dienkripsi via Fernet + HashiCorp Vault.',
  },
  {
    q: 'Berapa modal minimum untuk Crypto Basic?',
    a: 'Rekomendasi minimum $500 USDT di Binance Futures untuk Basic ($1,000 untuk Pro, $10,000 untuk HNWI). Jumlah lebih kecil tetap bisa, namun position sizing 1% akan terbatas dan compound effect berkurang.',
  },
  {
    q: 'Apa expected win rate dan drawdown?',
    a: 'Berdasarkan backtest 2 tahun: win rate 55-62% (lebih rendah dari forex karena volatilitas), namun risk-reward rata-rata 1:2.3 sehingga profit factor positif. Max drawdown historis -12.5% pada periode crash 2024-Q3.',
  },
  {
    q: 'Apakah bisa pakai testnet dulu?',
    a: 'Bisa. Saat submit API key ada toggle "testnet". Bot akan menjalankan strategi di Binance Testnet (uang simulasi) dengan flow yang sama persis. Banyak customer pakai 1 minggu testnet sebelum live.',
  },
  {
    q: 'Bagaimana kalau Binance maintenance atau saya mau pause sementara?',
    a: 'Customer bisa trigger kill switch self-serve di /portal/crypto/risk dengan alasan. Bot halt dispatcher pass — posisi terbuka tetap dengan SL/TP, tidak force-close. Setelah maintenance selesai, kontak support untuk cabut kill switch.',
  },
];

export default function CryptoBotSolutionPage() {
  const breadcrumb = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Solutions', url: '/solutions/signal' },
    { name: 'Robot Crypto', url: '/solutions/crypto' },
  ]);
  const faq = faqPageSchema(FAQ_ITEMS.map((f) => ({ question: f.q, answer: f.a })));
  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(organizationSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(faq) }} />
      <EnterpriseNav />
      <main id="main-content">
        {/* Hero */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-mono uppercase tracking-wider text-amber-300 mb-6">
                <Bitcoin className="w-3.5 h-3.5" />
                Robot Crypto · Binance
              </div>
              <h1 className="t-display-page mb-5">
                Auto-trading kripto,<br />kelas institusional.
              </h1>
              <p className="t-lead text-foreground/70 mb-8 max-w-2xl">
                Strategi SMC + Wyckoff + Momentum yang sama dipakai trader profesional, dieksekusi
                oleh bot 24/7 di Binance Spot + USDT-M Futures. Anda pegang API key — kami tidak
                bisa withdraw dana Anda. Modal tetap di akun Binance Anda.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/register/crypto" className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
                  Daftar Robot Crypto <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/demo?product=robot-crypto" className="btn-secondary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
                  Coba Demo Gratis
                </Link>
                <Link href="/contact?subject=crypto-consultation" className="btn-tertiary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
                  Konsultasi HNWI
                </Link>
              </div>
              <p className="text-xs text-foreground/50 mt-6 max-w-2xl">
                Sedang fase beta. Akses gratis untuk founding members hingga track record live
                90 hari produksi (Q3 2026). Pricing tier di bawah berlaku setelah beta selesai.
              </p>
              <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm">
                <Stat label="Pair Universe" value="200+" sub="CMC top-200 dynamic" />
                <Stat label="Min Investasi" value="$500" sub="USDT di Binance" />
                <Stat label="Strategi" value="6" sub="Multi-confluence" />
                <Stat label="API Scope" value="Read+Trade" sub="No withdraw permission" />
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">Mengapa Crypto Bot</p>
            <h2 className="t-display-section mb-12 max-w-2xl">
              Otomasi institusional, transparansi penuh.
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map((f) => (
                <div key={f.title} className="card-enterprise">
                  <div className="icon-container mb-4">
                    <f.icon className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">{f.title}</h3>
                  <p className="t-body-sm text-foreground/65 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Strategies */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">Strategi yang dijalankan</p>
            <h2 className="t-display-section mb-3 max-w-2xl">6 strategi, satu engine.</h2>
            <p className="t-body text-foreground/60 max-w-2xl mb-12">
              Setiap strategi punya entry rule, position sizing, dan stop logic sendiri. Multi-strategy diversification mengurangi
              correlation drawdown saat regime pasar berubah.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {STRATEGIES.map((s) => (
                <div key={s.name} className="card-enterprise group">
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <h3 className="text-base font-semibold">{s.name}</h3>
                    <TrendingUp className="w-4 h-4 text-amber-400 shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground">
                      {s.timeframe}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground">
                      {s.market}
                    </span>
                  </div>
                  <p className="t-body-sm text-foreground/65 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">Pricing</p>
            <h2 className="t-display-section mb-3 max-w-2xl">Pilih tier sesuai capital Anda.</h2>
            <p className="t-body text-foreground/60 max-w-2xl mb-12">
              Profit share dipotong otomatis dari realized PnL bulanan. Bila PnL negatif, hanya monthly fee yang kena.
            </p>
            <div className="grid md:grid-cols-3 gap-5">
              {TIERS.map((t) => (
                <div
                  key={t.id}
                  id={t.id}
                  className={`card-enterprise flex flex-col relative ${t.popular ? 'border-amber-500/50 ring-2 ring-amber-500/20' : ''}`}
                >
                  {t.popular && (
                    <span className="absolute -top-3 left-6 inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500 text-amber-50 text-[10px] font-bold uppercase tracking-wider">
                      Populer
                    </span>
                  )}
                  <h3 className="text-xl font-semibold mb-1">{t.name}</h3>
                  <p className="text-sm text-foreground/60 mb-5">{t.description}</p>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-bold">{t.price}</span>
                    <span className="text-sm text-foreground/50">{t.period}</span>
                  </div>
                  <p className="text-xs text-amber-400 font-mono uppercase tracking-wider mb-6">{t.profitShare}</p>
                  <ul className="space-y-2.5 mb-8 flex-1">
                    {t.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-foreground/80 leading-relaxed">
                        <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={t.id === 'hnwi' ? '/contact?subject=crypto-hnwi' : `/register/crypto?tier=${t.id}`}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                      t.popular
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'border border-border hover:bg-accent hover:border-amber-500/40'
                    }`}
                  >
                    {t.cta} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
            <p className="text-xs text-foreground/50 mt-6 text-center">
              Semua tier inklusif kill switch, leverage cap per tier, audit log, dan akses dashboard real-time.
            </p>
          </div>
        </section>

        {/* Steps */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">Cara mulai</p>
            <h2 className="t-display-section mb-12 max-w-2xl">4 langkah, kurang dari 24 jam.</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {STEPS.map((s) => (
                <div key={s.step} className="card-enterprise">
                  <div className="t-eyebrow mb-3 text-amber-400">{s.step}</div>
                  <h3 className="text-base font-semibold mb-2">{s.title}</h3>
                  <p className="t-body-sm text-foreground/65 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">FAQ</p>
            <h2 className="t-display-section mb-12 max-w-2xl">Pertanyaan umum.</h2>
            <div className="grid md:grid-cols-2 gap-x-10 gap-y-8 max-w-5xl">
              {FAQ_ITEMS.map((item) => (
                <div key={item.q}>
                  <h3 className="text-base font-semibold mb-2 leading-snug">{item.q}</h3>
                  <p className="t-body-sm text-foreground/70 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section-padding">
          <div className="container-default px-4 sm:px-6 text-center max-w-3xl mx-auto">
            <h2 className="t-display-section mb-4">Siap aktivasi bot Anda?</h2>
            <p className="t-body text-foreground/60 mb-8">
              Onboarding lengkap dengan KYC, payment, dan koneksi Binance dapat selesai dalam 24 jam kerja.
              Tidak ada kontrak — bisa cancel kapan saja.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register/crypto" className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
                Mulai Sekarang <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/contact" className="btn-secondary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
                Tanyakan ke Tim Kami
              </Link>
            </div>
            <p className="text-xs text-foreground/40 mt-8 max-w-xl mx-auto leading-relaxed">
              <strong>Disclaimer:</strong> Trading kripto sangat volatil. Kinerja masa lalu tidak menjamin hasil masa depan.
              Bot ini untuk trader berpengalaman. Jangan gunakan dana yang tidak Anda relakan untuk hilang.
            </p>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div className="t-eyebrow mb-1">{label}</div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-[11px] text-foreground/50 font-mono mt-0.5">{sub}</div>
    </div>
  );
}
