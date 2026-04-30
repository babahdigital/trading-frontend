import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { ArrowRight } from 'lucide-react';
import { getPageMetadata } from '@/lib/seo';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'solutions_page' });
  return getPageMetadata(
    '/solutions',
    {
      title: t('meta_title'),
      description: t('meta_description'),
    },
    locale === 'en' ? 'en' : 'id',
  );
}

const SOLUTION_KEYS = [
  { keyBase: 'demo', slug: '/demo' },
  { keyBase: 'meta', slug: '/solutions/signal' },
  { keyBase: 'crypto', slug: '/solutions/crypto' },
  { keyBase: 'license', slug: '/solutions/license' },
  { keyBase: 'apis', slug: '/pricing#apis' },
  { keyBase: 'institutional', slug: '/solutions/institutional' },
] as const;

export default async function SolutionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'solutions_page' });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">

        {/* Hero */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-4 sm:px-6 text-center">
            <p className="t-eyebrow mb-4">{t('eyebrow')}</p>
            <h1 className="t-display-page mb-6">{t('hero_title')}</h1>
            <p className="t-lead text-foreground/60 max-w-2xl mx-auto">
              {t('hero_subtitle')}
            </p>
          </div>
        </section>

        {/* Solution Cards */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-4 sm:px-6">
            <div className="grid md:grid-cols-2 gap-8">
              {SOLUTION_KEYS.map(({ keyBase, slug }) => (
                <div
                  key={slug}
                  className="card-enterprise group flex flex-col justify-between"
                >
                  <div>
                    <p className="t-body-sm text-foreground/60 font-mono mb-2">
                      {t(`${keyBase}_price` as 'demo_price')}
                    </p>
                    <h2 className="t-display-sub mb-4 group-hover:text-amber-400">
                      {t(`${keyBase}_name` as 'demo_name')}
                    </h2>
                    <p className="text-foreground/60 leading-relaxed mb-8">
                      {t(`${keyBase}_audience` as 'demo_audience')}
                    </p>
                  </div>
                  <Link
                    href={slug}
                    className="btn-tertiary text-sm"
                  >
                    {t(`${keyBase}_cta` as 'demo_cta')}
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
            <h2 className="t-display-sub mb-4">{t('bottom_title')}</h2>
            <p className="text-foreground/60 mb-8 max-w-xl mx-auto">
              {t('bottom_subtitle')}
            </p>
            <Link
              href="/contact"
              className="btn-tertiary text-sm"
            >
              {t('bottom_cta')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

      </main>
      <EnterpriseFooter />
    </div>
  );
}
