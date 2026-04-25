'use client';

import { useEffect, useState } from 'react';
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

const STATUS_META: Record<Component['status'], { label: string; dot: string; text: string; bg: string }> = {
  operational: { label: 'Beroperasi', dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  degraded: { label: 'Terdegradasi', dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-400/10' },
  outage: { label: 'Gangguan', dot: 'bg-rose-400', text: 'text-rose-400', bg: 'bg-rose-400/10' },
};

const OVERALL_BANNER: Record<string, { label: string; bg: string; border: string; text: string }> = {
  operational: { label: 'Semua Sistem Beroperasi', bg: 'bg-emerald-500/8', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  degraded: { label: 'Gangguan Sebagian', bg: 'bg-amber-500/8', border: 'border-amber-500/20', text: 'text-amber-400' },
  outage: { label: 'Gangguan Layanan Besar', bg: 'bg-rose-500/8', border: 'border-rose-500/20', text: 'text-rose-400' },
};

/**
 * Friendly display names for the internal worker scope keys. Keys are what
 * the workers persist into ConsumerState.scope / WorkerRun.worker; the
 * labels are what we render to the public. Keep in sync with the
 * WORKER_SCOPES list in /api/public/status/route.ts.
 */
const WORKER_LABELS: Record<string, string> = {
  signals: 'Sinyal Trading',
  trade_events: 'Event Trading',
  research_ingester: 'Pengimpor Riset',
  pair_brief: 'Brief Intelijen Pair',
};

const WORKER_STATUS_LABELS: Record<string, string> = {
  ok: 'Sukses',
  OK: 'Sukses',
  SKIPPED: 'Dilewati',
  NO_DATA: 'Tanpa Data',
  ERROR: 'Error',
  error: 'Error',
  RUNNING: 'Berjalan',
};

function RelativeTime({ iso }: { iso: string }) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return <span>baru saja</span>;
  if (mins < 60) return <span>{mins}m lalu</span>;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return <span>{hrs}j lalu</span>;
  return <span>{d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>;
}

export default function StatusPage() {
  const [data, setData] = useState<StatusSnapshot | null>(null);
  const [error, setError] = useState('');
  const [expandWorkers, setExpandWorkers] = useState(false);
  const [expandHealth, setExpandHealth] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/public/status', { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        setData(await res.json());
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    }
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  const overall = data?.overall ?? 'operational';
  const banner = OVERALL_BANNER[overall];
  const hasWorkers = (data?.workers ?? []).length > 0;
  const hasHealthChecks = (data?.recentHealthChecks ?? []).length > 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content" className="pb-16">
        {/* ── Header ── */}
        <section className="border-b border-border/60 py-10">
          <div className="container-default px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-foreground/50 mb-2">Status Sistem</p>
                <h1 className="text-2xl font-semibold tracking-tight">Kesehatan Platform</h1>
              </div>
              {data && (
                <span className="text-xs text-foreground/40">
                  Auto-refresh 30d &middot; Diperbarui {new Date(data.timestamp).toLocaleTimeString('id-ID')}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ── Overall Banner ── */}
        <section className="py-4">
          <div className="container-default px-6">
            {error ? (
              <div role="alert" className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-5 py-3 text-sm text-rose-300">
                Gagal memuat status: {error}
              </div>
            ) : (
              <div className={cn('rounded-lg border px-5 py-3 flex items-center gap-3', banner.bg, banner.border)}>
                <span className={cn('h-2.5 w-2.5 rounded-full', overall === 'operational' ? 'bg-emerald-400' : overall === 'degraded' ? 'bg-amber-400' : 'bg-rose-400')} />
                <span className={cn('text-sm font-medium', banner.text)}>
                  {data ? banner.label : 'Memuat\u2026'}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* ── Components ── */}
        <section className="py-4">
          <div className="container-default px-6">
            <div className="rounded-lg border border-border/60 overflow-hidden divide-y divide-white/6">
              {(data?.components ?? []).map((c) => {
                const meta = STATUS_META[c.status];
                return (
                  <div key={c.name} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn('h-2 w-2 rounded-full shrink-0', meta.dot)} />
                      <span className="font-medium text-sm truncate">{c.name}</span>
                      <span className="text-xs text-foreground/40 hidden sm:inline truncate">{c.description}</span>
                    </div>
                    <span className={cn('text-xs font-medium uppercase tracking-wide shrink-0 ml-4 px-2 py-0.5 rounded', meta.text, meta.bg)}>
                      {meta.label}
                    </span>
                  </div>
                );
              })}
              {!data && (
                <div className="px-5 py-8 text-center text-sm text-foreground/40">Memuat komponen\u2026</div>
              )}
            </div>
          </div>
        </section>

        {/* ── Worker Details (collapsible) ── */}
        <section className="py-4">
          <div className="container-default px-6">
            <button
              onClick={() => setExpandWorkers(!expandWorkers)}
              className="w-full rounded-lg border border-border/60 px-5 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Proses Otomatis</span>
                {hasWorkers && (
                  <span className="text-xs text-foreground/40">
                    {data!.workers.length} proses &middot; {data!.workers.reduce((s, w) => s + w.runCount, 0).toLocaleString()} total jalan
                  </span>
                )}
              </div>
              <svg className={cn('w-4 h-4 text-foreground/40 transition-transform', expandWorkers && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {expandWorkers && (
              <div className="mt-1 rounded-lg border border-border/60 overflow-hidden">
                {!hasWorkers ? (
                  <div className="px-5 py-4 text-sm text-foreground/40 text-center">Belum ada catatan proses.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-[11px] uppercase text-foreground/40 bg-muted/30">
                      <tr>
                        <th className="text-left py-2 px-4 font-medium">Proses</th>
                        <th className="text-left py-2 px-4 font-medium">Jalan Terakhir</th>
                        <th className="text-left py-2 px-4 font-medium">Status</th>
                        <th className="text-right py-2 px-4 font-medium">Jumlah</th>
                        <th className="text-right py-2 px-4 font-medium">Cursor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {data!.workers.map((w) => {
                        const isOk = w.lastStatus === 'ok' || w.lastStatus === 'OK';
                        const isErr = w.lastStatus === 'ERROR' || w.lastStatus === 'error';
                        const statusLabel = w.lastStatus ? (WORKER_STATUS_LABELS[w.lastStatus] ?? w.lastStatus) : 'Belum jalan';
                        return (
                          <tr key={w.scope} className="hover:bg-muted/30">
                            <td className="py-2 px-4 font-medium">{WORKER_LABELS[w.scope] ?? w.scope}</td>
                            <td className="py-2 px-4 text-foreground/60">
                              {w.lastRunAt ? <RelativeTime iso={w.lastRunAt} /> : <span className="text-foreground/30">&mdash;</span>}
                            </td>
                            <td className="py-2 px-4">
                              <span className={cn(
                                'inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded',
                                isOk ? 'text-emerald-400 bg-emerald-400/10' : isErr ? 'text-rose-400 bg-rose-400/10' : 'text-foreground/60 bg-muted/40'
                              )}>
                                <span className={cn('h-1.5 w-1.5 rounded-full', isOk ? 'bg-emerald-400' : isErr ? 'bg-rose-400' : 'bg-foreground/30')} />
                                {statusLabel}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-right tabular-nums text-foreground/60">{w.runCount.toLocaleString()}</td>
                            <td className="py-2 px-4 text-right font-mono text-xs text-foreground/40">{w.lastSeenId}</td>
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

        {/* ── Health Checks (collapsible, hidden if empty) ── */}
        {(hasHealthChecks || data === null) && (
          <section className="py-4">
            <div className="container-default px-6">
              <button
                onClick={() => setExpandHealth(!expandHealth)}
                className="w-full rounded-lg border border-border/60 px-5 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Pemeriksaan Kesehatan Terkini</span>
                  {hasHealthChecks && (
                    <span className="text-xs text-foreground/40">
                      {data!.recentHealthChecks.length} catatan
                    </span>
                  )}
                </div>
                <svg className={cn('w-4 h-4 text-foreground/40 transition-transform', expandHealth && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>

              {expandHealth && hasHealthChecks && (
                <div className="mt-1 rounded-lg border border-border/60 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-[11px] uppercase text-foreground/40 bg-muted/30">
                      <tr>
                        <th className="text-left py-2 px-4 font-medium">Instance</th>
                        <th className="text-left py-2 px-4 font-medium">Waktu</th>
                        <th className="text-right py-2 px-4 font-medium">HTTP</th>
                        <th className="text-right py-2 px-4 font-medium">Latensi</th>
                        <th className="text-center py-2 px-4 font-medium">DB</th>
                        <th className="text-center py-2 px-4 font-medium">ZMQ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {data!.recentHealthChecks.map((c, i) => (
                        <tr key={i} className="hover:bg-muted/30">
                          <td className="py-2 px-4 font-medium">{c.name}</td>
                          <td className="py-2 px-4 text-foreground/60"><RelativeTime iso={c.checkedAt} /></td>
                          <td className={cn('py-2 px-4 text-right tabular-nums', c.httpStatus && c.httpStatus < 400 ? 'text-emerald-400' : 'text-rose-400')}>
                            {c.httpStatus ?? <span className="text-foreground/30">&mdash;</span>}
                          </td>
                          <td className="py-2 px-4 text-right tabular-nums text-foreground/60">
                            {c.responseTimeMs != null ? `${c.responseTimeMs}ms` : <span className="text-foreground/30">&mdash;</span>}
                          </td>
                          <td className="py-2 px-4 text-center">
                            {c.dbOk === true ? <span className="text-emerald-400">&#10003;</span> : c.dbOk === false ? <span className="text-rose-400">&#10007;</span> : <span className="text-foreground/30">&mdash;</span>}
                          </td>
                          <td className="py-2 px-4 text-center">
                            {c.zmqConnected === true ? <span className="text-emerald-400">&#10003;</span> : c.zmqConnected === false ? <span className="text-rose-400">&#10007;</span> : <span className="text-foreground/30">&mdash;</span>}
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
