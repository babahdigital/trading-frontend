'use client';

/**
 * Admin analytics dashboard — PMF funnel + Web Vitals + top pages.
 *
 * Refactor 2026-05-21 (modernization sesi): pakai PageHeader/StatCard/
 * EmptyState primitives + tone class adaptive light/dark. Web Vitals p75
 * threshold tone via inline map (jaga purpose colorClass.split filter).
 */
import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';
import { StatCard, StatCardGrid } from '@/components/admin/stat-card';
import { EmptyState } from '@/components/admin/empty-state';
import { Icon } from '@/components/ui/icon';
import { Activity, MousePointerClick, UserPlus, TrendingUp, RefreshCw, BarChart3, Globe } from 'lucide-react';

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
    inp_p75_ms?: number | null;
    ttfb_p75_ms?: number | null;
  };
}

type VitalThreshold = 'good' | 'needs_improvement' | 'poor' | 'unknown';

const VITAL_TONE_CLASS: Record<VitalThreshold, { text: string; border: string; label: string }> = {
  good:              { text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30 bg-emerald-500/[0.03]', label: 'Baik' },
  needs_improvement: { text: 'text-amber-600 dark:text-amber-400',     border: 'border-amber-500/30 bg-amber-500/[0.03]',     label: 'Perlu Perbaikan' },
  poor:              { text: 'text-rose-600 dark:text-rose-400',        border: 'border-rose-500/30 bg-rose-500/[0.03]',       label: 'Buruk' },
  unknown:           { text: 'text-muted-foreground',                   border: 'border-border/60',                            label: 'Tidak ada data' },
};

export default function AdminAnalyticsPage() {
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [windowDays, setWindowDays] = useState(7);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics/summary?days=${windowDays}`, {
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
  }, [windowDays, getAuthHeaders]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="admin-page-stack">
      <PageHeader
        eyebrow="Analytics · Privacy-First"
        title="Analytics & PMF"
        description="Funnel acquisition + Core Web Vitals + top pages. Self-hosted, IP di-hash, no third-party tracker."
        actions={
          <div className="flex items-center gap-1.5">
            <div role="tablist" aria-label="Window periode" className="inline-flex rounded-md border border-border bg-card p-0.5">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  role="tab"
                  aria-selected={windowDays === d}
                  type="button"
                  onClick={() => setWindowDays(d)}
                  className={cn(
                    'px-2.5 py-1 text-xs font-mono rounded transition-colors',
                    windowDays === d
                      ? 'bg-amber-500 text-amber-50 dark:bg-amber-500 dark:text-zinc-900'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {d}D
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => void load()} aria-label="Muat ulang">
              <Icon icon={RefreshCw} size="sm" className="mr-1.5" />
              Refresh
            </Button>
          </div>
        }
      />

      {error && (
        <div role="alert" className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">
          Error: {error}
        </div>
      )}

      {/* KPI cards */}
      <StatCardGrid columns={4}>
        <StatCard
          label="Unique Sessions"
          value={data ? data.uniqueSessions.toLocaleString() : '-'}
          icon={Activity}
          iconTone="info"
          loading={loading}
        />
        <StatCard
          label="Pageviews"
          value={data ? data.pageviews.toLocaleString() : '-'}
          icon={MousePointerClick}
          iconTone="accent"
          loading={loading}
        />
        <StatCard
          label="Register Complete"
          value={data ? data.funnel.registerCompletes.toLocaleString() : '-'}
          icon={UserPlus}
          iconTone="success"
          loading={loading}
        />
        <StatCard
          label="Conversion Rate"
          value={data ? `${data.funnel.conversionRate.toFixed(2)}%` : '-'}
          sub="Register / Pageview"
          icon={TrendingUp}
          iconTone={data && data.funnel.conversionRate >= 5 ? 'success' : 'warning'}
          loading={loading}
        />
      </StatCardGrid>

      {/* Funnel */}
      {data && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Acquisition Funnel</h2>
          <Card>
            <CardContent className="p-4 space-y-2">
              <FunnelRow label="Pageview" count={data.pageviews} base={data.pageviews} />
              <FunnelRow label="Register Start" count={data.funnel.registerStarts} base={data.pageviews} />
              <FunnelRow label="Register Step (form interaction)" count={data.funnel.registerSteps} base={data.pageviews} />
              <FunnelRow label="Register Complete" count={data.funnel.registerCompletes} base={data.pageviews} />
              <FunnelRow label="Checkout Start" count={data.funnel.checkoutStarts} base={data.pageviews} />
              <FunnelRow label="Checkout Success" count={data.funnel.checkoutSuccess} base={data.pageviews} />
            </CardContent>
          </Card>
        </section>
      )}

      {/* Web Vitals */}
      {data && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Core Web Vitals (p75)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            <VitalCard
              label="LCP"
              value={data.webVitals.lcp_p75_ms != null ? `${data.webVitals.lcp_p75_ms}ms` : '—'}
              threshold={threshold(data.webVitals.lcp_p75_ms, 2500, 4000)}
              desc="Largest Contentful Paint"
            />
            <VitalCard
              label="FCP"
              value={data.webVitals.fcp_p75_ms != null ? `${data.webVitals.fcp_p75_ms}ms` : '—'}
              threshold={threshold(data.webVitals.fcp_p75_ms, 1800, 3000)}
              desc="First Contentful Paint"
            />
            <VitalCard
              label="CLS"
              value={data.webVitals.cls_p75_score != null ? data.webVitals.cls_p75_score.toFixed(3) : '—'}
              threshold={threshold(data.webVitals.cls_p75_score, 0.1, 0.25)}
              desc="Cumulative Layout Shift"
            />
            <VitalCard
              label="INP"
              value={data.webVitals.inp_p75_ms != null ? `${data.webVitals.inp_p75_ms}ms` : '—'}
              threshold={threshold(data.webVitals.inp_p75_ms ?? null, 200, 500)}
              desc="Interaction to Next Paint"
            />
            <VitalCard
              label="TTFB"
              value={data.webVitals.ttfb_p75_ms != null ? `${data.webVitals.ttfb_p75_ms}ms` : '—'}
              threshold={threshold(data.webVitals.ttfb_p75_ms ?? null, 800, 1800)}
              desc="Time to First Byte"
            />
          </div>
        </section>
      )}

      {/* Top pages + countries */}
      {data && (
        <div className="grid lg:grid-cols-2 gap-6">
          <section>
            <h2 className="text-lg font-semibold mb-3">Top Pages</h2>
            <Card>
              <CardContent className="p-0">
                {data.topPages.length === 0 ? (
                  <div className="p-4">
                    <EmptyState variant="inline" icon={BarChart3} title="Belum ada data pageview" size="sm" />
                  </div>
                ) : (
                  <ul>
                    {data.topPages.map((p) => (
                      <li key={p.path} className="flex items-center justify-between px-4 py-2 border-b border-border/40 last:border-0">
                        <span className="text-sm font-mono text-foreground/80 truncate">{p.path}</span>
                        <span className="text-xs font-mono font-medium text-amber-600 dark:text-amber-400 tabular-nums">{p.count.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Top Countries</h2>
            <Card>
              <CardContent className="p-0">
                {data.topCountries.length === 0 ? (
                  <div className="p-4">
                    <EmptyState variant="inline" icon={Globe} title="Belum ada data lokasi" size="sm" />
                  </div>
                ) : (
                  <ul>
                    {data.topCountries.map((c) => (
                      <li key={c.country} className="flex items-center justify-between px-4 py-2 border-b border-border/40 last:border-0">
                        <span className="text-sm font-mono text-foreground/80">{c.country}</span>
                        <span className="text-xs font-mono font-medium text-amber-600 dark:text-amber-400 tabular-nums">{c.count.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      )}
    </div>
  );
}

function threshold(value: number | null | undefined, goodMax: number, poorMin: number): VitalThreshold {
  if (value == null) return 'unknown';
  if (value <= goodMax) return 'good';
  if (value <= poorMin) return 'needs_improvement';
  return 'poor';
}

function FunnelRow({ label, count, base }: { label: string; count: number; base: number }) {
  const pct = base > 0 ? (count / base) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-foreground/80 w-full sm:w-56 shrink-0">{label}</span>
      <div className="flex-1 h-6 rounded bg-muted/40 relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-amber-500/40"
          style={{ width: `${Math.min(pct, 100)}%` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 flex items-center justify-end pr-2 text-xs font-mono text-foreground tabular-nums">
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
  threshold: VitalThreshold;
  desc: string;
}) {
  const tone = VITAL_TONE_CLASS[threshold];

  return (
    <div className={cn('rounded-lg border bg-card p-4', tone.border)}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
        <span className={cn('text-[9px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded', tone.text)}>
          {tone.label}
        </span>
      </div>
      <div className={cn('text-2xl font-mono font-semibold tabular-nums', tone.text)}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground mt-1">{desc}</div>
    </div>
  );
}
