'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronDown, Activity, Check, X as XIcon, Server, Database, Cpu, RefreshCw } from 'lucide-react';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { StickyCtaBar } from '@/components/shared/sticky-cta-bar';
import { cn } from '@/lib/utils';

type StatusEnum = 'operational' | 'degraded' | 'outage';

type DescCode =
  | 'portal_ok'
  | 'db_ok'
  | 'db_down'
  | 'trading_engine_ok'
  | 'trading_engine_down'
  | 'worker_never_run'
  | 'worker_recent_ok'
  | 'worker_stale'
  | 'worker_error'
  | 'worker_cascade';

interface ComponentRow {
  nameKey: string;
  status: StatusEnum;
  descCode: DescCode;
  descData?: { mins?: number; items?: number; error?: string; latency?: number };
}

interface StatusSnapshot {
  overall: StatusEnum;
  components: ComponentRow[];
  workers: Array<{
    scope: string;
    lastRunAt: string | null;
    lastStatus: string | null;
    runCount: number;
    lastSeenId: string;
    lastError: string | null;
  }>;
  recentHealthChecks: Array<{
    name: string;
    checkedAt: string;
    httpStatus: number | null;
    responseTimeMs: number | null;
    dbOk: boolean | null;
    zmqConnected: boolean | null;
  }>;
  timestamp: string;
  deploy: {
    commit: string | null;
    version: string;
    buildTime: string | null;
  };
}

const COPY = {
  id: {
    eyebrow: 'Status Sistem',
    page_title: 'Kesehatan Platform Real-Time',
    page_subtitle: 'Monitor live komponen infrastruktur BabahAlgo. Data ter-update otomatis setiap 30 detik.',
    auto_refresh: 'Auto-refresh',
    auto_refresh_seconds: 'setiap 30 detik',
    updated: 'Diperbarui',
    refresh_now: 'Refresh sekarang',
    overall_operational: 'Semua Sistem Beroperasi Normal',
    overall_degraded: 'Gangguan Sebagian — Sistem inti tetap jalan',
    overall_outage: 'Gangguan Layanan Besar — Sebagian fitur tidak tersedia',
    overall_loading: 'Memuat status…',
    error_load: 'Gagal memuat status',
    components_section: 'Komponen Infrastruktur',
    components_loading: 'Memuat komponen…',
    workers_section: 'Worker Background',
    workers_meta: (n: number, total: number) => `${n} worker · ${total.toLocaleString('id-ID')} total jalan kumulatif`,
    workers_empty: 'Belum ada catatan worker run.',
    workers_th: { name: 'Worker', last_run: 'Jalan Terakhir', status: 'Status', count: 'Jumlah Run', cursor: 'Stream Cursor' },
    workers_not_run: 'Belum pernah jalan',
    health_section: 'Riwayat Health Check Backend',
    health_meta: (n: number) => `${n} entry terbaru`,
    health_empty: 'Belum ada health check tercatat.',
    health_th: { instance: 'Instance', time: 'Waktu', http: 'HTTP', latency: 'Latensi', db: 'DB', zmq: 'ZMQ Bridge' },
    deploy_section: 'Informasi Deploy',
    deploy_version: 'Versi',
    deploy_commit: 'Commit',
    deploy_build: 'Build',
    rel_just_now: 'baru saja',
    rel_minutes: (m: number) => `${m} menit lalu`,
    rel_hours: (h: number) => `${h} jam lalu`,
    status_label: { operational: 'Beroperasi', degraded: 'Terdegradasi', outage: 'Gangguan' },
    worker_status_label: { ok: 'Sukses', SKIPPED: 'Dilewati', NO_DATA: 'Tanpa Data', ERROR: 'Error', RUNNING: 'Berjalan' } as Record<string, string>,
    // Component name + description templates (interpolated dengan descData)
    components: {
      portal: 'Portal & Frontend BabahAlgo',
      database: 'Database PostgreSQL',
      trading_engine: 'Mesin Trading Backend (VPS1)',
      signals: 'Worker Dispatcher Sinyal',
      pair_brief: 'Worker Generator Pair Brief',
    } as Record<string, string>,
    desc: {
      portal_ok: 'Website publik, portal klien, dan CMS admin online',
      db_ok: 'PostgreSQL terkoneksi, semua kueri responsif',
      db_down: 'PostgreSQL tidak terjangkau — investigasi diperlukan',
      trading_engine_ok: (d: Record<string, string | number>) => `Backend terjangkau, latensi ${d.latency}ms`,
      trading_engine_down: (d: Record<string, string | number>) => `Backend gateway sedang offline (latency ${d.latency}ms). Tim infrastruktur sudah ditugaskan untuk recovery — sinyal trading & analitik mungkin tertunda. Operasi non-trading (portal, riset, akun) tetap normal.`,
      worker_never_run: 'Belum pernah dijalankan',
      worker_recent_ok: (d: Record<string, string | number>) => {
        const ageStr = ageHuman('id', Number(d.mins));
        return `Jalan terakhir ${ageStr} — ${d.items} item diproses`;
      },
      worker_stale: (d: Record<string, string | number>) => {
        const ageStr = ageHuman('id', Number(d.mins));
        return `Stale — jalan terakhir ${ageStr}`;
      },
      worker_error: (d: Record<string, string | number>) => {
        const ageStr = ageHuman('id', Number(d.mins));
        return `Error ${ageStr}: ${d.error}`;
      },
      worker_cascade: (d: Record<string, string | number>) => {
        const ageStr = ageHuman('id', Number(d.mins));
        return `Menunggu backend trading kembali online — worker akan auto-recover saat gateway pulih. Terakhir dicoba ${ageStr}.`;
      },
    } as Record<string, string | ((d: Record<string, string | number>) => string)>,
  },
  en: {
    eyebrow: 'System Status',
    page_title: 'Real-Time Platform Health',
    page_subtitle: 'Live monitoring of BabahAlgo infrastructure components. Data auto-refreshes every 30 seconds.',
    auto_refresh: 'Auto-refresh',
    auto_refresh_seconds: 'every 30 seconds',
    updated: 'Updated',
    refresh_now: 'Refresh now',
    overall_operational: 'All Systems Operational',
    overall_degraded: 'Partial Outage — Core systems still running',
    overall_outage: 'Major Service Disruption — Some features unavailable',
    overall_loading: 'Loading status…',
    error_load: 'Failed to load status',
    components_section: 'Infrastructure Components',
    components_loading: 'Loading components…',
    workers_section: 'Background Workers',
    workers_meta: (n: number, total: number) => `${n} workers · ${total.toLocaleString('en-US')} cumulative runs`,
    workers_empty: 'No worker runs recorded yet.',
    workers_th: { name: 'Worker', last_run: 'Last Run', status: 'Status', count: 'Run Count', cursor: 'Stream Cursor' },
    workers_not_run: 'Not run yet',
    health_section: 'Backend Health Check History',
    health_meta: (n: number) => `${n} recent entries`,
    health_empty: 'No health checks recorded yet.',
    health_th: { instance: 'Instance', time: 'Time', http: 'HTTP', latency: 'Latency', db: 'DB', zmq: 'ZMQ Bridge' },
    deploy_section: 'Deploy Information',
    deploy_version: 'Version',
    deploy_commit: 'Commit',
    deploy_build: 'Build',
    rel_just_now: 'just now',
    rel_minutes: (m: number) => `${m} minutes ago`,
    rel_hours: (h: number) => `${h} hours ago`,
    status_label: { operational: 'Operational', degraded: 'Degraded', outage: 'Outage' },
    worker_status_label: { ok: 'Success', SKIPPED: 'Skipped', NO_DATA: 'No Data', ERROR: 'Error', RUNNING: 'Running' } as Record<string, string>,
    components: {
      portal: 'BabahAlgo Portal & Frontend',
      database: 'PostgreSQL Database',
      trading_engine: 'Trading Engine Backend (VPS1)',
      signals: 'Signal Dispatcher Worker',
      pair_brief: 'Pair Brief Generator Worker',
    } as Record<string, string>,
    desc: {
      portal_ok: 'Public website, client portal, and admin CMS online',
      db_ok: 'PostgreSQL connected, all queries responsive',
      db_down: 'PostgreSQL unreachable — investigation required',
      trading_engine_ok: (d: Record<string, string | number>) => `Backend reachable, latency ${d.latency}ms`,
      trading_engine_down: (d: Record<string, string | number>) => `Trading backend gateway is offline (latency ${d.latency}ms). Infrastructure team has been notified — trading signals & analytics may be delayed. Non-trading operations (portal, research, account) remain normal.`,
      worker_never_run: 'Has never run',
      worker_recent_ok: (d: Record<string, string | number>) => {
        const ageStr = ageHuman('en', Number(d.mins));
        return `Last run ${ageStr} — ${d.items} items processed`;
      },
      worker_stale: (d: Record<string, string | number>) => {
        const ageStr = ageHuman('en', Number(d.mins));
        return `Stale — last run ${ageStr}`;
      },
      worker_error: (d: Record<string, string | number>) => {
        const ageStr = ageHuman('en', Number(d.mins));
        return `Error ${ageStr}: ${d.error}`;
      },
      worker_cascade: (d: Record<string, string | number>) => {
        const ageStr = ageHuman('en', Number(d.mins));
        return `Waiting for trading backend to come back online — worker will auto-recover when gateway is restored. Last attempt ${ageStr}.`;
      },
    } as Record<string, string | ((d: Record<string, string | number>) => string)>,
  },
};

function ageHuman(locale: 'id' | 'en', mins: number): string {
  if (mins < 1) return locale === 'id' ? 'baru saja' : 'just now';
  if (mins < 60) return locale === 'id' ? `${mins}m lalu` : `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return locale === 'id' ? `${hrs}j lalu` : `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return locale === 'id' ? `${days}h lalu` : `${days}d ago`;
}

const STATUS_TONE: Record<StatusEnum, { dot: string; text: string; bg: string; border: string; icon: typeof Check }> = {
  operational: {
    dot: 'bg-[hsl(var(--profit))]',
    text: 'text-[hsl(var(--profit))]',
    bg: 'bg-[hsl(var(--profit))]/10',
    border: 'border-[hsl(var(--profit))]/30',
    icon: Check,
  },
  degraded: {
    dot: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: Activity,
  },
  outage: {
    dot: 'bg-[hsl(var(--destructive))]',
    text: 'text-[hsl(var(--destructive))]',
    bg: 'bg-[hsl(var(--destructive))]/10',
    border: 'border-[hsl(var(--destructive))]/30',
    icon: XIcon,
  },
};

const COMPONENT_ICONS: Record<string, typeof Server> = {
  portal: Server,
  database: Database,
  trading_engine: Cpu,
  signals: Activity,
  pair_brief: Activity,
};

function makeRelTime(localeCopy: typeof COPY.id, dateLocale: string) {
  return function RelativeTime({ iso }: { iso: string }) {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.round(diff / 60000);
    if (mins < 1) return <span>{localeCopy.rel_just_now}</span>;
    if (mins < 60) return <span>{localeCopy.rel_minutes(mins)}</span>;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return <span>{localeCopy.rel_hours(hrs)}</span>;
    return <span>{d.toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })}</span>;
  };
}

function renderComponentDesc(
  t: typeof COPY.id,
  descCode: DescCode,
  descData?: { mins?: number; items?: number; error?: string; latency?: number },
): string {
  const tpl = t.desc[descCode];
  if (typeof tpl === 'function') {
    return tpl({
      mins: descData?.mins ?? 0,
      items: descData?.items ?? 0,
      error: descData?.error ?? '',
      latency: descData?.latency ?? 0,
    });
  }
  if (typeof tpl === 'string') return tpl;
  return '';
}

export default function StatusPage() {
  const localeRaw = useLocale();
  const locale: 'id' | 'en' = localeRaw === 'en' ? 'en' : 'id';
  const t = COPY[locale];
  const dateLocale = locale === 'id' ? 'id-ID' : 'en-US';
  const RelativeTime = makeRelTime(t, dateLocale);

  const [data, setData] = useState<StatusSnapshot | null>(null);
  const [error, setError] = useState('');
  const [expandWorkers, setExpandWorkers] = useState(false);
  const [expandHealth, setExpandHealth] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    try {
      const res = await fetch('/api/public/status', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overall = data?.overall ?? 'operational';
  const overallTone = STATUS_TONE[overall];
  const OverallIcon = overallTone.icon;
  const overallLabel = data
    ? overall === 'operational'
      ? t.overall_operational
      : overall === 'degraded'
        ? t.overall_degraded
        : t.overall_outage
    : t.overall_loading;

  const hasWorkers = (data?.workers ?? []).length > 0;
  const hasHealthChecks = (data?.recentHealthChecks ?? []).length > 0;
  const totalRuns = data ? data.workers.reduce((s, w) => s + w.runCount, 0) : 0;
  const componentStats = data ? {
    total: data.components.length,
    operational: data.components.filter((c) => c.status === 'operational').length,
    degraded: data.components.filter((c) => c.status === 'degraded').length,
    outage: data.components.filter((c) => c.status === 'outage').length,
  } : { total: 0, operational: 0, degraded: 0, outage: 0 };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content" className="pb-16">
        {/* Header */}
        <section className="border-b border-border py-10 page-stamp-rule">
          <div className="layout-container">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="max-w-2xl">
                <p className="t-eyebrow mb-2 inline-flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5" strokeWidth={2.25} /> {t.eyebrow}
                </p>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-semibold tracking-tight mb-3">
                  {t.page_title}
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">{t.page_subtitle}</p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {data && (
                  <span className="text-xs text-muted-foreground">
                    {t.updated}: {new Date(data.timestamp).toLocaleTimeString(dateLocale)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={load}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-xs hover:bg-muted/40 disabled:opacity-50 transition-colors"
                  aria-label={t.refresh_now}
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} strokeWidth={2.25} />
                  <span>{refreshing ? `${t.refresh_now}…` : `${t.auto_refresh} ${t.auto_refresh_seconds}`}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Overall banner */}
        <section className="py-4">
          <div className="layout-container">
            {error ? (
              <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-5 py-3 text-sm text-destructive">
                {t.error_load}: {error}
              </div>
            ) : (
              <div className={cn('rounded-lg border px-5 py-4 flex items-center gap-3', overallTone.bg, overallTone.border)}>
                <OverallIcon className={cn('h-5 w-5 shrink-0', overallTone.text)} strokeWidth={2.25} />
                <div className="flex-1 min-w-0">
                  <span className={cn('text-sm sm:text-base font-semibold', overallTone.text)}>{overallLabel}</span>
                </div>
                {data && (
                  <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="text-[hsl(var(--profit))]">{componentStats.operational} OK</span>
                    {componentStats.degraded > 0 && (
                      <span className="text-amber-600 dark:text-amber-400">· {componentStats.degraded} degraded</span>
                    )}
                    {componentStats.outage > 0 && (
                      <span className="text-[hsl(var(--destructive))]">· {componentStats.outage} outage</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Components */}
        <section className="py-4">
          <div className="layout-container">
            <h2 className="text-sm font-medium text-foreground/80 mb-3">{t.components_section}</h2>
            <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
              {(data?.components ?? []).map((c) => {
                const tone = STATUS_TONE[c.status];
                const Icon = COMPONENT_ICONS[c.nameKey] || Server;
                const name = t.components[c.nameKey] ?? c.nameKey;
                const desc = renderComponentDesc(t, c.descCode, c.descData);
                return (
                  <div key={c.nameKey} className="flex items-start gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={2} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', tone.dot)} />
                          <span className="font-medium text-sm truncate">{name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{desc}</p>
                      </div>
                    </div>
                    <span className={cn('text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider shrink-0 px-2 py-0.5 rounded', tone.text, tone.bg)}>
                      {t.status_label[c.status]}
                    </span>
                  </div>
                );
              })}
              {!data && (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">{t.components_loading}</div>
              )}
            </div>
          </div>
        </section>

        {/* Workers */}
        <section className="py-4">
          <div className="layout-container">
            <button
              onClick={() => setExpandWorkers(!expandWorkers)}
              className="w-full rounded-lg border border-border px-5 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors text-left"
              aria-expanded={expandWorkers}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{t.workers_section}</span>
                {hasWorkers && (
                  <span className="text-xs text-muted-foreground">
                    {t.workers_meta(data!.workers.length, totalRuns)}
                  </span>
                )}
              </div>
              <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', expandWorkers && 'rotate-180')} strokeWidth={2.25} />
            </button>

            {expandWorkers && (
              <div className="mt-1 rounded-lg border border-border overflow-x-auto">
                {!hasWorkers ? (
                  <div className="px-5 py-4 text-sm text-muted-foreground text-center">{t.workers_empty}</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-[11px] uppercase text-muted-foreground bg-muted/40">
                      <tr>
                        <th className="text-left py-2 px-4 font-medium">{t.workers_th.name}</th>
                        <th className="text-left py-2 px-4 font-medium">{t.workers_th.last_run}</th>
                        <th className="text-left py-2 px-4 font-medium">{t.workers_th.status}</th>
                        <th className="text-right py-2 px-4 font-medium">{t.workers_th.count}</th>
                        <th className="text-right py-2 px-4 font-medium hidden sm:table-cell">{t.workers_th.cursor}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data!.workers.map((w) => {
                        const isOk = w.lastStatus === 'ok' || w.lastStatus === 'OK';
                        const isErr = w.lastStatus === 'ERROR' || w.lastStatus === 'error';
                        const statusLabel = w.lastStatus
                          ? t.worker_status_label[w.lastStatus] || w.lastStatus
                          : t.workers_not_run;
                        const workerName = t.components[w.scope] ?? w.scope;
                        return (
                          <tr key={w.scope} className="hover:bg-muted/30">
                            <td className="py-2 px-4 font-medium">{workerName}</td>
                            <td className="py-2 px-4 text-muted-foreground">
                              {w.lastRunAt ? <RelativeTime iso={w.lastRunAt} /> : <span className="text-muted-foreground/50">&mdash;</span>}
                            </td>
                            <td className="py-2 px-4">
                              <span className={cn(
                                'inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded',
                                isOk ? 'text-[hsl(var(--profit))] bg-[hsl(var(--profit))]/10' : isErr ? 'text-[hsl(var(--destructive))] bg-[hsl(var(--destructive))]/10' : 'text-muted-foreground bg-muted/40',
                              )}>
                                <span className={cn('h-1.5 w-1.5 rounded-full', isOk ? 'bg-[hsl(var(--profit))]' : isErr ? 'bg-[hsl(var(--destructive))]' : 'bg-muted-foreground/40')} />
                                {statusLabel}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-right tabular-nums text-muted-foreground">{w.runCount.toLocaleString(dateLocale)}</td>
                            <td className="py-2 px-4 text-right font-mono text-xs text-muted-foreground hidden sm:table-cell">{w.lastSeenId}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Health checks */}
        {(hasHealthChecks || data === null) && (
          <section className="py-4">
            <div className="layout-container">
              <button
                onClick={() => setExpandHealth(!expandHealth)}
                className="w-full rounded-lg border border-border px-5 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors text-left"
                aria-expanded={expandHealth}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{t.health_section}</span>
                  {hasHealthChecks && (
                    <span className="text-xs text-muted-foreground">
                      {t.health_meta(data!.recentHealthChecks.length)}
                    </span>
                  )}
                </div>
                <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', expandHealth && 'rotate-180')} strokeWidth={2.25} />
              </button>

              {expandHealth && (
                <div className="mt-1 rounded-lg border border-border overflow-x-auto">
                  {!hasHealthChecks ? (
                    <div className="px-5 py-4 text-sm text-muted-foreground text-center">{t.health_empty}</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="text-[11px] uppercase text-muted-foreground bg-muted/40">
                        <tr>
                          <th className="text-left py-2 px-4 font-medium">{t.health_th.instance}</th>
                          <th className="text-left py-2 px-4 font-medium">{t.health_th.time}</th>
                          <th className="text-right py-2 px-4 font-medium">{t.health_th.http}</th>
                          <th className="text-right py-2 px-4 font-medium">{t.health_th.latency}</th>
                          <th className="text-center py-2 px-4 font-medium">{t.health_th.db}</th>
                          <th className="text-center py-2 px-4 font-medium">{t.health_th.zmq}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {data!.recentHealthChecks.map((c, i) => (
                          <tr key={i} className="hover:bg-muted/30">
                            <td className="py-2 px-4 font-medium">{c.name}</td>
                            <td className="py-2 px-4 text-muted-foreground"><RelativeTime iso={c.checkedAt} /></td>
                            <td className={cn('py-2 px-4 text-right tabular-nums', c.httpStatus && c.httpStatus < 400 ? 'text-[hsl(var(--profit))]' : 'text-[hsl(var(--destructive))]')}>
                              {c.httpStatus ?? <span className="text-muted-foreground/50">&mdash;</span>}
                            </td>
                            <td className="py-2 px-4 text-right tabular-nums text-muted-foreground">
                              {c.responseTimeMs != null ? `${c.responseTimeMs}ms` : <span className="text-muted-foreground/50">&mdash;</span>}
                            </td>
                            <td className="py-2 px-4 text-center">
                              {c.dbOk === true ? (
                                <Check className="inline h-3.5 w-3.5 text-[hsl(var(--profit))]" strokeWidth={2.5} />
                              ) : c.dbOk === false ? (
                                <XIcon className="inline h-3.5 w-3.5 text-[hsl(var(--destructive))]" strokeWidth={2.5} />
                              ) : (
                                <span className="text-muted-foreground/50">&mdash;</span>
                              )}
                            </td>
                            <td className="py-2 px-4 text-center">
                              {c.zmqConnected === true ? (
                                <Check className="inline h-3.5 w-3.5 text-[hsl(var(--profit))]" strokeWidth={2.5} />
                              ) : c.zmqConnected === false ? (
                                <XIcon className="inline h-3.5 w-3.5 text-[hsl(var(--destructive))]" strokeWidth={2.5} />
                              ) : (
                                <span className="text-muted-foreground/50">&mdash;</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Deploy info footer */}
        {data?.deploy && (
          <section className="py-4">
            <div className="layout-container">
              <div className="rounded-lg border border-border bg-muted/20 px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">{t.deploy_section}:</span>
                <span>
                  {t.deploy_version}: <code className="font-mono text-foreground/70">{data.deploy.version}</code>
                </span>
                {data.deploy.commit && (
                  <span>
                    {t.deploy_commit}: <code className="font-mono text-foreground/70">{data.deploy.commit}</code>
                  </span>
                )}
                {data.deploy.buildTime && (
                  <span>
                    {t.deploy_build}: <code className="font-mono text-foreground/70">
                      {new Date(data.deploy.buildTime).toLocaleDateString(dateLocale, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </code>
                  </span>
                )}
              </div>
            </div>
          </section>
        )}

        <StatusStickyCta />
      </main>
      <EnterpriseFooter />
    </div>
  );
}

function StatusStickyCta() {
  const ts = useTranslations('shared');
  return (
    <StickyCtaBar
      message={ts('sticky_contact_text')}
      ctaLabel={ts('sticky_contact_cta')}
      href="/contact?subject=status-issue"
      tone="emerald"
    />
  );
}
