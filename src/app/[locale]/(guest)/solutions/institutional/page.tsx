import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { ArrowRight } from 'lucide-react';
import { breadcrumbSchema, ldJson, organizationSchema, professionalServiceSchema } from '@/lib/seo-jsonld';

export const dynamic = 'force-dynamic';

const FEATURE_META = [
  { titleKey: 'feat1_title', descKey: 'feat1_desc' },
  { titleKey: 'feat2_title', descKey: 'feat2_desc' },
  { titleKey: 'feat3_title', descKey: 'feat3_desc' },
  { titleKey: 'feat4_title', descKey: 'feat4_desc' },
  { titleKey: 'feat5_title', descKey: 'feat5_desc' },
  { titleKey: 'feat6_title', descKey: 'feat6_desc' },
] as const;

const STEP_META = [
  { step: '01', titleKey: 'step1_title', descKey: 'step1_desc' },
  { step: '02', titleKey: 'step2_title', descKey: 'step2_desc' },
  { step: '03', titleKey: 'step3_title', descKey: 'step3_desc' },
  { step: '04', titleKey: 'step4_title', descKey: 'step4_desc' },
  { step: '05', titleKey: 'step5_title', descKey: 'step5_desc' },
] as const;

const FAQ_META = [
  { qKey: 'faq1_q', aKey: 'faq1_a' },
  { qKey: 'faq2_q', aKey: 'faq2_a' },
  { qKey: 'faq3_q', aKey: 'faq3_a' },
  { qKey: 'faq4_q', aKey: 'faq4_a' },
  { qKey: 'faq5_q', aKey: 'faq5_a' },
] as const;

const ELIG_KEYS = ['elig_b1', 'elig_b2', 'elig_b3'] as const;

export default async function InstitutionalPage() {
  const t = await getTranslations('solutions_institutional');
  const breadcrumb = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Solutions', url: '/solutions' },
    { name: 'Institutional', url: '/solutions/institutional' },
  ]);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(organizationSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(professionalServiceSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(breadcrumb) }} />
      <EnterpriseNav />
      <main id="main-content">
        {/* Hero */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('hero_eyebrow')}</p>
            <h1 className="t-display-page mb-6">
              {t('hero_title')}
            </h1>
            <p className="t-lead text-foreground/60 max-w-2xl">
              {t('hero_subtitle')}
            </p>
          </div>
        </section>

        {/* Who it's for */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('elig_eyebrow')}</p>
            <h2 className="t-display-sub mb-8">{t('elig_title')}</h2>
            <ul className="space-y-4 text-foreground/60 max-w-2xl">
              {ELIG_KEYS.map((k) => (
                <li key={k} className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span>{t(k)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* What you get */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('cap_eyebrow')}</p>
            <h2 className="t-display-sub mb-12">{t('cap_title')}</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {FEATURE_META.map((feature) => (
                <div key={feature.titleKey} className="card-enterprise">
                  <h3 className="font-semibold mb-3">{t(feature.titleKey)}</h3>
                  <p className="t-body-sm text-foreground/60 leading-relaxed">{t(feature.descKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('pricing_eyebrow')}</p>
            <h2 className="t-display-sub mb-12">{t('pricing_title')}</h2>
            <div className="card-enterprise max-w-xl">
              <p className="t-eyebrow mb-4">{t('pricing_label')}</p>
              <p className="font-display text-4xl font-medium mb-2">{t('pricing_value')}</p>
              <p className="text-foreground/60 leading-relaxed mb-6">
                {t('pricing_subtitle')}
              </p>
              <p className="t-body-sm text-foreground/60">
                {t('pricing_note')}
              </p>
            </div>
          </div>
        </section>

        {/* Onboarding */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('process_eyebrow')}</p>
            <h2 className="t-display-sub mb-12">{t('process_title')}</h2>
            <div className="grid md:grid-cols-5 gap-6">
              {STEP_META.map((step, i) => (
                <div key={step.step} className="relative">
                  <p className="font-mono text-5xl text-amber-500/20 mb-3">{step.step}</p>
                  <h3 className="font-semibold text-sm mb-2">{t(step.titleKey)}</h3>
                  <p className="text-xs text-foreground/60 leading-relaxed">{t(step.descKey)}</p>
                  {i < STEP_META.length - 1 && (
                    <ArrowRight className="hidden md:block absolute top-4 -right-4 w-4 h-4 text-foreground/30" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <div className="grid lg:grid-cols-5 gap-12">
              <div className="lg:col-span-2">
                <p className="t-eyebrow mb-4">{t('faq_eyebrow')}</p>
                <h2 className="t-display-sub">{t('faq_title')}</h2>
              </div>
              <div className="lg:col-span-3 space-y-8">
                {FAQ_META.map((item) => (
                  <div key={item.qKey}>
                    <h3 className="font-semibold mb-2">{t(item.qKey)}</h3>
                    <p className="t-body-sm text-foreground/60 leading-relaxed">{t(item.aKey)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section-padding">
          <div className="container-default px-4 sm:px-6 text-center">
            <p className="t-eyebrow mb-4">{t('cta_eyebrow')}</p>
            <h2 className="t-display-sub mb-4">{t('cta_title')}</h2>
            <p className="text-foreground/60 mb-8 max-w-lg mx-auto">
              {t('cta_body')}
            </p>
            <Link
              href="/contact"
              className="btn-primary inline-flex items-center gap-2"
            >
              {t('cta_button')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
