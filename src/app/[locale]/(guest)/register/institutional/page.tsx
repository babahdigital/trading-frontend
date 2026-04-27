import { getTranslations } from 'next-intl/server';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { CalEmbed } from '@/components/ui/cal-embed';
import { Link } from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function RegisterInstitutionalPage() {
  const t = await getTranslations('register.institutional');

  const steps = [
    { step: '01', title: t('step1_title'), desc: t('step1_desc') },
    { step: '02', title: t('step2_title'), desc: t('step2_desc') },
    { step: '03', title: t('step3_title'), desc: t('step3_desc') },
    { step: '04', title: t('step4_title'), desc: t('step4_desc') },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />

      <main id="main-content">
        {/* Hero */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('eyebrow')}</p>
            <h1 className="t-display-page mb-4">{t('title')}</h1>
            <p className="t-lead text-foreground/60 max-w-2xl">
              {t('lead_part1')}{' '}
              <strong className="text-amber-300">{t('lead_zero_custody')}</strong>{' '}
              {t('lead_part2')}
            </p>
          </div>
        </section>

        {/* Process steps */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <div className="grid md:grid-cols-4 gap-6">
              {steps.map((item) => (
                <div key={item.step} className="card-enterprise">
                  <div className="font-mono text-amber-400 text-sm mb-3">{item.step}</div>
                  <h3 className="font-display text-sm font-semibold mb-2">{item.title}</h3>
                  <p className="t-body-sm text-foreground/60">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Engagement Models */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <h2 className="t-display-sub mb-6">{t('engagement_title')}</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="card-enterprise">
                <h3 className="font-display text-lg font-semibold mb-2">{t('engagement_api_title')}</h3>
                <p className="t-body-sm text-foreground/60 mb-4">{t('engagement_api_desc')}</p>
                <p className="font-mono text-amber-400 text-sm">{t('engagement_api_price')}</p>
              </div>
              <div className="card-enterprise">
                <h3 className="font-display text-lg font-semibold mb-2">{t('engagement_backtest_title')}</h3>
                <p className="t-body-sm text-foreground/60 mb-4">{t('engagement_backtest_desc')}</p>
                <p className="font-mono text-amber-400 text-sm">{t('engagement_backtest_price')}</p>
              </div>
              <div className="card-enterprise">
                <h3 className="font-display text-lg font-semibold mb-2">{t('engagement_whitelabel_title')}</h3>
                <p className="t-body-sm text-foreground/60 mb-4">{t('engagement_whitelabel_desc')}</p>
                <p className="font-mono text-amber-400 text-sm">{t('engagement_whitelabel_price')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Schedule Call */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <h2 className="t-display-sub mb-2">{t('schedule_title')}</h2>
            <p className="t-body-sm text-foreground/60 mb-8">{t('schedule_subtitle')}</p>
            <div className="border border-border/60 rounded-lg overflow-hidden bg-card">
              <CalEmbed calLink="babahalgo/institutional" />
            </div>
          </div>
        </section>

        {/* Alternative: Contact directly */}
        <section className="section-padding">
          <div className="container-default px-4 sm:px-6 text-center">
            <p className="text-foreground/60 mb-4">{t('contact_intro')}</p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-foreground/50 hover:text-amber-400 transition-colors text-sm"
            >
              {t('contact_link')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      <EnterpriseFooter />
    </div>
  );
}
