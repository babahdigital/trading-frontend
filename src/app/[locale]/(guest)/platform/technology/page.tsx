import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { ArchitectureDiagram } from '@/components/diagrams/architecture-diagram';
import { Link } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { getPageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isEn = locale === 'en';
  return getPageMetadata(
    '/platform/technology',
    {
      title: isEn ? 'Technology — BabahAlgo' : 'Teknologi — BabahAlgo',
      description: isEn
        ? 'BabahAlgo technology stack: Python FastAPI, Next.js, PostgreSQL, ZeroMQ, and modern quantitative trading infrastructure.'
        : 'Stack teknologi BabahAlgo: Python FastAPI, Next.js, PostgreSQL, ZeroMQ, dan infrastruktur trading kuantitatif modern.',
    },
    locale === 'en' ? 'en' : 'id',
  );
}

export default async function TechnologyPage() {
  const t = await getTranslations('platform_technology');
  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">

        {/* Hero */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-4 sm:px-6">
            <Link
              href="/platform"
              className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-400/80 transition-colors mb-8"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> {t('back_link')}
            </Link>
            <p className="t-eyebrow mb-4">{t('hero_eyebrow')}</p>
            <h1 className="t-display-page mb-6">
              {t('hero_title')}
            </h1>
            <p className="text-foreground/60 leading-relaxed mb-8 max-w-2xl">
              {t('hero_lead')}
            </p>
            {/* Architecture Diagram */}
            <div className="card-enterprise">
              <ArchitectureDiagram />
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="border-b border-white/8">
          <div className="container-default px-4 sm:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/8">
              <div className="py-8 md:py-10 px-6 text-center">
                <p className="font-mono text-2xl md:text-3xl text-amber-400 mb-1">{t('stat_latency_value')}</p>
                <p className="t-eyebrow text-foreground/50">{t('stat_latency_label')}</p>
              </div>
              <div className="py-8 md:py-10 px-6 text-center">
                <p className="font-mono text-2xl md:text-3xl text-amber-400 mb-1">{t('stat_uptime_value')}</p>
                <p className="t-eyebrow text-foreground/50">{t('stat_uptime_label')}</p>
              </div>
              <div className="py-8 md:py-10 px-6 text-center">
                <p className="font-mono text-2xl md:text-3xl text-amber-400 mb-1">{t('stat_operation_value')}</p>
                <p className="t-eyebrow text-foreground/50">{t('stat_operation_label')}</p>
              </div>
              <div className="py-8 md:py-10 px-6 text-center">
                <p className="font-mono text-2xl md:text-3xl text-amber-400 mb-1">{t('stat_region_value')}</p>
                <p className="t-eyebrow text-foreground/50">{t('stat_region_label')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* AI Advisor */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('ai_eyebrow')}</p>
            <h2 className="t-display-sub mb-4">{t('ai_title')}</h2>
            <div className="card-enterprise">
              <h3 className="font-display text-lg text-foreground mb-3">
                {t('ai_card_title')}
              </h3>
              <p className="text-foreground/60 leading-relaxed mb-4">
                {t('ai_card_p1')}
              </p>
              <p className="text-foreground/60 leading-relaxed mb-4">
                {t('ai_card_p2')}
              </p>
              <div className="grid md:grid-cols-3 gap-4 mt-6">
                <div className="border border-white/8 rounded-lg p-4 bg-background text-center">
                  <p className="font-mono text-lg text-amber-400 mb-1">{t('ai_metric_cycle_value')}</p>
                  <p className="t-body-sm text-foreground/60">{t('ai_metric_cycle_label')}</p>
                </div>
                <div className="border border-white/8 rounded-lg p-4 bg-background text-center">
                  <p className="font-mono text-lg text-amber-400 mb-1">{t('ai_metric_pairs_value')}</p>
                  <p className="t-body-sm text-foreground/60">{t('ai_metric_pairs_label')}</p>
                </div>
                <div className="border border-white/8 rounded-lg p-4 bg-background text-center">
                  <p className="font-mono text-lg text-amber-400 mb-1">{t('ai_metric_score_value')}</p>
                  <p className="t-body-sm text-foreground/60">{t('ai_metric_score_label')}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Execution */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('exec_eyebrow')}</p>
            <h2 className="t-display-sub mb-4">{t('exec_title')}</h2>
            <div className="card-enterprise mb-6">
              <h3 className="font-display text-lg text-foreground mb-3">
                {t('exec_zeromq_title')}
              </h3>
              <p className="text-foreground/60 leading-relaxed mb-4">
                {t('exec_zeromq_p1')}
              </p>
              <p className="text-foreground/60 leading-relaxed mb-4">
                {t('exec_zeromq_p2')}
              </p>
              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <div className="border border-white/8 rounded-lg p-4 bg-background text-center">
                  <p className="font-mono text-lg text-amber-400 mb-1">{t('exec_metric_latency_value')}</p>
                  <p className="t-body-sm text-foreground/60">{t('exec_metric_latency_label')}</p>
                </div>
                <div className="border border-white/8 rounded-lg p-4 bg-background text-center">
                  <p className="font-mono text-lg text-amber-400 mb-1">{t('exec_metric_transport_value')}</p>
                  <p className="t-body-sm text-foreground/60">{t('exec_metric_transport_label')}</p>
                </div>
              </div>
            </div>

            <div className="card-enterprise">
              <h3 className="font-display text-lg text-foreground mb-3">
                {t('exec_mt5_title')}
              </h3>
              <p className="text-foreground/60 leading-relaxed">
                {t('exec_mt5_body')}
              </p>
            </div>
          </div>
        </section>

        {/* Infrastructure */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('infra_eyebrow')}</p>
            <h2 className="t-display-sub mb-4">{t('infra_title')}</h2>
            <div className="space-y-6">
              <div className="card-enterprise">
                <h3 className="font-display text-lg text-foreground mb-3">
                  {t('infra_zerotrust_title')}
                </h3>
                <p className="text-foreground/60 leading-relaxed">
                  {t('infra_zerotrust_body')}
                </p>
              </div>

              <div className="card-enterprise">
                <h3 className="font-display text-lg text-foreground mb-3">
                  {t('infra_vps_title')}
                </h3>
                <p className="text-foreground/60 leading-relaxed">
                  {t('infra_vps_body')}
                </p>
              </div>

              <div className="card-enterprise">
                <h3 className="font-display text-lg text-foreground mb-3">
                  {t('infra_db_title')}
                </h3>
                <p className="text-foreground/60 leading-relaxed">
                  {t('infra_db_body')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Monitoring */}
        <section className="section-padding">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('ops_eyebrow')}</p>
            <h2 className="t-display-sub mb-4">{t('ops_title')}</h2>
            <div className="space-y-6">
              <div className="card-enterprise">
                <h3 className="font-display text-lg text-foreground mb-3">
                  {t('ops_health_title')}
                </h3>
                <p className="text-foreground/60 leading-relaxed">
                  {t('ops_health_body')}
                </p>
              </div>

              <div className="card-enterprise">
                <h3 className="font-display text-lg text-foreground mb-3">
                  {t('ops_killswitch_title')}
                </h3>
                <p className="text-foreground/60 leading-relaxed">
                  {t('ops_killswitch_body')}
                </p>
              </div>

              <div className="card-enterprise">
                <h3 className="font-display text-lg text-foreground mb-3">
                  {t('ops_audit_title')}
                </h3>
                <p className="text-foreground/60 leading-relaxed">
                  {t('ops_audit_body')}
                </p>
              </div>
            </div>
          </div>
        </section>

      </main>
      <EnterpriseFooter />
    </div>
  );
}
