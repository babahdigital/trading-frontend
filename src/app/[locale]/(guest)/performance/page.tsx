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
              <p className="t-eyebrow eyebrow-rule mb-4">{t('hero_eyebrow')}</p>
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
            <p className="t-eyebrow eyebrow-rule mb-3">{t('hub_products_eyebrow')}</p>
            <h2 className="t-display-sub mb-12">{t('hub_products_title')}</h2>
            <div className="grid md:grid-cols-2 gap-5">
              <Link href="/performance/forex" className="group block rounded-xl border border-border/40 bg-card/40 hover:border-amber-500/30 hover:bg-card/60 transition-all p-6 sm:p-7">
                <div className="flex items-center gap-4 mb-4">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-amber-500/[0.06] border border-amber-500/20">
                    <TrendingUp className="w-4 h-4 text-amber-500/80" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-foreground/90 group-hover:text-foreground transition-colors">{t('hub_forex_title')}</h3>
                    <p className="text-[10px] text-foreground/45 font-mono uppercase tracking-[0.16em]">{t('hub_forex_category')}</p>
                  </div>
                </div>
                <p className="t-body-sm text-foreground/60 leading-relaxed mb-4">
                  {t('hub_forex_desc')}
                </p>
                <div className="inline-flex items-center gap-1.5 text-xs text-amber-500/80 group-hover:text-amber-500 transition-colors font-medium">
                  {t('hub_view_performance')} <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>

              <Link href="/performance/crypto" className="group block rounded-xl border border-border/40 bg-card/40 hover:border-amber-500/30 hover:bg-card/60 transition-all p-6 sm:p-7">
                <div className="flex items-center gap-4 mb-4">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-amber-500/[0.06] border border-amber-500/20">
                    <Bitcoin className="w-4 h-4 text-amber-500/80" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-foreground/90 group-hover:text-foreground transition-colors">{t('hub_crypto_title')}</h3>
                    <p className="text-[10px] text-foreground/45 font-mono uppercase tracking-[0.16em]">{t('hub_crypto_category')}</p>
                  </div>
                </div>
                <p className="t-body-sm text-foreground/60 leading-relaxed mb-4">
                  {t('hub_crypto_desc')}
                </p>
                <div className="inline-flex items-center gap-1.5 text-xs text-amber-500/80 group-hover:text-amber-500 transition-colors font-medium">
                  {t('hub_view_performance')} <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            </div>
          </div>
        </section>

        <section className="section-padding border-b border-border/60">
          <div className="layout-container">
            <div className="rounded-xl border border-border/40 bg-card/40 p-6 sm:p-7 max-w-3xl">
              <p className="t-eyebrow eyebrow-rule mb-3">{t('risk_eyebrow')}</p>
              <p className="text-xs text-foreground/55 leading-relaxed">
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
