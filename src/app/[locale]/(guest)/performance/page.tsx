'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { TrustStrip } from '@/components/shared/trust-strip';
import { StickyCtaBar } from '@/components/shared/sticky-cta-bar';
import { ArrowRight, TrendingUp, Bitcoin } from 'lucide-react';

export default function PerformanceHubPage() {
  const t = useTranslations('performance_page');
  const ts = useTranslations('shared');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">
        <section className="section-padding border-b border-border/60 page-stamp-rule">
          <div className="layout-container">
            <div className="hero-section-header">
              <p className="t-eyebrow mb-4">{t('hero_eyebrow')}</p>
              <h1 className="t-display-page mb-6">
                {t('hub_title_l1')} {t('hub_title_l2')}
              </h1>
              <p className="t-lead text-muted-foreground mb-8">
                {t('hub_subtitle')}
              </p>
              <div className="mt-8">
                <TrustStrip />
              </div>
            </div>
          </div>
        </section>

        <section className="section-padding border-b border-border/60">
          <div className="layout-container">
            <p className="t-eyebrow mb-3">{t('hub_products_eyebrow')}</p>
            <h2 className="t-display-sub mb-12">{t('hub_products_title')}</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Link href="/performance/forex" className="card-enterprise group block">
                <div className="flex items-center gap-4 mb-4">
                  <div className="icon-container">
                    <TrendingUp className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold group-hover:text-amber-400 transition-colors">{t('hub_forex_title')}</h3>
                    <p className="text-xs text-muted-foreground font-mono">{t('hub_forex_category')}</p>
                  </div>
                </div>
                <p className="t-body-sm text-muted-foreground leading-relaxed mb-4">
                  {t('hub_forex_desc')}
                </p>
                <div className="flex items-center gap-2 text-sm text-amber-400 font-medium">
                  {t('hub_view_performance')} <ArrowRight className="w-4 h-4" />
                </div>
              </Link>

              <Link href="/performance/crypto" className="card-enterprise group block">
                <div className="flex items-center gap-4 mb-4">
                  <div className="icon-container">
                    <Bitcoin className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold group-hover:text-amber-400 transition-colors">{t('hub_crypto_title')}</h3>
                    <p className="text-xs text-muted-foreground font-mono">{t('hub_crypto_category')}</p>
                  </div>
                </div>
                <p className="t-body-sm text-muted-foreground leading-relaxed mb-4">
                  {t('hub_crypto_desc')}
                </p>
                <div className="flex items-center gap-2 text-sm text-amber-400 font-medium">
                  {t('hub_view_performance')} <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            </div>
          </div>
        </section>

        <section className="section-padding border-b border-border/60">
          <div className="layout-container">
            <div className="rounded-xl border border-border/60 bg-card p-6 sm:p-7 max-w-3xl">
              <p className="t-eyebrow mb-3">{t('risk_eyebrow')}</p>
              <p className="text-xs text-foreground/55 leading-relaxed italic">
                {t('risk_body')}
              </p>
            </div>
          </div>
        </section>

        <StickyCtaBar
          message={ts('sticky_demo_text')}
          ctaLabel={ts('sticky_demo_cta')}
          href="/register?service=free"
        />
      </main>
      <EnterpriseFooter />
    </div>
  );
}
