'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { EquityCurve } from '@/components/charts/equity-curve';
import { ArrowRight, Activity, Calendar, FileCheck, ScanLine } from 'lucide-react';

interface KpiData {
  totalReturn: string;
  sharpeRatio: string;
  sortinoRatio: string;
  profitFactor: string;
  winRate: string;
  maxDrawdown: string;
  avgHoldTime: string;
  recoveryFactor: string;
}

interface SessionRow {
  session: string;
  trades: string;
  winRate: string;
  avgPnl: string;
  netPnl: string;
}
interface DowRow {
  day: string;
  trades: string;
  winRate: string;
  avgPnl: string;
}

const TRACKING_PILLAR_META = [
  { icon: Activity, titleKey: 'pillar_equity_title', descKey: 'pillar_equity_desc' },
  { icon: Calendar, titleKey: 'pillar_session_title', descKey: 'pillar_session_desc' },
  { icon: FileCheck, titleKey: 'pillar_audit_title', descKey: 'pillar_audit_desc' },
  { icon: ScanLine, titleKey: 'pillar_verify_title', descKey: 'pillar_verify_desc' },
] as const;

export default function PerformancePage() {
  const t = useTranslations('performance_page');
  const [equityData, setEquityData] = useState<{ time: string; value: number }[]>([]);
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [source, setSource] = useState<string>('');
  const [sessionData, setSessionData] = useState<SessionRow[]>([]);
  const [dowData, setDowData] = useState<DowRow[]>([]);
  const [period, setPeriod] = useState('90D');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/public/performance')
      .then((r) => r.json())
      .then((data) => {
        setEquityData(data.equity || []);
        setKpi(data.kpi || null);
        setSource(data.source || '');
        setSessionData(Array.isArray(data.session) ? data.session : []);
        setDowData(Array.isArray(data.dayOfWeek) ? data.dayOfWeek : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredEquity = (() => {
    const days = period === '7D' ? 7 : period === '30D' ? 30 : period === 'YTD' ? 365 : 90;
    return equityData.slice(-days);
  })();

  const hasLiveData = !loading && filteredEquity.length > 0;
  // KPI grid only shows when we have real data — if Sharpe (the keystone
  // institutional metric) is "—" the rest is noise, hide it entirely.
  const kpiHasRealData = kpi !== null
    && kpi.sharpeRatio !== '—'
    && source !== 'empty';
  const hasKpi = !loading && kpiHasRealData;

  const KPI_METRICS = kpi ? [
    { label: t('kpi_total_return'), value: kpi.totalReturn, note: t('kpi_note_inception') },
    { label: t('kpi_sharpe'), value: kpi.sharpeRatio, note: t('kpi_note_annualized') },
    { label: t('kpi_sortino'), value: kpi.sortinoRatio, note: t('kpi_note_annualized') },
    { label: t('kpi_profit_factor'), value: kpi.profitFactor, note: t('kpi_note_all_trades') },
    { label: t('kpi_win_rate'), value: kpi.winRate, note: t('kpi_note_all_inst') },
    { label: t('kpi_max_dd'), value: kpi.maxDrawdown, note: t('kpi_note_peak_trough') },
    { label: t('kpi_avg_hold'), value: kpi.avgHoldTime, note: t('kpi_note_per_trade') },
    { label: t('kpi_recovery'), value: kpi.recoveryFactor, note: t('kpi_note_return_mdd') },
  ] : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">
        {/* Hero — performance uses page-stamp-rule (subtle accent gradient at
            top) so the data section reads as the focal point, not the hero */}
        <section className="section-padding border-b border-border/60 page-stamp-rule">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('hero_eyebrow')}</p>
            <h1 className="t-display-page mb-6">
              {hasLiveData ? (
                <>{t('hero_title_live_l1')}<br className="hidden sm:block" /> {t('hero_title_live_l2')}</>
              ) : (
                <>{t('hero_title_beta_l1')}<br className="hidden sm:block" /> {t('hero_title_beta_l2')}</>
              )}
            </h1>
            <p className="t-lead text-muted-foreground max-w-2xl">
              {hasLiveData ? t('hero_subtitle_live') : t('hero_subtitle_beta')}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/contact" className="btn-primary">
                {t('hero_cta_briefing')} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/demo" className="btn-secondary">
                {t('hero_cta_demo')}
              </Link>
            </div>
          </div>
        </section>

        {/* Equity Curve OR Tracking Pillars */}
        {hasLiveData ? (
          <section className="section-padding border-b border-border/60">
            <div className="container-default px-4 sm:px-6">
              <div className="flex items-center justify-between mb-8">
                <h2 className="t-display-sub">{t('equity_curve_title')}</h2>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-foreground/50 font-mono">{t('equity_live_label')}</span>
                </div>
              </div>
              <div className="card-enterprise p-6" style={{ minHeight: 480 }}>
                <EquityCurve
                  data={filteredEquity}
                  height={420}
                  periods={['7D', '30D', '90D', 'YTD', '1Y', 'ALL']}
                  activePeriod={period}
                  onPeriodChange={setPeriod}
                />
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-foreground/50">
                <span>{t('equity_source_db')}</span>
                <span aria-hidden className="w-px h-3 bg-border" />
                <span>{t('equity_source_recon')}</span>
              </div>
            </div>
          </section>
        ) : (
          <section className="section-padding border-b border-border/60">
            <div className="container-default px-4 sm:px-6">
              <p className="t-eyebrow mb-3">{t('method_eyebrow')}</p>
              <h2 className="t-display-sub mb-4">{t('method_title')}</h2>
              <p className="t-body text-foreground/60 max-w-2xl mb-12">
                {t('method_body')}
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                {TRACKING_PILLAR_META.map((p) => (
                  <div key={p.titleKey} className="rounded-xl border border-border/80 bg-card p-6 sm:p-7">
                    <div className="icon-container mb-4">
                      <p.icon className="w-5 h-5 text-amber-400" />
                    </div>
                    <h3 className="font-display text-xl font-medium mb-2">{t(p.titleKey)}</h3>
                    <p className="t-body-sm text-foreground/65 leading-relaxed">{t(p.descKey)}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* KPI Grid — only render when real data */}
        {hasKpi && (
          <section className="section-padding border-b border-border/60">
            <div className="container-default px-4 sm:px-6">
              <p className="t-eyebrow mb-3">{t('kpi_eyebrow')}</p>
              <h2 className="t-display-sub mb-12">{t('kpi_title')}</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                {KPI_METRICS.map((metric) => (
                  <div key={metric.label} className="kpi-card">
                    <p className="t-eyebrow mb-3">{metric.label}</p>
                    <p className="text-kpi">{metric.value}</p>
                    <p className="text-xs text-foreground/50 mt-2">{metric.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Execution Stats — only when real session/dow data exist */}
        {(sessionData.length > 0 || dowData.length > 0) && (
          <section className="section-padding border-b border-border/60">
            <div className="container-default px-4 sm:px-6">
              <p className="t-eyebrow mb-3">{t('analytics_eyebrow')}</p>
              <h2 className="t-display-sub mb-12">{t('analytics_title')}</h2>

              {sessionData.length > 0 && (
                <div className="mb-16">
                  <h3 className="text-lg font-medium mb-6">{t('session_table_title')}</h3>
                  <div className="table-enterprise-wrapper">
                    <table className="table-enterprise">
                      <thead>
                        <tr>
                          <th>{t('session_col_session')}</th>
                          <th className="text-right">{t('session_col_trades')}</th>
                          <th className="text-right">{t('session_col_winrate')}</th>
                          <th className="text-right">{t('session_col_avg')}</th>
                          <th className="text-right">{t('session_col_net')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessionData.map((row) => (
                          <tr key={row.session}>
                            <td className="!text-foreground/65 !font-body">{row.session}</td>
                            <td className="text-right">{row.trades}</td>
                            <td className="text-right">{row.winRate}</td>
                            <td className="text-right text-emerald-400">{row.avgPnl}</td>
                            <td className="text-right text-emerald-400 font-semibold">{row.netPnl}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {dowData.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-6">{t('dow_table_title')}</h3>
                  <div className="table-enterprise-wrapper">
                    <table className="table-enterprise">
                      <thead>
                        <tr>
                          <th>{t('dow_col_day')}</th>
                          <th className="text-right">{t('dow_col_trades')}</th>
                          <th className="text-right">{t('dow_col_winrate')}</th>
                          <th className="text-right">{t('dow_col_avg')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dowData.map((row) => (
                          <tr key={row.day}>
                            <td className="!text-foreground/65 !font-body">{row.day}</td>
                            <td className="text-right">{row.trades}</td>
                            <td className="text-right">{row.winRate}</td>
                            <td className="text-right text-emerald-400">{row.avgPnl}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Independent Verification — institutional trust */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">{t('verify_eyebrow')}</p>
            <h2 className="t-display-sub mb-4">{t('verify_title')}</h2>
            <p className="t-body text-foreground/60 max-w-2xl mb-12">
              {t('verify_body')}
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { title: t('verify_card1_title'), desc: t('verify_card1_desc') },
                { title: t('verify_card2_title'), desc: t('verify_card2_desc') },
                { title: t('verify_card3_title'), desc: t('verify_card3_desc') },
              ].map((card) => (
                <div key={card.title} className="rounded-xl border border-border/80 bg-card p-6 sm:p-7">
                  <h3 className="text-lg font-medium mb-3">{card.title}</h3>
                  <p className="t-body-sm text-foreground/65 leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <div className="rounded-xl border border-border/60 bg-card p-6 sm:p-7 max-w-3xl">
              <p className="t-eyebrow mb-3">{t('risk_eyebrow')}</p>
              <p className="text-xs text-foreground/55 leading-relaxed italic">
                {t('risk_body')}
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section-padding text-center">
          <div className="container-default px-4 sm:px-6">
            <h2 className="t-display-sub mb-4">{t('cta_title')}</h2>
            <p className="t-body text-foreground/60 mb-8 max-w-lg mx-auto">
              {t('cta_body')}
            </p>
            <Link href="/contact" className="btn-primary">
              {t('cta_button')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
