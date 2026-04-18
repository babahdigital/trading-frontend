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

const STATUS_COPY: Record<Component['status'], { label: string; dot: string; ring: string; text: string }> = {
  operational: { label: 'Operational', dot: 'bg-emerald-400', ring: 'ring-emerald-400/30', text: 'text-emerald-400' },
  degraded: { label: 'Degraded', dot: 'bg-amber-400', ring: 'ring-amber-400/30', text: 'text-amber-400' },
  outage: { label: 'Outage', dot: 'bg-rose-400', ring: 'ring-rose-400/30', text: 'text-rose-400' },
};

export default function StatusPage() {
  const [data, setData] = useState<StatusSnapshot | null>(null);
  const [error, setError] = useState('');

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

  const overall = data?.overall;
  const overallCopy = overall ? STATUS_COPY[overall] : STATUS_COPY.operational;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-4">System status</p>
            <h1 className="t-display-page mb-6">Platform Status</h1>
            <div className="flex items-center gap-3">
              <span className={cn('h-3 w-3 rounded-full', overallCopy.dot, 'ring-4', overallCopy.ring)} aria-hidden />
              <span className={cn('text-sm font-medium', overallCopy.text)}>
                {data ? (overall === 'operational' ? 'All systems operational' : overall === 'degraded' ? 'Some systems degraded' : 'Major outage') : 'Loading…'}
              </span>
              {data && (
                <span className="text-xs text-foreground/50 ml-2">
                  Updated {new Date(data.timestamp).toLocaleTimeString('id-ID')}
                </span>
              )}
            </div>
          </div>
        </section>

        {error && (
          <section className="section-padding">
            <div className="container-default px-6">
              <div role="alert" className="rounded-md bg-rose-500/10 border border-rose-500/30 p-4 text-sm text-rose-300">
                Unable to load status: {error}
              </div>
            </div>
          </section>
        )}

        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <h2 className="t-display-section mb-6">Components</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {(data?.components ?? []).map((c) => {
                const copy = STATUS_COPY[c.status];
                return (
                  <div key={c.name} className="card-enterprise flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-foreground/60 mt-1">{c.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2.5 w-2.5 rounded-full', copy.dot)} aria-hidden />
                      <span className={cn('text-xs font-medium uppercase tracking-wide', copy.text)}>{copy.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <h2 className="t-display-section mb-6">Autonomous Workers</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-foreground/50 border-b border-white/10">
                  <tr>
                    <th className="text-left py-2 px-2">Worker</th>
                    <th className="text-left py-2 px-2">Last run</th>
                    <th className="text-left py-2 px-2">Status</th>
                    <th className="text-right py-2 px-2">Runs</th>
                    <th className="text-right py-2 px-2">Last ID</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.workers ?? []).length === 0 && (
                    <tr><td colSpan={5} className="py-6 text-center text-foreground/50">No worker runs yet.</td></tr>
                  )}
                  {(data?.workers ?? []).map((w) => (
                    <tr key={w.scope} className="border-b border-white/5">
                      <td className="py-2 px-2 font-medium">{w.scope}</td>
                      <td className="py-2 px-2 text-foreground/70">
                        {w.lastRunAt ? new Date(w.lastRunAt).toLocaleString('id-ID') : '—'}
                      </td>
                      <td className={cn('py-2 px-2', w.lastStatus === 'ok' ? 'text-emerald-400' : w.lastStatus === 'error' ? 'text-rose-400' : 'text-foreground/70')}>
                        {w.lastStatus ?? '—'}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums">{w.runCount}</td>
                      <td className="py-2 px-2 text-right font-mono text-xs text-foreground/60">{w.lastSeenId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="section-padding">
          <div className="container-default px-6">
            <h2 className="t-display-section mb-6">Recent Health Checks</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-foreground/50 border-b border-white/10">
                  <tr>
                    <th className="text-left py-2 px-2">VPS</th>
                    <th className="text-left py-2 px-2">Time</th>
                    <th className="text-right py-2 px-2">HTTP</th>
                    <th className="text-right py-2 px-2">Latency</th>
                    <th className="text-center py-2 px-2">DB</th>
                    <th className="text-center py-2 px-2">ZMQ</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recentHealthChecks ?? []).length === 0 && (
                    <tr><td colSpan={6} className="py-6 text-center text-foreground/50">No health check records.</td></tr>
                  )}
                  {(data?.recentHealthChecks ?? []).map((c, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="py-2 px-2">{c.name}</td>
                      <td className="py-2 px-2 text-foreground/70">{new Date(c.checkedAt).toLocaleString('id-ID')}</td>
                      <td className={cn('py-2 px-2 text-right', c.httpStatus && c.httpStatus < 400 ? 'text-emerald-400' : 'text-rose-400')}>{c.httpStatus ?? '—'}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{c.responseTimeMs ? `${c.responseTimeMs}ms` : '—'}</td>
                      <td className="py-2 px-2 text-center">{c.dbOk === true ? '✓' : c.dbOk === false ? '✗' : '—'}</td>
                      <td className="py-2 px-2 text-center">{c.zmqConnected === true ? '✓' : c.zmqConnected === false ? '✗' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
