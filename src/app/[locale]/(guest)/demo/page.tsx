import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import {
  ArrowRight, ShieldCheck, Bitcoin, TrendingUp, Sparkles,
  AlertTriangle, Check,
} from 'lucide-react';
import { getPageMetadata } from '@/lib/seo';
import { breadcrumbSchema, financialProductSchema, ldJson, organizationSchema } from '@/lib/seo-jsonld';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return getPageMetadata('/demo', {
    title: 'Demo Gratis — Robot Meta · Robot Crypto · Indicator | BabahAlgo',
    description:
      'Coba Robot Meta (MT5 demo) atau Robot Crypto (Binance Testnet) gratis selama beta. Tidak masuk track record live. Upgrade ke tier berbayar kapan saja.',
  });
}

const DEMO_TRACKS = [
  {
    icon: TrendingUp,
    eyebrow: 'ROBOT META · MT5 DEMO',
    title: 'Forex auto-execute, paper money',
    tagline: '7 hari trial · akun MT5 demo Anda · semua 6 strategi terbatas',
    bullets: [
      'Bot full eksekusi di akun MT5 demo Anda',
      'Akses semua strategi (SMC · Wyckoff · Astronacci · AI Momentum · Mean-Rev · Oil/Gas)',
      'Dashboard live + signal preview',
      'Notifikasi via Email selama trial',
      'Upgrade ke tier Swing / Scalping / All-In kapan saja',
    ],
    cta: { label: 'Mulai Robot Meta Demo', href: '/register/signal?mode=demo&product=robot-meta' },
    popular: true,
  },
  {
    icon: Bitcoin,
    eyebrow: 'ROBOT CRYPTO · BINANCE TESTNET',
    title: 'Bot crypto, paper money Binance',
    tagline: '7 hari trial · Binance Testnet · Spot + Futures simulation',
    bullets: [
      'Auto-trading di Binance Testnet (uang simulasi)',
      '3 strategi crypto aktif (scalping_momentum · SMC · Mean-Rev)',
      'Dashboard live + Telegram channel preview',
      'API key submission flow real (testnet scope)',
      'Upgrade ke Basic / Pro / HNWI kapan saja',
    ],
    cta: { label: 'Mulai Robot Crypto Demo', href: '/register/crypto?mode=demo' },
  },
  {
    icon: Sparkles,
    eyebrow: 'INDICATOR FREE',
    title: 'Overlay analitik, tanpa eksekusi',
    tagline: 'Permanent free · untuk discretionary trader',
    bullets: [
      'SMC + Wyckoff confluence overlay untuk MetaTrader 5',
      'Real-time scoring 14 instrumen',
      '12-layer risk score live preview',
      'Tidak ada eksekusi otomatis — Anda yang pegang kendali',
      'Untuk trader manual yang ingin edge analitik',
    ],
    cta: { label: 'Aktifkan Indicator', href: '/contact?subject=indicator-beta' },
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Daftar email',
    desc: 'Email saja — verifikasi standar, tidak perlu KYC untuk demo. 30 detik.',
  },
  {
    step: '02',
    title: 'Pilih track demo',
    desc: 'Robot Meta (MT5 demo), Robot Crypto (Binance Testnet), atau Indicator overlay. Bisa coba lebih dari satu.',
  },
  {
    step: '03',
    title: 'Connect akun demo Anda',
    desc: 'Buat akun MT5 demo di broker pilihan (Exness/IC Markets) atau API key Binance Testnet — submit di dashboard.',
  },
  {
    step: '04',
    title: 'Evaluate sampai trial habis',
    desc: 'Pakai sebanyak Anda mau. Saat upgrade ke live, status Anda dipertahankan + ada bonus founding member.',
  },
];

export default function DemoPage() {
  const breadcrumb = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Demo', url: '/demo' },
  ]);
  const demoProduct = financialProductSchema({
    name: 'Demo Gratis — Robot Meta · Robot Crypto · Indicator',
    description: 'Tiga jalur demo paralel: Robot Meta di MT5 demo, Robot Crypto di Binance Testnet, atau Indicator overlay permanent-free.',
    price: '0',
    currency: 'USD',
    url: '/demo',
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(organizationSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(demoProduct) }} />
      <EnterpriseNav />
      <main id="main-content">
        {/* Hero */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-mono uppercase tracking-wider text-amber-300 mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                Free · Beta Program
              </div>
              <h1 className="t-display-page mb-5">
                Coba dulu —<br className="hidden sm:block" /> tanpa risiko modal nyata.
              </h1>
              <p className="t-lead text-foreground/70 mb-8 max-w-2xl">
                Tiga jalur demo paralel: Robot Meta di akun MT5 demo, Robot Crypto di
                Binance Testnet, atau Indicator overlay untuk discretionary trader.
                Semua gratis selama beta — tidak masuk track record live, tidak menyentuh
                modal nyata.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <Link href="/register/signal?mode=demo&product=robot-meta" className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
                  Mulai Robot Meta <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/register/crypto?mode=demo" className="btn-secondary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
                  Mulai Robot Crypto
                </Link>
                <Link href="/contact?subject=indicator-beta" className="btn-tertiary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
                  Request Indicator
                </Link>
              </div>
              <p className="text-xs text-muted-foreground mt-6">
                Tanpa kartu kredit. Email verification cukup. Demo expired 7 hari
                (auto-archive); Indicator permanent.
              </p>
            </div>
          </div>
        </section>

        {/* Demo isolation banner */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <div className="rounded-lg border-2 border-amber-500/40 bg-amber-500/5 p-5 sm:p-6 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="font-semibold text-amber-200 mb-1.5">
                  Demo = simulasi penuh, bukan modal nyata
                </h2>
                <p className="text-sm text-amber-200/80 leading-relaxed">
                  Trade di akun MT5 demo / Binance Testnet 100% simulasi. Tidak
                  menyentuh modal nyata, tidak ditampilkan di public track record,
                  dan tidak dihitung untuk verified performance. Equity demo selalu
                  ditandai{' '}
                  <code className="font-mono px-1 bg-amber-500/10 rounded">(simulasi)</code>{' '}
                  di seluruh dashboard untuk hindari kebingungan.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3-track demo cards */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">PILIH JALUR DEMO</p>
            <h2 className="t-display-sub mb-4">Tiga track, satu disiplin</h2>
            <p className="t-body text-foreground/60 max-w-2xl mb-12">
              Boleh coba ketiga track — banyak founding members evaluate Robot Meta
              + Robot Crypto secara paralel sebelum memilih tier live. Indicator gratis
              permanen untuk pelengkap analisa manual.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {DEMO_TRACKS.map((t) => (
                <div
                  key={t.title}
                  className={`rounded-xl p-6 sm:p-7 border transition-colors ${
                    t.popular
                      ? 'border-amber-500 ring-1 ring-amber-500 bg-amber-500/[0.02]'
                      : 'border-border/80 bg-card hover:border-amber-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className="icon-container">
                      <t.icon className="w-5 h-5 text-amber-400" />
                    </div>
                    {t.popular && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[11px] font-medium tracking-wider uppercase">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="t-eyebrow text-amber-400 mb-2">{t.eyebrow}</p>
                  <h3 className="font-display text-xl font-medium mb-2">{t.title}</h3>
                  <p className="t-body-sm text-foreground/65 leading-relaxed mb-5">
                    {t.tagline}
                  </p>
                  <ul className="space-y-2 mb-6">
                    {t.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 t-body-sm text-foreground/85">
                        <Check className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={t.cta.href}
                    className={`w-full justify-center ${t.popular ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {t.cta.label}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">CARA MULAI</p>
            <h2 className="t-display-sub mb-4">Empat langkah, kurang dari 10 menit</h2>
            <p className="t-body text-foreground/60 max-w-2xl mb-12">
              Onboarding sengaja dibuat ringkas — kami percaya prospek institusional
              menghargai waktu. Tidak ada call wajib sebelum coba demo.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {STEPS.map((s) => (
                <div key={s.step} className="rounded-xl border border-border/80 bg-card p-6">
                  <div className="t-eyebrow mb-3 text-amber-400">{s.step}</div>
                  <h3 className="text-base font-semibold mb-2">{s.title}</h3>
                  <p className="t-body-sm text-foreground/65 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What happens after demo */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <div className="grid lg:grid-cols-5 gap-12">
              <div className="lg:col-span-2">
                <p className="t-eyebrow mb-3">SETELAH DEMO</p>
                <h2 className="t-display-sub">Upgrade tanpa kehilangan progress</h2>
              </div>
              <div className="lg:col-span-3 space-y-5 t-body text-foreground/70">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                  <p>
                    <span className="font-medium text-foreground">Status dipertahankan.</span>{' '}
                    Saat Anda upgrade ke tier live, dashboard config + strategi favorit +
                    notifikasi preferensi yang diatur saat demo otomatis ter-migrate.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                  <p>
                    <span className="font-medium text-foreground">Bonus founding member.</span>{' '}
                    Bagi yang upgrade sebelum public launch (Q3 2026), kami lock-in harga
                    Phase 1 + akses Telegram channel founding members.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <ArrowRight className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                  <p>
                    <span className="font-medium text-foreground">Tidak ada lock-in.</span>{' '}
                    Semua tier month-to-month. Anda boleh upgrade, downgrade, atau cancel
                    kapan saja sesuai komitmen Anda terhadap modal sendiri.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section-padding">
          <div className="container-default px-4 sm:px-6 text-center max-w-3xl mx-auto">
            <h2 className="t-display-sub mb-4">Mau lihat sendiri?</h2>
            <p className="t-body text-foreground/60 mb-8">
              Daftar demo dan dapatkan akses dalam 5 menit. Tidak perlu kartu kredit,
              tidak perlu KYC. Saat siap upgrade, tier mulai dari $19/bulan
              (Robot Meta Swing) atau $49/bulan (Robot Crypto Basic).
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register/signal?mode=demo&product=robot-meta" className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
                Daftar Demo Gratis <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/pricing" className="btn-secondary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
                Lihat tier live
              </Link>
            </div>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
