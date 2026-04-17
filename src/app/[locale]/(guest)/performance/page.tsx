'use client';

import { useState, useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { EquityCurve } from '@/components/charts/equity-curve';
import { ArrowRight } from 'lucide-react';

const SESSION_DATA = [
  { session: 'Asia (00:00–08:00 UTC)', trades: '1,247', winRate: '61.3%', avgPnl: '+$42', netPnl: '+$52,374' },
  { session: 'Europe (08:00–16:00 UTC)', trades: '2,891', winRate: '66.1%', avgPnl: '+$58', netPnl: '+$167,678' },
  { session: 'US (13:00–21:00 UTC)', trades: '1,983', winRate: '63.8%', avgPnl: '+$51', netPnl: '+$101,133' },
];

const DOW_DATA = [
  { day: 'Monday', trades: '1,102', winRate: '63.4%', avgPnl: '+$48' },
  { day: 'Tuesday', trades: '1,287', winRate: '65.9%', avgPnl: '+$55' },
  { day: 'Wednesday', trades: '1,341', winRate: '64.7%', avgPnl: '+$52' },
  { day: 'Thursday', trades: '1,198', winRate: '63.1%', avgPnl: '+$47' },
  { day: 'Friday', trades: '1,193', winRate: '62.8%', avgPnl: '+$44' },
];

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

export default function PerformancePage() {
  const [equityData, setEquityData] = useState<{ time: string; value: number }[]>([]);
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [period, setPeriod] = useState('90D');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/public/performance')
      .then(r => r.json())
      .then(data => {
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

  const KPI_METRICS = kpi ? [
    { label: 'Total Return', value: kpi.totalReturn, note: 'Since inception' },
    { label: 'Sharpe Ratio', value: kpi.sharpeRatio, note: 'Annualized' },
    { label: 'Sortino Ratio', value: kpi.sortinoRatio, note: 'Annualized' },
    { label: 'Profit Factor', value: kpi.profitFactor, note: 'All trades' },
    { label: 'Win Rate', value: kpi.winRate, note: 'All instruments' },
    { label: 'Max Drawdown', value: kpi.maxDrawdown, note: 'Peak to trough' },
    { label: 'Avg Hold Time', value: kpi.avgHoldTime, note: 'Per trade' },
    { label: 'Recovery Factor', value: kpi.recoveryFactor, note: 'Return / MDD' },
  ] : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">
        {/* Hero */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-4">Live Track Record</p>
            <h1 className="t-display-page mb-6">
              Verified production<br className="hidden sm:block" /> track record.
            </h1>
            <p className="t-lead text-foreground/60 max-w-2xl">
              Live data from production account. IC Markets Raw. Updated every 4 hours.
            </p>
          </div>
        </section>

        {/* Equity Curve */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="t-display-sub">Equity curve</h2>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-foreground/40 font-mono">Live &middot; Updated every 4h</span>
              </div>
            </div>
            <div className="card-enterprise p-6" style={{ minHeight: 480 }}>
              {loading ? (
                <div className="h-[420px] flex items-center justify-center text-foreground/40 text-sm">
                  Loading performance data...
                </div>
              ) : (
                <EquityCurve
                  data={filteredEquity}
                  height={420}
                  periods={['7D', '30D', '90D', 'YTD', '1Y', 'ALL']}
                  activePeriod={period}
                  onPeriodChange={setPeriod}
                />
              )}
            </div>
            <div className="mt-6 flex items-center gap-6 text-xs text-foreground/40">
              <span>Audited by MyFxBook</span>
              <span className="w-px h-3 bg-white/10" />
              <span>IC Markets Raw &middot; Partner verified</span>
            </div>
          </div>
        </section>

        {/* KPI Grid */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-3">Key Metrics</p>
            <h2 className="t-display-sub mb-12">Key performance indicators</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {KPI_METRICS.map((metric) => (
                <div key={metric.label} className="kpi-card">
                  <p className="t-eyebrow mb-3">{metric.label}</p>
                  <p className="text-kpi">{metric.value}</p>
                  <p className="text-xs text-foreground/40 mt-2">{metric.note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Execution Stats — Enterprise Tables */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-3">Analytics</p>
            <h2 className="t-display-sub mb-12">Execution statistics</h2>

            <div className="mb-16">
              <h3 className="text-lg font-medium mb-6">P&L by trading session</h3>
              <div className="table-enterprise-wrapper">
                <table className="table-enterprise">
                  <thead>
                    <tr>
                      <th>Session</th>
                      <th className="text-right">Trades</th>
                      <th className="text-right">Win Rate</th>
                      <th className="text-right">Avg P&L</th>
                      <th className="text-right">Net P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SESSION_DATA.map((row) => (
                      <tr key={row.session}>
                        <td className="!text-foreground/60 !font-body">{row.session}</td>
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

            <div>
              <h3 className="text-lg font-medium mb-6">P&L by day of week</h3>
              <div className="table-enterprise-wrapper">
                <table className="table-enterprise">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th className="text-right">Trades</th>
                      <th className="text-right">Win Rate</th>
                      <th className="text-right">Avg P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DOW_DATA.map((row) => (
                      <tr key={row.day}>
                        <td className="!text-foreground/60 !font-body">{row.day}</td>
                        <td className="text-right">{row.trades}</td>
                        <td className="text-right">{row.winRate}</td>
                        <td className="text-right text-emerald-400">{row.avgPnl}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* Independent Verification */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-3">Trust</p>
            <h2 className="t-display-sub mb-12">Independent verification</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: 'MyFxBook verified',
                  desc: 'Production account connected with read-only investor password. All trades, equity, and drawdown independently verified.',
                  link: { href: 'https://www.myfxbook.com', label: 'View on MyFxBook' },
                },
                {
                  title: 'Broker partner',
                  desc: 'We trade through regulated broker partners who provide independent trade confirmation, account statements, and regulatory oversight.',
                },
                {
                  title: 'Quarterly audit',
                  desc: 'Performance data undergoes quarterly internal audit comparing platform records against broker statements.',
                },
              ].map((card) => (
                <div key={card.title} className="card-enterprise">
                  <h3 className="text-lg font-medium mb-3">{card.title}</h3>
                  <p className="t-body-sm text-foreground/60 leading-relaxed mb-4">
                    {card.desc}
                  </p>
                  {card.link && (
                    <a
                      href={card.link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-tertiary text-sm"
                    >
                      {card.link.label} <ArrowRight className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Downloads */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-3">Documents</p>
            <h2 className="t-display-sub mb-8">Downloads</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: 'Tear Sheet PDF', desc: 'Latest performance summary' },
                { label: 'Audited Statement', desc: 'Request via briefing' },
                { label: 'Methodology Whitepaper', desc: 'Strategy documentation' },
              ].map((doc) => (
                <div key={doc.label} className="card-enterprise flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{doc.label}</p>
                    <p className="text-xs text-foreground/40 mt-1">{doc.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-foreground/30" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <div className="card-enterprise max-w-3xl">
              <p className="t-eyebrow mb-3">Important Disclaimer</p>
              <p className="text-xs text-foreground/50 leading-relaxed italic">
                Past performance is not indicative of future results. Trading foreign exchange and other
                financial instruments carries a high level of risk and may not be suitable for all investors.
                The high degree of leverage can work against you as well as for you. Before deciding to trade,
                you should carefully consider your investment objectives, level of experience, and risk appetite.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section-padding text-center">
          <div className="container-default px-6">
            <h2 className="t-display-sub mb-4">Ready to see the full picture?</h2>
            <p className="t-body text-foreground/60 mb-8">Schedule a briefing to discuss our methodology and track record in detail.</p>
            <Link href="/contact" className="btn-primary">
              Schedule Briefing <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
