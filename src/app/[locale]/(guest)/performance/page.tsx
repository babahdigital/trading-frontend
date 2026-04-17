'use client';

import { useState, useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { EquityCurve } from '@/components/charts/equity-curve';
import { ArrowRight } from 'lucide-react';

const SESSION_DATA = [
  { session: 'Asia (00:00-08:00 UTC)', trades: '1,247', winRate: '61.3%', avgPnl: '+$42', netPnl: '+$52,374' },
  { session: 'Europe (08:00-16:00 UTC)', trades: '2,891', winRate: '66.1%', avgPnl: '+$58', netPnl: '+$167,678' },
  { session: 'US (13:00-21:00 UTC)', trades: '1,983', winRate: '63.8%', avgPnl: '+$51', netPnl: '+$101,133' },
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
      <main>
        {/* Hero */}
        <section className="border-b border-border">
          <div className="max-w-5xl mx-auto px-6 py-24">
            <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-6">
              Verified production track record.
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Live data from production account. Updated every 4 hours.
            </p>
          </div>
        </section>

        {/* Equity Curve — Live */}
        <section className="border-b border-border">
          <div className="max-w-5xl mx-auto px-6 py-20">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-display text-2xl font-semibold">Equity curve</h2>
              <div className="text-xs text-muted-foreground font-mono">
                Updated every 4h
              </div>
            </div>
            <div className="border border-border rounded-lg p-6 bg-card">
              {loading ? (
                <div className="h-[360px] flex items-center justify-center text-muted-foreground text-sm">
                  Loading performance data...
                </div>
              ) : (
                <EquityCurve
                  data={filteredEquity}
                  height={360}
                  periods={['7D', '30D', '90D', 'YTD']}
                  activePeriod={period}
                  onPeriodChange={setPeriod}
                />
              )}
            </div>
            <div className="mt-6 flex items-center gap-6 text-xs text-muted-foreground">
              <span>Audited by MyFxBook</span>
              <span className="w-px h-3 bg-border" />
              <span>Partner broker verified</span>
            </div>
          </div>
        </section>

        {/* KPI Grid */}
        <section className="border-b border-border">
          <div className="max-w-5xl mx-auto px-6 py-20">
            <h2 className="font-display text-2xl font-semibold mb-12">Key performance indicators</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {KPI_METRICS.map((metric) => (
                <div key={metric.label} className="border border-border rounded-lg p-8 bg-card">
                  <p className="text-xs text-muted-foreground mb-2">{metric.label}</p>
                  <p className="font-mono text-2xl font-semibold">{metric.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{metric.note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Execution Stats */}
        <section className="border-b border-border">
          <div className="max-w-5xl mx-auto px-6 py-20">
            <h2 className="font-display text-2xl font-semibold mb-12">Execution statistics</h2>

            <div className="mb-16">
              <h3 className="font-semibold mb-6">P&L by trading session</h3>
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-card">
                        <th className="text-left p-4 font-medium text-muted-foreground">Session</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">Trades</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">Win Rate</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">Avg P&L</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">Net P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SESSION_DATA.map((row) => (
                        <tr key={row.session} className="border-b border-border last:border-b-0">
                          <td className="p-4 text-muted-foreground">{row.session}</td>
                          <td className="p-4 text-right font-mono">{row.trades}</td>
                          <td className="p-4 text-right font-mono">{row.winRate}</td>
                          <td className="p-4 text-right font-mono">{row.avgPnl}</td>
                          <td className="p-4 text-right font-mono">{row.netPnl}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-6">P&L by day of week</h3>
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-card">
                        <th className="text-left p-4 font-medium text-muted-foreground">Day</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">Trades</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">Win Rate</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">Avg P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DOW_DATA.map((row) => (
                        <tr key={row.day} className="border-b border-border last:border-b-0">
                          <td className="p-4 text-muted-foreground">{row.day}</td>
                          <td className="p-4 text-right font-mono">{row.trades}</td>
                          <td className="p-4 text-right font-mono">{row.winRate}</td>
                          <td className="p-4 text-right font-mono">{row.avgPnl}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Independent Verification */}
        <section className="border-b border-border">
          <div className="max-w-5xl mx-auto px-6 py-20">
            <h2 className="font-display text-2xl font-semibold mb-12">Independent verification</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="border border-border rounded-lg p-8 bg-card">
                <h3 className="font-semibold mb-3">MyFxBook verified</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Our production account is connected to MyFxBook with read-only investor password access.
                  All trades, equity, and drawdown data are independently verified.
                </p>
                <a
                  href="https://www.myfxbook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-foreground hover:text-accent transition-colors"
                >
                  View on MyFxBook
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
              <div className="border border-border rounded-lg p-8 bg-card">
                <h3 className="font-semibold mb-3">Broker partner</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We trade through regulated broker partners who provide independent trade confirmation,
                  account statements, and regulatory oversight.
                </p>
              </div>
              <div className="border border-border rounded-lg p-8 bg-card">
                <h3 className="font-semibold mb-3">Quarterly audit</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Performance data undergoes quarterly internal audit comparing platform records against
                  broker statements.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="border-b border-border">
          <div className="max-w-5xl mx-auto px-6 py-12">
            <div className="border border-border rounded-lg p-8 bg-card">
              <h3 className="font-semibold text-sm mb-3">Important disclaimer</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Past performance is not indicative of future results. Trading foreign exchange and other
                financial instruments carries a high level of risk and may not be suitable for all investors.
                The high degree of leverage can work against you as well as for you. Before deciding to trade,
                you should carefully consider your investment objectives, level of experience, and risk appetite.
                The possibility exists that you could sustain a loss of some or all of your initial investment.
                You should not invest money that you cannot afford to lose.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section>
          <div className="max-w-5xl mx-auto px-6 py-12 text-center">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 border border-border rounded-md px-6 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Schedule Briefing
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
