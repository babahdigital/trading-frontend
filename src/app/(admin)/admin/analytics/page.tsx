'use client';

/**
 * Admin analytics dashboard — PMF funnel + Web Vitals + top pages.
 *
 * 2026-05-20 — Phase A polish. Surface AnalyticsEvent data dari
 * /api/admin/analytics/summary. Lightweight UI, refresh on demand,
 * window selector 7/30/90 hari.
 */
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth/auth-context';

interface AnalyticsSummary {
  windowDays: number;
  uniqueSessions: number;
  pageviews: number;
  funnel: {
    registerStarts: number;
    registerSteps: number;
    registerCompletes: number;
    checkoutStarts: number;
    checkoutSuccess: number;
    conversionRate: number;
  };
  topPages: Array<{ path: string; count: number }>;
  topCountries: Array<{ country: string; count: number }>;
  webVitals: {
    lcp_p75_ms: number | null;
    fcp_p75_ms: number | null;
    cls_p75_score: number | null;
  };
}

export default function AdminAnalyticsPage() {
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [window, setWindow] = useState(7);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics/summary?days=${window}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json()) as AnalyticsSummary;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [window, getAuthHeaders]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Analytics & PMF</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Funnel acquisition + Web Vitals + top pages. Self-hosted, privacy-first
            (IP hashed, no third-party).
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setWindow(d)}
              className={`px-3 py-1.5 text-xs font-mono rounded-md border ${
                window === d
                  ? 'bg-amber-500 text-black border-amber-500'
                  : 'border-border/60 text-muted-foreground hover:border-amber-400/50'
              }`}
            >
              {d}D
            </button>
          ))}
          <button
            type="button"
            onClick={() => void load()}
            className="px-3 py-1.5 text-xs font-mono rounded-md border border-border/60 hover:border-amber-400/50"
          >
            Refresh
          </button>
        </div>
      </header>

      {loading && <div className="text-sm text-muted-foreground">Memuat…</div>}
      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          Error: {error}
        </div>
      )}

      {data && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Unique Sessions" value={data.uniqueSessions.toLocaleString()} />
            <KpiCard label="Pageviews" value={data.pageviews.toLocaleString()} />
            <KpiCard label="Register Complete" value={data.funnel.registerCompletes.toString()} />
            <KpiCard
              label="Conversion Rate"
              value={`${data.funnel.conversionRate.toFixed(2)}%`}
              sub="Register / Pageview"
            />
          </div>

          {/* Funnel */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Acquisition Funnel</h2>
            <div className="space-y-2 rounded-lg border border-border/60 bg-card p-4">
              <FunnelRow label="Pageview" count={data.pageviews} base={data.pageviews} />
              <FunnelRow label="Register Start" count={data.funnel.registerStarts} base={data.pageviews} />
              <FunnelRow label="Register Step (form interaction)" count={data.funnel.registerSteps} base={data.pageviews} />
              <FunnelRow label="Register Complete" count={data.funnel.registerCompletes} base={data.pageviews} />
              <FunnelRow label="Checkout Start" count={data.funnel.checkoutStarts} base={data.pageviews} />
              <FunnelRow label="Checkout Success" count={data.funnel.checkoutSuccess} base={data.pageviews} />
            </div>
          </section>

          {/* Web Vitals */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Core Web Vitals (p75)</h2>
            <div className="grid grid-cols-3 gap-4">
              <VitalCard
                label="LCP"
                value={data.webVitals.lcp_p75_ms != null ? `${data.webVitals.lcp_p75_ms}ms` : '—'}
                threshold={data.webVitals.lcp_p75_ms != null ? (data.webVitals.lcp_p75_ms <= 2500 ? 'good' : data.webVitals.lcp_p75_ms <= 4000 ? 'needs_improvement' : 'poor') : 'unknown'}
                desc="Largest Contentful Paint"
              />
              <VitalCard
                label="FCP"
                value={data.webVitals.fcp_p75_ms != null ? `${data.webVitals.fcp_p75_ms}ms` : '—'}
                threshold={data.webVitals.fcp_p75_ms != null ? (data.webVitals.fcp_p75_ms <= 1800 ? 'good' : data.webVitals.fcp_p75_ms <= 3000 ? 'needs_improvement' : 'poor') : 'unknown'}
                desc="First Contentful Paint"
              />
              <VitalCard
                label="CLS"
                value={data.webVitals.cls_p75_score != null ? data.webVitals.cls_p75_score.toFixed(3) : '—'}
                threshold={data.webVitals.cls_p75_score != null ? (data.webVitals.cls_p75_score <= 0.1 ? 'good' : data.webVitals.cls_p75_score <= 0.25 ? 'needs_improvement' : 'poor') : 'unknown'}
                desc="Cumulative Layout Shift"
              />
            </div>
          </section>

          {/* Top pages + countries */}
          <div className="grid lg:grid-cols-2 gap-6">
            <section>
              <h2 className="text-lg font-semibold mb-3">Top Pages</h2>
              <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
                {data.topPages.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">Belum ada data.</div>
                ) : (
                  data.topPages.map((p) => (
                    <div key={p.path} className="flex items-center justify-between px-4 py-2 border-b border-border/40 last:border-0">
                      <span className="text-sm font-mono text-foreground/80 truncate">{p.path}</span>
                      <span className="text-xs font-mono text-amber-400">{p.count.toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">Top Countries</h2>
              <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
                {data.topCountries.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">Belum ada data.</div>
                ) : (
                  data.topCountries.map((c) => (
                    <div key={c.country} className="flex items-center justify-between px-4 py-2 border-b border-border/40 last:border-0">
                      <span className="text-sm font-mono text-foreground/80">{c.country}</span>
                      <span className="text-xs font-mono text-amber-400">{c.count.toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="text-2xl font-mono font-semibold text-amber-400">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function FunnelRow({ label, count, base }: { label: string; count: number; base: number }) {
  const pct = base > 0 ? (count / base) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-foreground/80 w-56 shrink-0">{label}</span>
      <div className="flex-1 h-6 rounded bg-muted/30 relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-amber-500/40"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-end pr-2 text-xs font-mono text-foreground">
          {count.toLocaleString()} ({pct.toFixed(1)}%)
        </div>
      </div>
    </div>
  );
}

function VitalCard({
  label,
  value,
  threshold,
  desc,
}: {
  label: string;
  value: string;
  threshold: 'good' | 'needs_improvement' | 'poor' | 'unknown';
  desc: string;
}) {
  const colorClass = {
    good: 'text-emerald-400 border-emerald-500/30',
    needs_improvement: 'text-amber-400 border-amber-500/30',
    poor: 'text-red-400 border-red-500/30',
    unknown: 'text-muted-foreground border-border/60',
  }[threshold];

  return (
    <div className={`rounded-lg border bg-card p-4 ${colorClass.split(' ').filter((c) => c.startsWith('border')).join(' ')}`}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className={`text-2xl font-mono font-semibold ${colorClass.split(' ').filter((c) => c.startsWith('text')).join(' ')}`}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground mt-1">{desc}</div>
    </div>
  );
}
