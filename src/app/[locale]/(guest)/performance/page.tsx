'use client';

import { useState, useEffect } from 'react';
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

const TRACKING_PILLARS = [
  {
    icon: Activity,
    title: 'Equity curve harian',
    desc: 'Setiap close trade tercatat dengan timestamp + harga eksekusi. Kurva equity dibangun dari data broker, bukan dari simulasi internal.',
  },
  {
    icon: Calendar,
    title: 'Per-session breakdown',
    desc: 'P&L per sesi (Asia / Europe / US) + per hari kerja. Membantu klien pahami kapan kontribusi bot terbesar di portfolio.',
  },
  {
    icon: FileCheck,
    title: 'Trade-by-trade audit log',
    desc: 'Setiap entry punya rationale: confidence score, indikator yang trigger, slippage, dan close reason. Tersedia untuk klien tier All-In + Institusional.',
  },
  {
    icon: ScanLine,
    title: 'Independent verification',
    desc: 'Equity statement diaudit pihak ketiga (MyFxBook + partner broker statement). Akses read-only investor password tersedia atas permintaan briefing.',
  },
];

export default function PerformancePage() {
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
    { label: 'Total Return', value: kpi.totalReturn, note: 'Sejak inception' },
    { label: 'Sharpe Ratio', value: kpi.sharpeRatio, note: 'Annualized' },
    { label: 'Sortino Ratio', value: kpi.sortinoRatio, note: 'Annualized' },
    { label: 'Profit Factor', value: kpi.profitFactor, note: 'Semua trade' },
    { label: 'Win Rate', value: kpi.winRate, note: 'Semua instrumen' },
    { label: 'Max Drawdown', value: kpi.maxDrawdown, note: 'Peak-to-trough' },
    { label: 'Avg Hold Time', value: kpi.avgHoldTime, note: 'Per trade' },
    { label: 'Recovery Factor', value: kpi.recoveryFactor, note: 'Return / MDD' },
  ] : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">
        {/* Hero — honest framing without fake authority */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">PERFORMA</p>
            <h1 className="t-display-page mb-6">
              {hasLiveData ? (
                <>Verified production<br className="hidden sm:block" /> track record.</>
              ) : (
                <>Track record live —<br className="hidden sm:block" /> publikasi setelah Q3 2026.</>
              )}
            </h1>
            <p className="t-lead text-foreground/65 max-w-2xl">
              {hasLiveData
                ? 'Data live dari production account, di-update setiap 4 jam. Equity statement + audit log tersedia atas permintaan untuk klien institusional.'
                : 'Kami sedang fase beta. Daripada menampilkan angka simulasi sebagai "track record", kami menahan publikasi sampai punya 90 hari operasi produksi nyata. Sementara itu, transparansi metodologi di bawah.'}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/contact" className="btn-primary">
                Jadwalkan briefing <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/demo" className="btn-secondary">
                Coba demo gratis
              </Link>
            </div>
          </div>
        </section>

        {/* Equity Curve OR Tracking Pillars */}
        {hasLiveData ? (
          <section className="section-padding border-b border-border/60">
            <div className="container-default px-4 sm:px-6">
              <div className="flex items-center justify-between mb-8">
                <h2 className="t-display-sub">Equity curve</h2>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-foreground/50 font-mono">Live · update 4 jam</span>
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
                <span>Audited oleh MyFxBook (read-only)</span>
                <span aria-hidden className="w-px h-3 bg-border" />
                <span>Partner broker — laporan kuartalan</span>
              </div>
            </div>
          </section>
        ) : (
          <section className="section-padding border-b border-border/60">
            <div className="container-default px-4 sm:px-6">
              <p className="t-eyebrow mb-3">METODOLOGI</p>
              <h2 className="t-display-sub mb-4">Apa yang kami lacak</h2>
              <p className="t-body text-foreground/60 max-w-2xl mb-12">
                Sebelum dipublikasi, kami sudah menyiapkan semua infrastruktur tracking
                yang nantinya muncul di halaman ini. Empat pilar di bawah ini sudah
                berjalan setiap detik di stack produksi kami.
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                {TRACKING_PILLARS.map((p) => (
                  <div key={p.title} className="rounded-xl border border-border/80 bg-card p-6 sm:p-7">
                    <div className="icon-container mb-4">
                      <p.icon className="w-5 h-5 text-amber-400" />
                    </div>
                    <h3 className="font-display text-xl font-medium mb-2">{p.title}</h3>
                    <p className="t-body-sm text-foreground/65 leading-relaxed">{p.desc}</p>
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
              <p className="t-eyebrow mb-3">METRIK</p>
              <h2 className="t-display-sub mb-12">Indikator performa kunci</h2>
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
              <p className="t-eyebrow mb-3">ANALITIK</p>
              <h2 className="t-display-sub mb-12">Statistik eksekusi</h2>

              {sessionData.length > 0 && (
                <div className="mb-16">
                  <h3 className="text-lg font-medium mb-6">P&amp;L per sesi trading</h3>
                  <div className="table-enterprise-wrapper">
                    <table className="table-enterprise">
                      <thead>
                        <tr>
                          <th>Sesi</th>
                          <th className="text-right">Trades</th>
                          <th className="text-right">Win Rate</th>
                          <th className="text-right">Avg P&amp;L</th>
                          <th className="text-right">Net P&amp;L</th>
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
                  <h3 className="text-lg font-medium mb-6">P&amp;L per hari kerja</h3>
                  <div className="table-enterprise-wrapper">
                    <table className="table-enterprise">
                      <thead>
                        <tr>
                          <th>Hari</th>
                          <th className="text-right">Trades</th>
                          <th className="text-right">Win Rate</th>
                          <th className="text-right">Avg P&amp;L</th>
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
            <p className="t-eyebrow mb-3">VERIFIKASI</p>
            <h2 className="t-display-sub mb-4">Kepercayaan dibangun bukan hanya dari klaim</h2>
            <p className="t-body text-foreground/60 max-w-2xl mb-12">
              Setiap angka yang nantinya kami publikasi datang dari data broker langsung
              + audit pihak ketiga. Klien briefing dapat akses read-only investor password
              untuk verifikasi independen.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: 'MyFxBook (planned)',
                  desc: 'Production account akan terhubung dengan investor password read-only. Equity, trade history, dan drawdown ter-verifikasi independen.',
                  link: { href: 'https://www.myfxbook.com', label: 'MyFxBook' },
                },
                {
                  title: 'Partner broker teregulasi',
                  desc: 'Eksekusi via Exness — broker partner dengan FCA, CySEC, dan FSCA license. Statement broker tersedia atas permintaan klien institusional.',
                },
                {
                  title: 'Audit kuartalan internal',
                  desc: 'Performance data direkonsiliasi setiap kuartal terhadap broker statement + on-chain proof (untuk Robot Crypto). Mismatch ≥0.1% di-investigasi penuh.',
                },
              ].map((card) => (
                <div key={card.title} className="rounded-xl border border-border/80 bg-card p-6 sm:p-7">
                  <h3 className="text-lg font-medium mb-3">{card.title}</h3>
                  <p className="t-body-sm text-foreground/65 leading-relaxed mb-4">
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

        {/* Disclaimer */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <div className="rounded-xl border border-border/60 bg-card p-6 sm:p-7 max-w-3xl">
              <p className="t-eyebrow mb-3">PERNYATAAN RISIKO</p>
              <p className="text-xs text-foreground/55 leading-relaxed italic">
                Kinerja masa lalu tidak menjamin hasil di masa depan. Trading instrumen
                finansial mengandung risiko substansial dan dapat mengakibatkan kerugian
                sebagian atau seluruh modal. Leverage yang tinggi dapat bekerja dua arah —
                untuk Anda maupun melawan Anda. Pastikan Anda memahami profil risiko Anda
                sebelum mengaktifkan tier apa pun.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section-padding text-center">
          <div className="container-default px-4 sm:px-6">
            <h2 className="t-display-sub mb-4">Mau melihat detail lengkap?</h2>
            <p className="t-body text-foreground/60 mb-8 max-w-lg mx-auto">
              Briefing 30 menit untuk diskusi metodologi, audit log akses, dan fit dengan
              profil portfolio Anda.
            </p>
            <Link href="/contact" className="btn-primary">
              Jadwalkan briefing <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
