'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { EquityCurve } from '@/components/charts/equity-curve';
import { ArrowRight, ArrowLeft, Bitcoin } from 'lucide-react';
import { TrustStrip } from '@/components/shared/trust-strip';
import { StickyCtaBar } from '@/components/shared/sticky-cta-bar';

interface CryptoKpi {
  totalReturn: string;
  winRate: string;
  profitFactor: string;
  maxDrawdown: string;
  totalTrades: string;
  avgHoldTime: string;
}

export default function CryptoPerformancePage() {
  const t = useTranslations('performance_crypto');
  const ts = useTranslations('shared');
  const [equityData, setEquityData] = useState<{ time: string; value: number }[]>([]);
  const [kpi, setKpi] = useState<CryptoKpi | null>(null);
  const [period, setPeriod] = useState('30D');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/crypto/portfolio')
      .then((r) => {
        if (!r.ok) throw new Error('Not available');
        return r.json();
      })
      .then((data) => {
        setEquityData(data.equity || []);
        setKpi(data.kpi || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredEquity = (() => {
    const days = period === '7D' ? 7 : period === '30D' ? 30 : period === 'YTD' ? 365 : 90;
    return equityData.slice(-days);
  })();

  const hasLiveData = !loading && filteredEquity.length > 0;
  const hasKpi = !loading && kpi !== null;

  const KPI_METRICS = kpi ? [
    { label: t('kpi_total_return'), value: kpi.totalReturn },
    { label: t('kpi_win_rate'), value: kpi.winRate },
    { label: t('kpi_profit_factor'), value: kpi.profitFactor },
    { label: t('kpi_max_dd'), value: kpi.maxDrawdown },
    { label: t('kpi_total_trades'), value: kpi.totalTrades },
    { label: t('kpi_avg_hold'), value: kpi.avgHoldTime },
  ] : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">
        <section className="section-padding border-b border-border/60 page-stamp-rule">
          <div className="layout-container">
            <Link
              href="/performance"
              className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors mb-6"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> {t('back_hub')}
            </Link>
            <div className="hero-section-header">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-mono uppercase tracking-wider text-amber-700 dark:text-amber-300 mb-6">
                <Bitcoin className="w-3.5 h-3.5" />
                {t('hero_pill')}
              </div>
              <h1 className="t-display-page mb-6">
                {t('hero_title')}
              </h1>
              <p className="t-lead text-muted-foreground">
                {hasLiveData ? t('hero_subtitle_live') : t('hero_subtitle_pending')}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/register?service=crypto" className="btn-primary">
                  {t('hero_cta_register')} <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/demo?product=robot-crypto" className="btn-secondary">
                  {t('hero_cta_demo')}
                </Link>
              </div>
              <div className="mt-10">
                <TrustStrip />
              </div>
            </div>
          </div>
        </section>

        {hasLiveData ? (
          <section className="section-padding border-b border-border/60">
            <div className="layout-container">
              <div className="flex items-center justify-between mb-8">
                <h2 className="t-display-sub">{t('equity_title')}</h2>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-foreground/50 font-mono">{t('equity_live')}</span>
                </div>
              </div>
              <div className="card-enterprise p-6" style={{ minHeight: 480 }}>
                <EquityCurve
                  data={filteredEquity}
                  height={420}
                  periods={['7D', '30D', '90D', 'YTD']}
                  activePeriod={period}
                  onPeriodChange={setPeriod}
                />
              </div>
            </div>
          </section>
        ) : (
          <section className="section-padding border-b border-border/60">
            <div className="layout-container">
              <div className="rounded-xl border border-border/80 bg-card p-8 sm:p-12 text-center max-w-2xl mx-auto">
                <Bitcoin className="w-10 h-10 text-amber-400 mx-auto mb-4" />
                <h2 className="t-display-sub mb-3">{t('pending_title')}</h2>
                <p className="t-body text-muted-foreground mb-6">{t('pending_body')}</p>
                <Link href="/register?service=crypto" className="btn-primary">
                  {t('pending_cta')} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {hasKpi && (
          <section className="section-padding border-b border-border/60">
            <div className="layout-container">
              <p className="t-eyebrow mb-3">{t('kpi_eyebrow')}</p>
              <h2 className="t-display-sub mb-12">{t('kpi_title')}</h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                {KPI_METRICS.map((metric) => (
                  <div key={metric.label} className="kpi-card">
                    <p className="t-eyebrow mb-3">{metric.label}</p>
                    <p className="text-kpi">{metric.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

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
