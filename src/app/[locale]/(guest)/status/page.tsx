'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { ChevronDown, Activity, Check, X as XIcon } from 'lucide-react';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { cn } from '@/lib/utils';

interface Component {
  name: string;
  status: 'operational' | 'degraded' | 'outage';
  description: string;
}

interface StatusSnapshot {
  overall: 'operational' | 'degraded' | 'outage';
  components: Component[];
  workers: Array<{ scope: string; lastRunAt: string | null; lastStatus: string | null; runCount: number; lastSeenId: string; lastError: string | null }>;
  recentHealthChecks: Array<{ name: string; checkedAt: string; httpStatus: number | null; responseTimeMs: number | null; dbOk: boolean | null; zmqConnected: boolean | null }>;
  timestamp: string;
}

const COPY = {
  id: {
    eyebrow: 'Status Sistem',
    page_title: 'Kesehatan Platform',
    auto_refresh: 'Auto-refresh 30d',
    updated: 'Diperbarui',
    overall_operational: 'Semua Sistem Beroperasi',
    overall_degraded: 'Gangguan Sebagian',
    overall_outage: 'Gangguan Layanan Besar',
    overall_loading: 'Memuat…',
    error_load: 'Gagal memuat status',
    components_loading: 'Memuat komponen…',
    workers_section: 'Proses Otomatis',
    workers_meta: (n: number, total: number) => `${n} proses · ${total.toLocaleString('id-ID')} total jalan`,
    workers_empty: 'Belum ada catatan proses.',
    workers_th: { name: 'Proses', last_run: 'Jalan Terakhir', status: 'Status', count: 'Jumlah', cursor: 'Cursor' },
    workers_not_run: 'Belum jalan',
    health_section: 'Pemeriksaan Kesehatan Terkini',
    health_meta: (n: number) => `${n} catatan`,
    health_th: { instance: 'Instance', time: 'Waktu', http: 'HTTP', latency: 'Latensi', db: 'DB', zmq: 'ZMQ' },
    rel_just_now: 'baru saja',
    rel_minutes: (m: number) => `${m}m lalu`,
    rel_hours: (h: number) => `${h}j lalu`,
    status_label: { operational: 'Beroperasi', degraded: 'Terdegradasi', outage: 'Gangguan' },
    worker_status_label: { ok: 'Sukses', SKIPPED: 'Dilewati', NO_DATA: 'Tanpa Data', ERROR: 'Error', RUNNING: 'Berjalan' } as Record<string, string>,
  },
  en: {
    eyebrow: 'System Status',
    page_title: 'Platform Health',
    auto_refresh: 'Auto-refresh 30s',
    updated: 'Updated',
    overall_operational: 'All Systems Operational',
    overall_degraded: 'Partial Outage',
    overall_outage: 'Major Service Disruption',
    overall_loading: 'Loading…',
    error_load: 'Failed to load status',
    components_loading: 'Loading components…',
    workers_section: 'Background Workers',
    workers_meta: (n: number, total: number) => `${n} workers · ${total.toLocaleString('en-US')} total runs`,
    workers_empty: 'No worker runs yet.',
    workers_th: { name: 'Worker', last_run: 'Last Run', status: 'Status', count: 'Runs', cursor: 'Cursor' },
    workers_not_run: 'Not run yet',
    health_section: 'Recent Health Checks',
    health_meta: (n: number) => `${n} entries`,
    health_th: { instance: 'Instance', time: 'Time', http: 'HTTP', latency: 'Latency', db: 'DB', zmq: 'ZMQ' },
    rel_just_now: 'just now',
    rel_minutes: (m: number) => `${m}m ago`,
    rel_hours: (h: number) => `${h}h ago`,
    status_label: { operational: 'Operational', degraded: 'Degraded', outage: 'Outage' },
    worker_status_label: { ok: 'Success', SKIPPED: 'Skipped', NO_DATA: 'No Data', ERROR: 'Error', RUNNING: 'Running' } as Record<string, string>,
  },
};

const WORKER_LABELS_ID: Record<string, string> = {
  signals: 'Sinyal Trading',
  trade_events: 'Event Trading',
  research_ingester: 'Pengimpor Riset',
  pair_brief: 'Brief Intelijen Pair',
};
const WORKER_LABELS_EN: Record<string, string> = {
  signals: 'Trading Signals',
  trade_events: 'Trade Events',
  research_ingester: 'Research Ingester',
  pair_brief: 'Pair Intel Briefs',
};

const STATUS_TONE: Record<Component['status'], { dot: string; text: string; bg: string }> = {
  operational: { dot: 'bg-[hsl(var(--profit))]', text: 'text-[hsl(var(--profit))]', bg: 'bg-[hsl(var(--profit))]/10' },
  degraded: { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
  outage: { dot: 'bg-[hsl(var(--destructive))]', text: 'text-[hsl(var(--destructive))]', bg: 'bg-[hsl(var(--destructive))]/10' },
};

const OVERALL_TONE: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  operational: { bg: 'bg-[hsl(var(--profit))]/[0.06]', border: 'border-[hsl(var(--profit))]/30', text: 'text-[hsl(var(--profit))]', dot: 'bg-[hsl(var(--profit))]' },
  degraded: { bg: 'bg-amber-500/[0.08]', border: 'border-amber-500/30', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  outage: { bg: 'bg-[hsl(var(--destructive))]/[0.08]', border: 'border-[hsl(var(--destructive))]/30', text: 'text-[hsl(var(--destructive))]', dot: 'bg-[hsl(var(--destructive))]' },
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

export default function StatusPage() {
  const localeRaw = useLocale();
  const locale: 'id' | 'en' = localeRaw === 'en' ? 'en' : 'id';
  const t = COPY[locale];
  const dateLocale = locale === 'id' ? 'id-ID' : 'en-US';
  const RelativeTime = makeRelTime(t, dateLocale);
  const workerLabels = locale === 'id' ? WORKER_LABELS_ID : WORKER_LABELS_EN;

  const [data, setData] = useState<StatusSnapshot | null>(null);
  const [error, setError] = useState('');
  const [expandWorkers, setExpandWorkers] = useState(false);
  const [expandHealth, setExpandHealth] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/public/status', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setData(await res.json());
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    }
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const overall = data?.overall ?? 'operational';
  const overallTone = OVERALL_TONE[overall];
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content" className="pb-16">
        {/* Header */}
        <section className="border-b border-border py-10 page-stamp-rule">
          <div className="container-default px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="t-eyebrow mb-2 inline-flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5" strokeWidth={2.25} /> {t.eyebrow}
                </p>
                <h1 className="text-2xl sm:text-3xl font-display font-semibold tracking-tight">{t.page_title}</h1>
              </div>
              {data && (
                <span className="text-xs text-muted-foreground">
                  {t.auto_refresh} · {t.updated} {new Date(data.timestamp).toLocaleTimeString(dateLocale)}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Overall banner */}
        <section className="py-4">
          <div className="container-default px-4 sm:px-6">
            {error ? (
              <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-5 py-3 text-sm text-destructive">
                {t.error_load}: {error}
              </div>
            ) : (
              <div className={cn('rounded-lg border px-5 py-3 flex items-center gap-3', overallTone.bg, overallTone.border)}>
                <span className={cn('h-2.5 w-2.5 rounded-full', overallTone.dot)} />
                <span className={cn('text-sm font-semibold', overallTone.text)}>{overallLabel}</span>
              </div>
            )}
          </div>
        </section>

        {/* Components */}
        <section className="py-4">
          <div className="container-default px-4 sm:px-6">
            <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
              {(data?.components ?? []).map((c) => {
                const tone = STATUS_TONE[c.status];
                return (
                  <div key={c.name} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn('h-2 w-2 rounded-full shrink-0', tone.dot)} />
                      <span className="font-medium text-sm truncate">{c.name}</span>
                      <span className="text-xs text-muted-foreground hidden sm:inline truncate">{c.description}</span>
                    </div>
                    <span className={cn('text-[11px] font-semibold uppercase tracking-wider shrink-0 px-2 py-0.5 rounded', tone.text, tone.bg)}>
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
          <div className="container-default px-4 sm:px-6">
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
              <div className="mt-1 rounded-lg border border-border overflow-hidden">
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
                        <th className="text-right py-2 px-4 font-medium">{t.workers_th.cursor}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data!.workers.map((w) => {
                        const isOk = w.lastStatus === 'ok' || w.lastStatus === 'OK';
                        const isErr = w.lastStatus === 'ERROR' || w.lastStatus === 'error';
                        const statusLabel = w.lastStatus
                          ? t.worker_status_label[w.lastStatus] || w.lastStatus
                          : t.workers_not_run;
                        return (
                          <tr key={w.scope} className="hover:bg-muted/30">
                            <td className="py-2 px-4 font-medium">{workerLabels[w.scope] ?? w.scope}</td>
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
                            <td className="py-2 px-4 text-right font-mono text-xs text-muted-foreground">{w.lastSeenId}</td>
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
            <div className="container-default px-4 sm:px-6">
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

              {expandHealth && hasHealthChecks && (
                <div className="mt-1 rounded-lg border border-border overflow-x-auto">
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
                </div>
              )}
            </div>
          </section>
        )}
      </main>
      <EnterpriseFooter />
    </div>
  );
}
