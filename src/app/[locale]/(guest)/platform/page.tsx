import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { Link } from '@/i18n/navigation';
import { getPageMetadata } from '@/lib/seo';
import { breadcrumbSchema, ldJson, organizationSchema, professionalServiceSchema } from '@/lib/seo-jsonld';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isEn = locale === 'en';
  return getPageMetadata(
    '/platform',
    {
      title: 'Platform Overview — Quantitative Trading Infrastructure | BabahAlgo',
      description: isEn
        ? 'Three BabahAlgo pillars: AI Confluence Engine, Sub-2ms ZeroMQ Bridge, Institutional Risk Framework (vol-target + 6-layer exit + multi-stage kill-switch). Multi-strategy (SMC, Wyckoff, Momentum) across Forex + Crypto.'
        : 'Tiga pilar BabahAlgo: AI Confluence Engine, Sub-2ms ZeroMQ Bridge, Kerangka Risiko Institusional (vol-target + 6-layer exit + multi-stage kill-switch). Multi-strategi (SMC, Wyckoff, Momentum) untuk Forex + Crypto.',
    },
    locale === 'en' ? 'en' : 'id',
  );
}
import { ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

const PILLARS = [
  {
    titleKey: 'pillar_strategy_title',
    descKey: 'pillar_strategy_desc',
    href: '/platform/strategies/smc',
  },
  {
    titleKey: 'pillar_technology_title',
    descKey: 'pillar_technology_desc',
    href: '/platform/technology',
  },
  {
    titleKey: 'pillar_risk_title',
    descKey: 'pillar_risk_desc',
    href: '/platform/risk-framework',
  },
] as const;

const INSTRUMENTS = [
  { ticker: 'EURUSD', assetClassKey: 'asset_class_forex' },
  { ticker: 'GBPUSD', assetClassKey: 'asset_class_forex' },
  { ticker: 'USDJPY', assetClassKey: 'asset_class_forex' },
  { ticker: 'AUDUSD', assetClassKey: 'asset_class_forex' },
  { ticker: 'USDCHF', assetClassKey: 'asset_class_forex' },
  { ticker: 'NZDUSD', assetClassKey: 'asset_class_forex' },
  { ticker: 'USDCAD', assetClassKey: 'asset_class_forex' },
  { ticker: 'XAUUSD', assetClassKey: 'asset_class_metals' },
  { ticker: 'XAGUSD', assetClassKey: 'asset_class_metals' },
  { ticker: 'USOIL', assetClassKey: 'asset_class_energy' },
  { ticker: 'UKOIL', assetClassKey: 'asset_class_energy' },
  { ticker: 'XNGUSD', assetClassKey: 'asset_class_energy' },
  { ticker: 'BTCUSD', assetClassKey: 'asset_class_crypto' },
  { ticker: 'ETHUSD', assetClassKey: 'asset_class_crypto' },
] as const;

const PIPELINE_STEPS = [
  { step: 1, nameKey: 'pipeline_step_1_name', descKey: 'pipeline_step_1_desc' },
  { step: 2, nameKey: 'pipeline_step_2_name', descKey: 'pipeline_step_2_desc' },
  { step: 3, nameKey: 'pipeline_step_3_name', descKey: 'pipeline_step_3_desc' },
  { step: 4, nameKey: 'pipeline_step_4_name', descKey: 'pipeline_step_4_desc' },
  { step: 5, nameKey: 'pipeline_step_5_name', descKey: 'pipeline_step_5_desc' },
  { step: 6, nameKey: 'pipeline_step_6_name', descKey: 'pipeline_step_6_desc' },
  { step: 7, nameKey: 'pipeline_step_7_name', descKey: 'pipeline_step_7_desc' },
] as const;

export default async function PlatformPage() {
  const t = await getTranslations('platform_overview');
  const breadcrumb = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Platform', url: '/platform' },
  ]);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(organizationSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(professionalServiceSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(breadcrumb) }} />
      <EnterpriseNav />
      <main id="main-content">
        {/* Hero — platform uses page-stamp-grid (technical blueprint feel) */}
        <section className="section-padding border-b border-border/60 page-stamp-grid">
          <div className="container-default px-4 sm:px-6 relative">
            <p className="t-eyebrow mb-4">{t('hero_eyebrow')}</p>
            <h1 className="t-display-page mb-6">
              {t('hero_title_line1')}<br className="hidden sm:block" /> {t('hero_title_line2')}
            </h1>
            <p className="t-lead text-muted-foreground max-w-3xl">
              {t('hero_lead')}
            </p>
          </div>
        </section>

        {/* Three Pillars */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">{t('pillars_eyebrow')}</p>
            <h2 className="t-display-sub mb-4">{t('pillars_title')}</h2>
            <p className="t-body text-foreground/60 mb-12 max-w-2xl">
              {t('pillars_lead')}
            </p>
            <div className="grid lg:grid-cols-3 gap-6">
              {PILLARS.map((pillar) => (
                <Link key={pillar.titleKey} href={pillar.href} className="card-enterprise group flex flex-col">
                  <h3 className="text-xl font-medium mb-4 group-hover:text-amber-400 transition-colors">
                    {t(pillar.titleKey)}
                  </h3>
                  <p className="t-body-sm text-foreground/60 leading-relaxed mb-6 flex-1">
                    {t(pillar.descKey)}
                  </p>
                  <span className="btn-tertiary text-sm">
                    {t('pillar_learn_more')} <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Execution Pipeline */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">{t('pipeline_eyebrow')}</p>
            <h2 className="t-display-sub mb-4">{t('pipeline_title')}</h2>
            <p className="t-body text-foreground/60 mb-12 max-w-2xl">
              {t('pipeline_lead')}
            </p>
            <div className="card-enterprise p-8">
              <div className="space-y-0">
                {PIPELINE_STEPS.map((s, i) => (
                  <div key={s.step} className="flex items-start gap-4 py-4 border-b border-border/40 last:border-b-0">
                    <span className="font-mono text-amber-400 font-semibold text-sm w-6 shrink-0 mt-0.5">{s.step}.</span>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                      <span className="font-mono text-sm text-foreground min-w-[140px]">{t(s.nameKey)}</span>
                      {i < PIPELINE_STEPS.length - 1 && <span className="hidden sm:inline text-foreground/20">&rarr;</span>}
                      <span className="text-sm text-foreground/50">{t(s.descKey)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Instruments */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">{t('instruments_eyebrow')}</p>
            <h2 className="t-display-sub mb-4">{t('instruments_title')}</h2>
            <p className="t-body text-foreground/60 mb-12 max-w-2xl">
              {t('instruments_lead')}
            </p>
            <div className="table-enterprise-wrapper">
              <table className="table-enterprise">
                <thead>
                  <tr>
                    <th>{t('instruments_table_ticker')}</th>
                    <th>{t('instruments_table_asset_class')}</th>
                    <th className="text-right">{t('instruments_table_status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {INSTRUMENTS.map((inst) => (
                    <tr key={inst.ticker}>
                      <td className="font-semibold">{inst.ticker}</td>
                      <td className="!text-foreground/50">{t(inst.assetClassKey)}</td>
                      <td className="text-right text-emerald-400">{t('instruments_status_active')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <Link href="/platform/instruments" className="btn-tertiary text-sm">
                {t('instruments_view_specs')} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Documentation */}
        <section className="section-padding">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">{t('docs_eyebrow')}</p>
            <h2 className="t-display-sub mb-8">{t('docs_title')}</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card-enterprise">
                <h3 className="text-lg font-medium mb-2">{t('docs_methodology_title')}</h3>
                <p className="t-body-sm text-foreground/60 leading-relaxed mb-4">
                  {t('docs_methodology_desc')}
                </p>
                <Link
                  href="/contact?subject=methodology-request"
                  className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 font-medium"
                >
                  {t('docs_request_access')} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="card-enterprise">
                <h3 className="text-lg font-medium mb-2">{t('docs_whitepaper_title')}</h3>
                <p className="t-body-sm text-foreground/60 leading-relaxed mb-4">
                  {t('docs_whitepaper_desc')}
                </p>
                <Link
                  href="/contact?subject=whitepaper-request"
                  className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 font-medium"
                >
                  {t('docs_request_access')} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
