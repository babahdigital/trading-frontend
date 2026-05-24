'use client';

/**
 * Crypto Performance page — equity curve + KPI snapshot dari backend crypto.
 *
 * Phase A (deployed first):
 *   - Equity curve dari /api/crypto/trading/equity (existing endpoint,
 *     time-series 5-min snapshots, 288 points default = 24h)
 *   - Snapshot KPI: equity, 24h PnL, open positions, total margin
 *
 * Phase B (saat backend crypto deploy /api/tenants/{id}/analytics/{pnl,performance}):
 *   - Daily PnL bar chart
 *   - Win rate trend per day
 *   - Profit factor history
 *
 * Data shape mismatch — backend crypto pakai `series[]` dengan
 * `recorded_at` + `total_equity_usdt` (string). EquityCurve component
 * pakai `{time, value}[]`. Adapter di-inline supaya self-contained.
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Activity, TrendingUp, TrendingDown, Wallet, Layers } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/admin/page-header';
import { StatCard, StatCardGrid } from '@/components/admin/stat-card';
import { Card, CardContent } from '@/components/ui/card';
import { EquityCurve } from '@/components/charts/equity-curve';
import { formatCurrency } from '@/lib/format-locale';
import type { Locale } from '@/lib/format-locale';

interface EquitySeriesPoint {
  recorded_at: string;
  total_equity_usdt: string | number;
  available_balance?: string | number;
  total_margin?: string | number;
  unrealized_pnl?: string | number;
  open_positions_count?: number;
}

interface EquityResponse {
  source?: 'mock' | 'backend';
  series?: EquitySeriesPoint[];
}

interface AnalyticsPnlPoint {
  date: string;
  pnl_usdt: number;
  trades_count: number;
  win_rate?: number;
}

interface AnalyticsResponse {
  source?: 'mock' | 'backend';
  available?: boolean;
  daily?: AnalyticsPnlPoint[];
  summary?: {
    total_pnl_usdt?: number;
    win_rate?: number;
    profit_factor?: number;
    sharpe?: number;
    max_drawdown_pct?: number;
  };
}

const PERIOD_LIMIT: Record<string, number> = {
  '1D': 288,        // 5-min * 12 = 1h, 12 * 24 = 288 points
  '7D': 288 * 7,
  '30D': 288 * 30,
  '90D': 288 * 90,
};

function toNumber(v: string | number | undefined): number {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

export default function CryptoPerformancePage() {
  const t = useTranslations('portal.crypto.performance');
  const tShared = useTranslations('portal.shared');
  const locale = useLocale() as Locale;
  const { getAuthHeaders } = useAuth();

  const [equity, setEquity] = useState<EquityResponse | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<'1D' | '7D' | '30D' | '90D'>('30D');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const limit = PERIOD_LIMIT[period] ?? 288;
      // Phase A — equity history (existing endpoint)
      const [equityRes, analyticsRes] = await Promise.all([
        fetch(`/api/crypto/trading/equity?limit=${limit}`, { headers: getAuthHeaders() }),
        // Phase B — analytics (backend deployed item #6 dari Pak Abdullah list)
        fetch(`/api/crypto/trading/analytics?period=${period}`, { headers: getAuthHeaders() }),
      ]);

      if (equityRes.ok) {
        setEquity(await equityRes.json());
      } else {
        throw new Error(`equity HTTP ${equityRes.status}`);
      }
      // Analytics endpoint optional — Phase B gracefully degrades
      if (analyticsRes.ok) {
        setAnalytics(await analyticsRes.json());
      } else {
        setAnalytics({ available: false });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : tShared('connection_error'));
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, period, tShared]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchData(); }, [fetchData]);

  // Adapter — transform crypto series[] → EquityCurve expected shape
  const equityPoints = useMemo(() => {
    if (!equity?.series) return [];
    return equity.series.map((s) => ({
      // EquityCurve accepts 'YYYY-MM-DD' OR full ISO timestamp — full ISO preserves intraday granularity
      time: s.recorded_at.slice(0, 10),
      value: toNumber(s.total_equity_usdt),
    }));
  }, [equity]);

  // Latest snapshot for KPI cards
  const latestSnap = useMemo(() => {
    if (!equity?.series || equity.series.length === 0) return null;
    return equity.series[equity.series.length - 1];
  }, [equity]);

  const firstSnap = useMemo(() => equity?.series?.[0] ?? null, [equity]);
  const pnlPeriod = useMemo(() => {
    if (!latestSnap || !firstSnap) return null;
    return toNumber(latestSnap.total_equity_usdt) - toNumber(firstSnap.total_equity_usdt);
  }, [latestSnap, firstSnap]);

  const periodLabel = period;

  return (
    <div className="portal-page-stack">
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={
          <div className="flex items-center gap-1">
            {(['1D', '7D', '30D', '90D'] as const).map((p) => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod(p)}
              >
                {p}
              </Button>
            ))}
          </div>
        }
      />

      {error && (
        <div role="alert" className="rounded-md bg-rose-500/10 border border-rose-500/30 p-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* KPI cards (4 — equity, pnl_period, open_positions, total_margin) */}
      <StatCardGrid columns={4}>
        <StatCard
          label={t('kpi_equity')}
          value={latestSnap ? formatCurrency(toNumber(latestSnap.total_equity_usdt), 'USD', locale) : '—'}
          icon={Wallet}
          iconTone="info"
          loading={loading}
        />
        <StatCard
          label={t('kpi_pnl_period', { period: periodLabel })}
          value={
            pnlPeriod != null ? (
              <span className={pnlPeriod >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                {pnlPeriod >= 0 ? '+' : ''}
                {formatCurrency(pnlPeriod, 'USD', locale)}
              </span>
            ) : '—'
          }
          icon={pnlPeriod != null && pnlPeriod >= 0 ? TrendingUp : TrendingDown}
          iconTone={pnlPeriod != null && pnlPeriod >= 0 ? 'success' : 'danger'}
          loading={loading}
        />
        <StatCard
          label={t('kpi_open_positions')}
          value={latestSnap?.open_positions_count != null ? String(latestSnap.open_positions_count) : '—'}
          icon={Activity}
          iconTone="accent"
          loading={loading}
        />
        <StatCard
          label={t('kpi_total_margin')}
          value={latestSnap?.total_margin != null ? formatCurrency(toNumber(latestSnap.total_margin), 'USD', locale) : '—'}
          icon={Layers}
          iconTone="default"
          loading={loading}
        />
      </StatCardGrid>

      {/* Equity curve */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-semibold">{t('equity_curve_title')}</h2>
            <p className="text-xs text-muted-foreground">{t('equity_curve_caption', { period: periodLabel })}</p>
          </div>
          <EquityCurve
            data={equityPoints}
            height={360}
            periods={['1D', '7D', '30D', '90D']}
            activePeriod={period}
            onPeriodChange={(p) => setPeriod(p as '1D' | '7D' | '30D' | '90D')}
            locale={locale === 'en' ? 'en' : 'id'}
          />
        </CardContent>
      </Card>

      {/* Phase B — Analytics (graceful degrade kalau endpoint belum live) */}
      {analytics?.available !== false && analytics?.summary && (
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold mb-4">{t('analytics_title')}</h2>
            <StatCardGrid columns={4}>
              <StatCard
                label={t('analytics_total_pnl')}
                value={
                  analytics.summary.total_pnl_usdt != null
                    ? formatCurrency(analytics.summary.total_pnl_usdt, 'USD', locale)
                    : '—'
                }
              />
              <StatCard
                label={t('analytics_win_rate')}
                value={analytics.summary.win_rate != null ? `${analytics.summary.win_rate.toFixed(1)}%` : '—'}
              />
              <StatCard
                label={t('analytics_profit_factor')}
                value={analytics.summary.profit_factor != null ? analytics.summary.profit_factor.toFixed(2) : '—'}
              />
              <StatCard
                label={t('analytics_max_drawdown')}
                value={analytics.summary.max_drawdown_pct != null ? `${analytics.summary.max_drawdown_pct.toFixed(1)}%` : '—'}
              />
            </StatCardGrid>
          </CardContent>
        </Card>
      )}

      {analytics?.available === false && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300">
          {t('analytics_pending_backend')}
        </div>
      )}
    </div>
  );
}
