import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { ArrowRight, TrendingUp, Server, Building2, Bitcoin } from 'lucide-react';
import { getPageMetadata } from '@/lib/seo';
import { getTranslations } from 'next-intl/server';
import { DecisionQuiz } from '@/components/solutions/decision-quiz';

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

// Decision ladder — entry-point matrix sesuai modal trader.
// Membantu user pilih product yang tepat dari pintu masuk /solutions tanpa
// harus baca semua sub-pages dulu.
const TIER_LADDER = [
  {
    icon: TrendingUp,
    accent: 'amber' as const,
    nameKey: 'ladder_retail_name' as const,
    modalKey: 'ladder_retail_modal' as const,
    descKey: 'ladder_retail_desc' as const,
    ctaKey: 'ladder_retail_cta' as const,
    href: '/solutions/signal',
  },
  {
    icon: Server,
    accent: 'sky' as const,
    nameKey: 'ladder_vps_name' as const,
    modalKey: 'ladder_vps_modal' as const,
    descKey: 'ladder_vps_desc' as const,
    ctaKey: 'ladder_vps_cta' as const,
    href: '/solutions/license',
  },
  {
    icon: Building2,
    accent: 'emerald' as const,
    nameKey: 'ladder_inst_name' as const,
    modalKey: 'ladder_inst_modal' as const,
    descKey: 'ladder_inst_desc' as const,
    ctaKey: 'ladder_inst_cta' as const,
    href: '/solutions/institutional',
  },
  {
    icon: Bitcoin,
    accent: 'violet' as const,
    nameKey: 'ladder_crypto_name' as const,
    modalKey: 'ladder_crypto_modal' as const,
    descKey: 'ladder_crypto_desc' as const,
    ctaKey: 'ladder_crypto_cta' as const,
    href: '/solutions/crypto',
  },
];

export default async function SolutionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'solutions_page' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">

        {/* Tech provider disclaimer banner */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 py-2.5">
          <p className="container-default px-4 sm:px-6 text-center text-xs sm:text-sm font-medium text-amber-200">
            {tNav('no_pamm_banner')}
          </p>
        </div>

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

        {/* Decision Ladder — 4-tier matrix sesuai modal trader.
            Entry-point yang membantu user pilih product yang tepat tanpa
            harus baca semua sub-pages. */}
        <section className="section-padding border-b border-white/8 bg-muted/[0.02]">
          <div className="container-default px-4 sm:px-6">
            <div className="text-center mb-10 sm:mb-12 max-w-2xl mx-auto">
              <p className="t-eyebrow mb-4">{t('ladder_eyebrow')}</p>
              <h2 className="t-display-sub mb-3">{t('ladder_title')}</h2>
              <p className="text-foreground/60 leading-relaxed">{t('ladder_subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {TIER_LADDER.map((tier) => {
                const Icon = tier.icon;
                const accentBg =
                  tier.accent === 'amber' ? 'bg-amber-500/15 border-amber-500/30' :
                  tier.accent === 'sky' ? 'bg-sky-500/15 border-sky-500/30' :
                  tier.accent === 'emerald' ? 'bg-emerald-500/15 border-emerald-500/30' :
                  'bg-violet-500/15 border-violet-500/30';
                const accentText =
                  tier.accent === 'amber' ? 'text-amber-400' :
                  tier.accent === 'sky' ? 'text-sky-400' :
                  tier.accent === 'emerald' ? 'text-emerald-400' :
                  'text-violet-400';
                return (
                  <Link
                    key={tier.href}
                    href={tier.href}
                    className="card-enterprise group flex flex-col h-full hover:border-amber-500/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`inline-flex h-10 w-10 rounded-lg ${accentBg} border items-center justify-center shrink-0`}>
                        <Icon className={`h-5 w-5 ${accentText}`} />
                      </span>
                      <h3 className={`font-display text-base font-medium group-hover:${accentText}`}>{t(tier.nameKey)}</h3>
                    </div>
                    <p className={`text-xs font-mono uppercase tracking-wider ${accentText} mb-3`}>
                      {t(tier.modalKey)}
                    </p>
                    <p className="t-body-sm text-foreground/60 leading-relaxed mb-5 flex-1">
                      {t(tier.descKey)}
                    </p>
                    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${accentText} group-hover:gap-2 transition-all`}>
                      {t(tier.ctaKey)} <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </Link>
                );
              })}
            </div>
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

        {/* Decision Quiz — 3-pertanyaan auto-routing untuk klien yang belum
            yakin pilih tier mana. Interactive client component dengan auto-
            recommendation berdasarkan asset class + modal + technical comfort. */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-4 sm:px-6">
            <DecisionQuiz />
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
