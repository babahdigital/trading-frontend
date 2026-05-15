import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { ArrowRight, FileCheck, Wrench, LifeBuoy, ShieldCheck } from 'lucide-react';
import { breadcrumbSchema, ldJson, organizationSchema, professionalServiceSchema } from '@/lib/seo-jsonld';
import { formatPriceRange, formatPrice, type Locale } from '@/lib/pricing-format';

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

export default async function InstitutionalPage({ params }: { params: { locale: string } }) {
  const t = await getTranslations('solutions_institutional');
  const locale: Locale = params.locale === 'en' ? 'en' : 'id';
  const breadcrumb = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Solutions', url: '/solutions' },
    { name: 'Institutional', url: '/solutions/institutional' },
  ]);

  // Pricing components — 3 line items + min AUM eligibility callout.
  // Locale-aware via lib/pricing-format.ts (single source of truth).
  const licenseRange = formatPriceRange('institutional_license_low', 'institutional_license_high', locale, {
    period: 'yr',
    compact: true,
  });
  const setupRange = formatPriceRange('institutional_setup_low', 'institutional_setup_high', locale, {
    period: 'setup',
    compact: true,
  });
  const supportMonthly = formatPrice('institutional_support_monthly', locale, {
    period: 'mo',
    compact: true,
  });
  const aumMin = formatPrice('institutional_aum_min', locale, { compact: true });

  const pricingComponents = [
    {
      icon: FileCheck,
      titleKey: 'cost_license_title',
      value: licenseRange,
      descKey: 'cost_license_desc',
    },
    {
      icon: Wrench,
      titleKey: 'cost_setup_title',
      value: setupRange,
      descKey: 'cost_setup_desc',
    },
    {
      icon: LifeBuoy,
      titleKey: 'cost_support_title',
      value: t('cost_support_value_prefix', { defaultValue: 'Mulai' }) + ' ' + supportMonthly,
      descKey: 'cost_support_desc',
    },
  ];

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
            <h1 className="t-display-page mb-6 max-w-4xl">
              {t('hero_title')}
            </h1>
            <p className="t-lead text-foreground/60 max-w-3xl">
              {t('hero_subtitle')}
            </p>
          </div>
        </section>

        {/* Who it's for */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <div className="grid lg:grid-cols-5 gap-y-8 lg:gap-x-12">
              <div className="lg:col-span-2">
                <p className="t-eyebrow mb-4">{t('elig_eyebrow')}</p>
                <h2 className="t-display-sub">{t('elig_title')}</h2>
              </div>
              <ul className="lg:col-span-3 space-y-4 text-foreground/70">
                {ELIG_KEYS.map((k) => (
                  <li key={k} className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>{t(k)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* What you get */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('cap_eyebrow')}</p>
            <h2 className="t-display-sub mb-8 sm:mb-12 max-w-3xl">{t('cap_title')}</h2>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
              {FEATURE_META.map((feature) => (
                <div key={feature.titleKey} className="card-enterprise">
                  <h3 className="font-semibold mb-3">{t(feature.titleKey)}</h3>
                  <p className="t-body-sm text-foreground/60 leading-relaxed">{t(feature.descKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing — 3 cost component cards + eligibility callout */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <div className="grid lg:grid-cols-5 gap-y-8 lg:gap-x-12 mb-10">
              <div className="lg:col-span-2">
                <p className="t-eyebrow mb-4">{t('pricing_eyebrow')}</p>
                <h2 className="t-display-sub mb-4">{t('pricing_title')}</h2>
                <p className="text-foreground/60 leading-relaxed">{t('pricing_subtitle')}</p>
              </div>
              <div className="lg:col-span-3">
                <div className="grid sm:grid-cols-3 gap-4">
                  {pricingComponents.map((comp) => {
                    const Icon = comp.icon;
                    return (
                      <div key={comp.titleKey} className="card-enterprise">
                        <Icon className="w-5 h-5 text-amber-500 mb-3" />
                        <p className="t-eyebrow text-foreground/60 mb-2">{t(comp.titleKey)}</p>
                        <p className="font-display text-xl font-medium mb-2">{comp.value}</p>
                        <p className="text-xs text-foreground/60 leading-relaxed">{t(comp.descKey)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Eligibility callout — minimum AUM (zero-custody) */}
            <div className="card-enterprise max-w-3xl border-amber-500/30 bg-amber-500/5">
              <div className="flex items-start gap-4">
                <ShieldCheck className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="t-eyebrow text-amber-500 mb-2">{t('aum_eyebrow')}</p>
                  <p className="font-display text-2xl font-medium mb-2">
                    {t('aum_label_prefix')} {aumMin}
                  </p>
                  <p className="text-sm text-foreground/70 leading-relaxed">
                    {t('aum_disclaimer')}
                  </p>
                </div>
              </div>
            </div>

            <p className="t-body-sm text-foreground/50 mt-6 max-w-3xl">
              {t('pricing_note')}
            </p>
          </div>
        </section>

        {/* Onboarding */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('process_eyebrow')}</p>
            <h2 className="t-display-sub mb-8 sm:mb-12">{t('process_title')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-x-4 sm:gap-x-6 gap-y-6 sm:gap-y-8">
              {STEP_META.map((step, i) => (
                <div key={step.step} className="relative">
                  <p className="font-mono text-4xl sm:text-5xl text-amber-500/20 mb-3">{step.step}</p>
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
            <div className="grid lg:grid-cols-5 gap-y-8 lg:gap-y-12 lg:gap-x-12">
              <div className="lg:col-span-2">
                <p className="t-eyebrow mb-4">{t('faq_eyebrow')}</p>
                <h2 className="t-display-sub">{t('faq_title')}</h2>
              </div>
              <div className="lg:col-span-3 space-y-6 sm:space-y-8">
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
