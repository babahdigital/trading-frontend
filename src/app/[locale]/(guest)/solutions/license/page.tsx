import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { ArrowRight } from 'lucide-react';
import { breadcrumbSchema, financialProductSchema, ldJson, organizationSchema } from '@/lib/seo-jsonld';

export const dynamic = 'force-dynamic';

const SPEC_META = [
  { specKey: 'spec_cpu', valueKey: 'spec_cpu_value', noteKey: 'spec_cpu_note' },
  { specKey: 'spec_ram', valueKey: 'spec_ram_value', noteKey: 'spec_ram_note' },
  { specKey: 'spec_storage', valueKey: 'spec_storage_value', noteKey: 'spec_storage_note' },
  { specKey: 'spec_network', valueKey: 'spec_network_value', noteKey: 'spec_network_note' },
  { specKey: 'spec_uptime', valueKey: 'spec_uptime_value', noteKey: 'spec_uptime_note' },
  { specKey: 'spec_os', valueKey: 'spec_os_value', noteKey: 'spec_os_note' },
  { specKey: 'spec_monitoring', valueKey: 'spec_monitoring_value', noteKey: 'spec_monitoring_note' },
  { specKey: 'spec_backup', valueKey: 'spec_backup_value', noteKey: 'spec_backup_note' },
] as const;

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

export default async function LicensePage() {
  const t = await getTranslations('solutions_license');
  const breadcrumb = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Solutions', url: '/solutions' },
    { name: 'VPS License', url: '/solutions/license' },
  ]);
  const tiers = [
    { name: 'VPS Standard — $3,000 setup + $150/mo', description: 'Dedicated VPS broker-level, full bot access, custom configuration', price: '3000', currency: 'USD' },
    { name: 'VPS Premium — $7,500 setup + $300/mo', description: 'Multi-broker bridge MT4+MT5, 3 akun paralel, priority support 24/7', price: '7500', currency: 'USD' },
    { name: 'VPS Dedicated — $1,499/mo', description: 'Single-customer isolated VPS, dedicated MT5 bridge, 24/7 incident channel, SLA 99.9%', price: '1499', currency: 'USD' },
  ].map((m) => financialProductSchema({ ...m, url: '/solutions/license' }));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(organizationSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(breadcrumb) }} />
      {tiers.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(schema) }} />
      ))}
    <div className="min-h-screen bg-background text-foreground">
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

        {/* Technical Specs Table */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">{t('infra_eyebrow')}</p>
            <h2 className="t-display-sub mb-4">{t('infra_title')}</h2>
            <p className="t-body text-foreground/60 mb-10 max-w-xl">
              {t('infra_subtitle')}
            </p>
            <div className="overflow-x-auto max-w-4xl">
              <div className="table-enterprise-wrapper min-w-[500px]">
              <table className="table-enterprise w-full">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="text-left px-6 py-3">{t('col_component')}</th>
                    <th className="text-left px-6 py-3">{t('col_spec')}</th>
                    <th className="text-left px-6 py-3 hidden md:table-cell">{t('col_notes')}</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {SPEC_META.map((row) => (
                    <tr key={row.specKey} className="border-b border-border/60 last:border-0">
                      <td className="px-6 py-3 font-medium text-foreground/80">{t(row.specKey)}</td>
                      <td className="px-6 py-3 font-mono text-amber-400">{t(row.valueKey)}</td>
                      <td className="px-6 py-3 text-foreground/50 hidden md:table-cell">{t(row.noteKey)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
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

        {/* Features — alternating left-right sections */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('cap_eyebrow')}</p>
            <h2 className="t-display-sub mb-14">{t('cap_title')}</h2>
            <div className="space-y-16">
              {FEATURE_META.map((feature, i) => (
                <div
                  key={feature.titleKey}
                  className={`grid md:grid-cols-2 gap-8 md:gap-16 items-center ${
                    i % 2 === 1 ? 'md:[direction:rtl]' : ''
                  }`}
                >
                  {/* Image placeholder */}
                  <div className={`${i % 2 === 1 ? 'md:[direction:ltr]' : ''}`}>
                    <div className="aspect-[4/3] rounded-lg border border-border/60 bg-muted/30 flex items-center justify-center">
                      <div className="text-center">
                        <p className="font-mono text-6xl text-amber-500/10 font-bold">{String(i + 1).padStart(2, '0')}</p>
                        <p className="t-body-sm text-foreground/20 mt-2">{t(feature.titleKey)}</p>
                      </div>
                    </div>
                  </div>
                  {/* Text */}
                  <div className={`${i % 2 === 1 ? 'md:[direction:ltr]' : ''}`}>
                    <h3 className="font-display text-xl font-medium mb-4">{t(feature.titleKey)}</h3>
                    <p className="t-body text-foreground/60 leading-relaxed">{t(feature.descKey)}</p>
                  </div>
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
              <div className="space-y-6">
                <div>
                  <p className="t-eyebrow mb-1">{t('pricing_setup_label')}</p>
                  <p className="font-display text-4xl font-medium">
                    {t('pricing_setup_value')}
                    <span className="text-base text-foreground/60 font-normal ml-2">{t('pricing_setup_unit')}</span>
                  </p>
                </div>
                <div className="border-t border-border/60 pt-6">
                  <p className="t-eyebrow mb-1">{t('pricing_maint_label')}</p>
                  <p className="font-display text-4xl font-medium">
                    {t('pricing_maint_value')}
                    <span className="text-base text-foreground/60 font-normal">{t('pricing_maint_unit')}</span>
                  </p>
                </div>
                <div className="border-t border-border/60 pt-6">
                  <p className="t-body-sm text-foreground/60 leading-relaxed">
                    {t('pricing_note')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Onboarding */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('process_eyebrow')}</p>
            <h2 className="t-display-sub mb-12">{t('process_title')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
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
    </>
  );
}
