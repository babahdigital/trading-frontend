import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { ArrowRight } from 'lucide-react';
import { getPageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isEn = locale === 'en';
  return getPageMetadata(
    '/solutions',
    {
      title: 'Solutions — Robot Meta · Robot Crypto · VPS License · Developer APIs | BabahAlgo',
      description: isEn
        ? 'Choose your engagement model: Robot Meta (Forex MT5) from $19/mo, Robot Crypto (Binance) from $49/mo, VPS License from $3K setup, or Developer APIs access. Zero-custody — capital stays in your account.'
        : 'Pilihan engagement model: Robot Meta (Forex MT5) mulai $19/bulan, Robot Crypto (Binance) mulai $49/bulan, VPS License $3K+ setup, atau akses Developer APIs. Zero-custody — modal tetap di akun Anda.',
    },
    locale === 'en' ? 'en' : 'id',
  );
}

const SOLUTIONS = [
  {
    name: 'Free Demo (3 jalur)',
    slug: '/demo',
    price: 'Gratis selama beta',
    audience: 'Robot Meta · MT5 demo, Robot Crypto · Binance Testnet, atau Indicator overlay. Tanpa biaya, tanpa modal nyata, tidak masuk public track record.',
    cta: 'Mulai Demo',
  },
  {
    name: 'Robot Meta · MT5',
    slug: '/solutions/signal',
    price: 'Mulai $19/bulan',
    audience: 'Bot auto-execute di akun MT5 customer lewat ZeroMQ bridge. Tier 1 Swing $19 · Tier 2 Scalping $79 · Tier 3 All-In $299. Modal di akun broker partner Exness — kami tidak custody.',
    cta: 'Lihat Robot Meta',
  },
  {
    name: 'Robot Crypto · Binance',
    slug: '/solutions/crypto',
    price: 'Mulai $49/bulan + profit share',
    audience: 'Bot auto-trading Binance Spot + USDT-M Futures dengan 6 strategi institusional. Tier Basic $49 · Pro $199 · HNWI $499. Customer pegang API key (Read + Trade only).',
    cta: 'Lihat Robot Crypto',
  },
  {
    name: 'VPS License',
    slug: '/solutions/license',
    price: 'Mulai $3,000 setup',
    audience: 'Trader profesional + firm kecil yang butuh dedicated bot infrastructure di isolated hardware. Customization penuh, kontrol penuh, single-customer isolation.',
    cta: 'Lihat License',
  },
  {
    name: 'Developer APIs',
    slug: '/pricing#apis',
    price: 'Free tier tersedia',
    audience: '8 container API untuk integrasi developer: News & Sentiment, Signals, Indicators, Calendar, Market Data, Correlation, Broker Specs, AI Explainability.',
    cta: 'Lihat APIs',
  },
  {
    name: 'Institutional / B2B',
    slug: '/solutions/institutional',
    price: 'Custom usage-based',
    audience: 'Trading firm + family office butuh integrasi API priority + white-label tech + Backtest as a Service. Zero-custody — kami tidak menerima dana customer.',
    cta: 'Lihat Institutional',
  },
];

export default async function SolutionsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">

        {/* Hero */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-4 sm:px-6 text-center">
            <p className="t-eyebrow mb-4">Solutions</p>
            <h1 className="t-display-page mb-6">
              Choose the model that fits your capital and involvement.
            </h1>
            <p className="t-lead text-foreground/60 max-w-2xl mx-auto">
              Four distinct product tiers designed to serve traders and investors at every scale --
              from self-directed retail accounts to fully managed institutional mandates.
            </p>
          </div>
        </section>

        {/* Solution Cards */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-4 sm:px-6">
            <div className="grid md:grid-cols-2 gap-8">
              {SOLUTIONS.map((solution) => (
                <div
                  key={solution.slug}
                  className="card-enterprise group flex flex-col justify-between"
                >
                  <div>
                    <p className="t-body-sm text-foreground/60 font-mono mb-2">
                      {solution.price}
                    </p>
                    <h2 className="t-display-sub mb-4 group-hover:text-amber-400">
                      {solution.name}
                    </h2>
                    <p className="text-foreground/60 leading-relaxed mb-8">
                      {solution.audience}
                    </p>
                  </div>
                  <Link
                    href={solution.slug}
                    className="btn-tertiary text-sm"
                  >
                    {solution.cta}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="section-padding">
          <div className="container-default px-4 sm:px-6 text-center">
            <h2 className="t-display-sub mb-4">
              Not sure which model fits?
            </h2>
            <p className="text-foreground/60 mb-8 max-w-xl mx-auto">
              Schedule a 15-minute call and we will walk you through the options based on your capital,
              risk appetite, and level of involvement.
            </p>
            <Link
              href="/contact"
              className="btn-tertiary text-sm"
            >
              Schedule a call
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

      </main>
      <EnterpriseFooter />
    </div>
  );
}
