import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { ArrowRight, ShieldCheck, Eye, Zap, AlertTriangle } from 'lucide-react';
import { getPageMetadata } from '@/lib/seo';
import { breadcrumbSchema, financialProductSchema, ldJson, organizationSchema } from '@/lib/seo-jsonld';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return getPageMetadata('/demo', {
    title: 'Free Demo & Indicator Beta — BabahAlgo',
    description:
      'Coba sinyal Forex BabahAlgo gratis dengan akun MT5 demo. Indicator beta untuk discretionary trader. Tidak masuk track record live, upgrade kapan saja.',
  });
}

const FEATURES = [
  {
    icon: Eye,
    title: 'Preview Signal Harian',
    desc: 'Lihat signal yang dihasilkan production engine — dengan delay 5 menit dari live subscriber. Cukup untuk evaluasi kualitas, tidak cukup untuk arbitrage.',
  },
  {
    icon: ShieldCheck,
    title: 'Akun MT5 Demo Terisolasi',
    desc: 'Trades di akun demo Anda 100% simulasi. Tidak menyentuh capital nyata, tidak masuk public track record (per backend isolation contract).',
  },
  {
    icon: Zap,
    title: 'Indicator Free untuk Discretionary',
    desc: 'SMC + Wyckoff confluence overlay untuk MetaTrader 5. Real-time scoring 14 instrumen. Tidak ada eksekusi otomatis — Anda yang pegang kendali.',
  },
];

const STEPS = [
  { step: '01', title: 'Daftar email', desc: 'Sign up gratis, verifikasi email standar — tidak perlu KYC untuk demo.' },
  { step: '02', title: 'Hubungkan MT5 demo', desc: 'Buat akun demo di broker pilihan Anda (Exness, IC Markets, dll), lalu submit kredensial di dashboard.' },
  { step: '03', title: 'Aktifkan Indicator', desc: 'Download indicator file untuk MT5, install di Indicators folder, drop ke chart 14 pair pilihan.' },
  { step: '04', title: 'Evaluate 30 hari', desc: 'Pakai sebanyak yang Anda mau. Saat siap upgrade ke live signal/bot, status Anda dipertahankan + ada bonus return.' },
];

export default function DemoPage() {
  const breadcrumb = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Demo', url: '/demo' },
  ]);
  const demoProduct = financialProductSchema({
    name: 'Free Demo — Signal Preview + Indicator Beta',
    description: 'Akun MT5 demo + signal preview + indicator confluence overlay. Gratis untuk evaluasi 30 hari, tidak masuk public track record (per DEMO_UX_GUIDE).',
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
                <Zap className="w-3.5 h-3.5" />
                Free · Beta Program
              </div>
              <h1 className="t-display-page mb-5">
                Coba sinyal kami,<br />tanpa biaya.
              </h1>
              <p className="t-lead text-foreground/70 mb-8 max-w-2xl">
                Akun MT5 demo + signal preview + indicator confluence — semua gratis untuk evaluasi sampai 30 hari.
                Tidak masuk public track record. Upgrade ke live kapan saja.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/register/signal?mode=demo" className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
                  Mulai Demo Gratis <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/contact?subject=indicator-beta" className="btn-secondary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
                  Request Indicator Beta
                </Link>
              </div>
              <p className="text-xs text-muted-foreground mt-6">
                Beta signup tanpa kartu kredit. Email verification cukup. Demo expired 30 hari (auto-archive).
              </p>
            </div>
          </div>
        </section>

        {/* Demo isolation banner — per DEMO_UX_GUIDE §3.4 */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <div className="rounded-lg border-2 border-amber-500/40 bg-amber-500/5 p-5 sm:p-6 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="font-semibold text-amber-200 mb-1.5">DEMO — simulasi, bukan capital nyata</h2>
                <p className="text-sm text-amber-200/80 leading-relaxed">
                  Trade di akun demo Anda 100% simulasi MT5. Tidak menyentuh capital nyata, tidak ditampilkan di public track record kami,
                  dan tidak dihitung untuk verified performance. Equity demo akan ditandai dengan suffix <code className="font-mono px-1 bg-amber-500/10 rounded">(simulasi)</code> di seluruh dashboard.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">Yang Anda Dapat</p>
            <h2 className="t-display-section mb-12 max-w-2xl">
              Akses produk inti tanpa komitmen.
            </h2>
            <div className="grid md:grid-cols-3 gap-5">
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

        {/* Steps */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">Cara Mulai</p>
            <h2 className="t-display-section mb-12 max-w-2xl">4 langkah, kurang dari 10 menit.</h2>
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

        {/* CTA */}
        <section className="section-padding">
          <div className="container-default px-4 sm:px-6 text-center max-w-3xl mx-auto">
            <h2 className="t-display-section mb-4">Siap mulai?</h2>
            <p className="t-body text-foreground/60 mb-8">
              Daftar sekarang dan dapatkan akses demo dalam 5 menit. Upgrade ke live signal Basic ($49/mo) atau VIP ($149/mo)
              kapan saja — pengalaman demo Anda dipertahankan.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register/signal?mode=demo" className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
                Daftar Demo Gratis <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/pricing" className="btn-secondary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
                Lihat Live Pricing
              </Link>
            </div>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
