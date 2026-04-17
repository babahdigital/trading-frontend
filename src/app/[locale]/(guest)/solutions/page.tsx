import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

const SOLUTIONS = [
  {
    name: 'Signal Service',
    slug: '/solutions/signal',
    price: 'From $49/mo',
    audience: 'Retail traders who want institutional-grade trade signals delivered to their own broker account. You keep full control of your capital.',
    cta: 'Explore Signal',
  },
  {
    name: 'PAMM Account',
    slug: '/solutions/pamm',
    price: 'Profit share model',
    audience: 'Investors who prefer a fully managed approach. Allocate capital to our master account and share in the returns without managing trades yourself.',
    cta: 'Explore PAMM',
  },
  {
    name: 'VPS License',
    slug: '/solutions/license',
    price: 'From $3,000 setup',
    audience: 'Professional traders and small firms who want dedicated bot infrastructure running on isolated hardware with full customization.',
    cta: 'Explore License',
  },
  {
    name: 'Institutional',
    slug: '/solutions/institutional',
    price: 'Mandate-based',
    audience: 'Family offices, small funds, and high-net-worth individuals seeking a custom trading mandate with white-label capabilities and API access.',
    cta: 'Explore Institutional',
  },
];

export default async function SolutionsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">

        {/* Hero */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6 text-center">
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
          <div className="container-default px-6">
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
          <div className="container-default px-6 text-center">
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
