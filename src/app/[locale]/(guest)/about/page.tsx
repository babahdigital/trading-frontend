import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { ArrowRight } from 'lucide-react';
import { getPageMetadata } from '@/lib/seo';
import { breadcrumbSchema, ldJson, organizationSchema } from '@/lib/seo-jsonld';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isEn = locale === 'en';
  return getPageMetadata(
    '/about',
    {
      title: isEn
        ? 'About BabahAlgo — Quantitative Trading Infrastructure | CV Babah Digital'
        : 'Tentang BabahAlgo — Quantitative Trading Infrastructure | CV Babah Digital',
      description: isEn
        ? 'BabahAlgo is operated by CV Babah Digital. An Indonesian quant team building quantitative trading infrastructure: Robot Meta for Forex MT5 and Robot Crypto for Binance Spot + Futures. Capital always stays in the customer broker / Binance account — zero-custody.'
        : 'BabahAlgo dioperasikan oleh CV Babah Digital. Tim quant Indonesia membangun infrastruktur trading kuantitatif: Robot Meta untuk Forex MT5 dan Robot Crypto untuk Binance Spot + Futures. Modal selalu di akun broker / Binance customer — zero-custody.',
    },
    locale === 'en' ? 'en' : 'id',
  );
}

const MILESTONE_META = [
  { yearKey: 'milestone1_year', titleKey: 'milestone1_title', descKey: 'milestone1_desc' },
  { yearKey: 'milestone2_year', titleKey: 'milestone2_title', descKey: 'milestone2_desc' },
  { yearKey: 'milestone3_year', titleKey: 'milestone3_title', descKey: 'milestone3_desc' },
  { yearKey: 'milestone4_year', titleKey: 'milestone4_title', descKey: 'milestone4_desc' },
  { yearKey: 'milestone5_year', titleKey: 'milestone5_title', descKey: 'milestone5_desc' },
] as const;

const PRINCIPLE_META = [
  { titleKey: 'principle1_title', bodyKey: 'principle1_body' },
  { titleKey: 'principle2_title', bodyKey: 'principle2_body' },
  { titleKey: 'principle3_title', bodyKey: 'principle3_body' },
] as const;

export default async function AboutPage() {
  const t = await getTranslations('about_page');
  const breadcrumb = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'About', url: '/about' },
  ]);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(organizationSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(breadcrumb) }} />
      <EnterpriseNav />
      <main id="main-content">
        {/* Hero */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('hero_eyebrow')}</p>
            <h1 className="t-display-page mb-6">{t('hero_title')}</h1>
            <p className="t-lead text-foreground/60 max-w-2xl">
              {t('hero_subtitle')}
            </p>
          </div>
        </section>

        {/* Philosophy — Editorial prose */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <div className="grid lg:grid-cols-5 gap-16">
              <div className="lg:col-span-2">
                <p className="t-eyebrow mb-3">{t('philosophy_eyebrow')}</p>
                <h2 className="t-display-sub">{t('philosophy_title')}</h2>
              </div>
              <div className="lg:col-span-3 space-y-6 t-body text-foreground/70 leading-relaxed">
                <p>{t('philosophy_p1')}</p>
                <p>{t('philosophy_p2')}</p>
                <p>{t('philosophy_p3')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Principles */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">{t('principles_eyebrow')}</p>
            <h2 className="t-display-sub mb-12">{t('principles_title')}</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {PRINCIPLE_META.map((p) => (
                <div key={p.titleKey} className="card-enterprise">
                  <h3 className="text-lg font-medium mb-3">{t(p.titleKey)}</h3>
                  <p className="t-body-sm text-foreground/60 leading-relaxed">{t(p.bodyKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">{t('journey_eyebrow')}</p>
            <h2 className="t-display-sub mb-12">{t('journey_title')}</h2>
            <div className="hidden md:flex items-start justify-between gap-4">
              {MILESTONE_META.map((milestone, i) => (
                <div key={milestone.titleKey} className="flex-1 relative">
                  <div className="flex items-center mb-4">
                    <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                    {i < MILESTONE_META.length - 1 && (
                      <div className="h-px bg-border flex-1" />
                    )}
                  </div>
                  <p className="font-mono text-sm text-foreground/40 mb-1">{t(milestone.yearKey)}</p>
                  <h3 className="font-medium text-sm mb-2">{t(milestone.titleKey)}</h3>
                  <p className="text-xs text-foreground/50 leading-relaxed pr-4">{t(milestone.descKey)}</p>
                </div>
              ))}
            </div>
            <div className="md:hidden space-y-8">
              {MILESTONE_META.map((milestone) => (
                <div key={milestone.titleKey} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                    <div className="w-px bg-border flex-1 mt-2" />
                  </div>
                  <div className="pb-4">
                    <p className="font-mono text-sm text-foreground/40 mb-1">{t(milestone.yearKey)}</p>
                    <h3 className="font-medium text-sm mb-2">{t(milestone.titleKey)}</h3>
                    <p className="text-sm text-foreground/50 leading-relaxed">{t(milestone.descKey)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Navigation cards */}
        <section className="section-padding">
          <div className="container-default px-4 sm:px-6">
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl">
              <Link href="/about/team" className="card-enterprise group">
                <h3 className="text-lg font-medium mb-2 group-hover:text-amber-400 transition-colors">{t('nav_team_title')}</h3>
                <p className="t-body-sm text-foreground/60 mb-4">{t('nav_team_desc')}</p>
                <span className="btn-tertiary text-sm">
                  {t('nav_team_cta')} <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
              <Link href="/about/governance" className="card-enterprise group">
                <h3 className="text-lg font-medium mb-2 group-hover:text-amber-400 transition-colors">{t('nav_gov_title')}</h3>
                <p className="t-body-sm text-foreground/60 mb-4">{t('nav_gov_desc')}</p>
                <span className="btn-tertiary text-sm">
                  {t('nav_gov_cta')} <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
