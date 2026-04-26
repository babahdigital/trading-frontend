import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

const SOLUTIONS = [
  {
    name: 'Free Demo',
    slug: '/demo',
    price: 'Gratis',
    audience: 'Coba sinyal kami di akun MT5 demo + indicator confluence overlay. Tanpa biaya, tanpa modal nyata, tidak masuk public track record.',
    cta: 'Mulai Demo',
  },
  {
    name: 'Forex Signal',
    slug: '/solutions/signal',
    price: 'Mulai $19/bulan',
    audience: 'Retail trader yang ingin institutional-grade signal di akun broker pribadi. 3 tier: Starter $19, Pro $79, VIP $299. Anda tetap pegang capital sendiri.',
    cta: 'Lihat Signal',
  },
  {
    name: 'Crypto Bot',
    slug: '/solutions/crypto',
    price: 'Mulai $49/bulan + profit share',
    audience: 'Bot trading Binance Futures dengan 6 strategi institusional. Customer pegang Binance API key (Read + Trade), bot eksekusi 24/7.',
    cta: 'Lihat Crypto',
  },
  {
    name: 'VPS License',
    slug: '/solutions/license',
    price: 'Mulai $3,000 setup',
    audience: 'Trader profesional + firm kecil yang butuh dedicated bot infrastructure di isolated hardware. Customization penuh, kontrol penuh.',
    cta: 'Lihat License',
  },
  {
    name: 'Public API Marketplace',
    slug: '/pricing#apis',
    price: 'Free tier tersedia',
    audience: '9 container API: News & Sentiment, Signals, Indicators, Calendar, Market Data, Execution Cloud, Correlation, Broker Specs, AI Explainability.',
    cta: 'Lihat APIs',
  },
  {
    name: 'Institutional / B2B',
    slug: '/solutions/institutional',
    price: 'Custom usage-based',
    audience: 'Trading firm + family office butuh integrasi API priority + white-label tech + Backtest as a Service. Zero-custody — kami tidak terima dana.',
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
