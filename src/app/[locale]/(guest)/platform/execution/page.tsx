import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { Link } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { getPageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isEn = locale === 'en';
  return getPageMetadata(
    '/platform/execution',
    {
      title: isEn ? 'Execution — BabahAlgo' : 'Eksekusi — BabahAlgo',
      description: isEn
        ? 'BabahAlgo sub-millisecond execution pipeline: ZeroMQ to MT5, Binance websocket, low-latency infrastructure.'
        : 'Pipeline eksekusi sub-millisecond BabahAlgo: ZeroMQ ke MT5, websocket Binance, infrastruktur low-latency.',
    },
    locale === 'en' ? 'en' : 'id',
  );
}

export default async function ExecutionPage() {
  const t = await getTranslations('platform_execution');
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
          </div>
        </section>

        {/* Latency */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('latency_eyebrow')}</p>
            <h2 className="t-display-sub mb-4">{t('latency_title')}</h2>
            <div className="card-enterprise">
              <h3 className="font-display text-lg text-foreground mb-3">
                {t('latency_card_title')}
              </h3>
              <p className="text-foreground/60 leading-relaxed mb-4">
                {t('latency_card_p1')}
              </p>
              <p className="text-foreground/60 leading-relaxed mb-6">
                {t('latency_card_p2')}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="border border-white/8 rounded-lg p-4 bg-background text-center">
                  <p className="font-mono text-lg text-amber-400 mb-1">{t('latency_metric_rtt_value')}</p>
                  <p className="t-body-sm text-foreground/60">{t('latency_metric_rtt_label')}</p>
                </div>
                <div className="border border-white/8 rounded-lg p-4 bg-background text-center">
                  <p className="font-mono text-lg text-amber-400 mb-1">{t('latency_metric_size_value')}</p>
                  <p className="t-body-sm text-foreground/60">{t('latency_metric_size_label')}</p>
                </div>
                <div className="border border-white/8 rounded-lg p-4 bg-background text-center">
                  <p className="font-mono text-lg text-amber-400 mb-1">{t('latency_metric_transport_value')}</p>
                  <p className="t-body-sm text-foreground/60">{t('latency_metric_transport_label')}</p>
                </div>
                <div className="border border-white/8 rounded-lg p-4 bg-background text-center">
                  <p className="font-mono text-lg text-amber-400 mb-1">{t('latency_metric_pattern_value')}</p>
                  <p className="t-body-sm text-foreground/60">{t('latency_metric_pattern_label')}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Broker Integration */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('broker_eyebrow')}</p>
            <h2 className="t-display-sub mb-4">{t('broker_title')}</h2>
            <div className="card-enterprise">
              <p className="text-foreground/60 leading-relaxed mb-4">
                {t('broker_p1')}
              </p>
              <p className="text-foreground/60 leading-relaxed mb-4">
                {t('broker_p2')}
              </p>
              <p className="text-foreground/60 leading-relaxed">
                {t('broker_p3')}
              </p>
            </div>
          </div>
        </section>

        {/* VPS Infrastructure */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('vps_eyebrow')}</p>
            <h2 className="t-display-sub mb-4">{t('vps_title')}</h2>
            <div className="space-y-6">
              <div className="card-enterprise">
                <h3 className="font-display text-lg text-foreground mb-3">
                  {t('vps_hardware_title')}
                </h3>
                <p className="text-foreground/60 leading-relaxed">
                  {t('vps_hardware_body')}
                </p>
              </div>
              <div className="card-enterprise">
                <h3 className="font-display text-lg text-foreground mb-3">
                  {t('vps_security_title')}
                </h3>
                <p className="text-foreground/60 leading-relaxed">
                  {t('vps_security_body')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Monitoring and Failover */}
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
                  {t('ops_response_title')}
                </h3>
                <p className="text-foreground/60 leading-relaxed mb-4">
                  {t('ops_response_intro')}
                </p>
                <ol className="list-decimal list-inside space-y-2 text-foreground/60 text-sm">
                  <li>{t('ops_response_step_1')}</li>
                  <li>{t('ops_response_step_2')}</li>
                  <li>{t('ops_response_step_3')}</li>
                  <li>{t('ops_response_step_4')}</li>
                  <li>{t('ops_response_step_5')}</li>
                  <li>{t('ops_response_step_6')}</li>
                </ol>
              </div>
              <div className="card-enterprise">
                <h3 className="font-display text-lg text-foreground mb-3">
                  {t('ops_uptime_title')}
                </h3>
                <p className="text-foreground/60 leading-relaxed">
                  {t('ops_uptime_body')}
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
