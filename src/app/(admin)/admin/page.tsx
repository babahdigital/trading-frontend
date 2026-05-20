'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  KeyRound, Server, Users as UsersIcon, TrendingUp, RefreshCw, Activity, Wifi, WifiOff,
} from 'lucide-react';
import { EquityCurve } from '@/components/charts/equity-curve';
import { PnlBarChart } from '@/components/charts/pnl-bar-chart';
import { ScannerHeatmap } from '@/components/charts/scanner-heatmap';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';
import { StatCard, StatCardGrid } from '@/components/admin/stat-card';
import { EmptyState } from '@/components/admin/empty-state';
import { Icon, IconCircle } from '@/components/ui/icon';
import { formatDateTime } from '@/lib/format-locale';
import { tradeOutcomeBadge, vpsStatusBadge } from '@/lib/admin/badges';

interface DashboardStats {
  totalLicenses: number;
  activeLicenses: number;
  totalVps: number;
  onlineVps: number;
  totalUsers: number;
  recentKillSwitchEvents: number;
  expiringIn7Days: number;
  trend7d?: {
    licenses: number[] | null;
    users: number[] | null;
    vpsOnline: number[] | null;
  };
  trendPct?: {
    licenses: number | null;
    users: number | null;
    vpsOnline: number | null;
  };
}

interface AuditEntry {
  id: string;
  createdAt: string;
  userId: string | null;
  action: string;
  user?: { email: string; name: string | null } | null;
}

interface Position {
  ticket: string;
  symbol: string;
  direction: string;
  lot: number;
  entry_price: number;
  current_price: number;
  pnl_usd: number;
  pnl_pips: number;
  duration_seconds: number;
  sl: number;
  tp: number;
  setup: string;
  confidence: number;
  risk_pct: number;
}

interface VpsStatus {
  id: string;
  name: string;
  region: string;
  status: string;
  lastHealthStatus: string | null;
  lastHealthCheckAt: string | null;
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

// Strategy id → tone via badges helper; fallback neutral.
const SETUP_TONE_CLASS: Record<string, string> = {
  smc: 'bg-sky-500/15 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  qm_perfect_pure: 'bg-sky-500/15 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  qm_perfect_ao: 'bg-cyan-500/15 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300',
  qm_perfect_adx: 'bg-violet-500/15 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  qm_perfect_full: 'bg-fuchsia-500/15 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300',
  qm_perfect_adx_h4: 'bg-purple-500/15 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
  swing: 'bg-pink-500/15 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300',
  smc_swing: 'bg-pink-500/15 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300',
  pivot_mean_reversion: 'bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  wyckoff: 'bg-purple-500/15 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
  momentum: 'bg-orange-500/15 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
  oil_gas: 'bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  astronacci: 'bg-cyan-500/15 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300',
};

export default function AdminDashboard() {
  const { getAuthHeaders } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [equityData, setEquityData] = useState<{ time: string; value: number }[]>([]);
  const [dailyPnl, setDailyPnl] = useState<{ date: string; pnl: number }[]>([]);
  const [scannerPairs, setScannerPairs] = useState<{ pair: string; score: number; status: 'active' | 'standby' | 'off'; breakdown?: { smc: number; wyckoff: number; zone: number; sr: number; session: number } }[]>([]);
  const [aiStates, setAiStates] = useState<{ pair: string; status: string; action: string; confidence: number; condition: string; updatedAgo: string }[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [vpsInstances, setVpsInstances] = useState<VpsStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [equityPeriod, setEquityPeriod] = useState('30D');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    const headers = getAuthHeaders();

    try {
      const res = await fetch('/api/admin/dashboard', { headers });
      if (res.ok) setStats(await res.json());
    } catch { /* handled */ }

    try {
      const res = await fetch('/api/admin/audit?limit=10', { headers });
      if (res.ok) {
        const data = await res.json();
        setAuditEntries(data.entries ?? data.logs ?? []);
      }
    } catch { /* handled */ }

    try {
      const days = equityPeriod === '7D' ? 7 : equityPeriod === '90D' ? 90 : 30;
      const res = await fetch(`/api/client/equity?days=${days}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.snapshots)) {
          setEquityData(data.snapshots.map((s: { timestamp: string; equity: number }) => ({
            time: s.timestamp?.split('T')[0] || s.timestamp,
            value: s.equity,
          })));
        }
      }
    } catch { /* handled */ }

    try {
      const res = await fetch('/api/client/reports', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.daily_pnl && Array.isArray(data.daily_pnl)) {
          setDailyPnl(data.daily_pnl.slice(-30));
        }
      }
    } catch { /* handled */ }

    try {
      const res = await fetch('/api/client/scanner', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.pairs && Array.isArray(data.pairs)) {
          setScannerPairs(data.pairs.map((p: Record<string, unknown>) => ({
            pair: p.pair as string,
            score: (p.total_score as number || 0) / 100,
            status: p.status_label === 'AKTIF' ? 'active' : p.status_label === 'STANDBY' ? 'standby' : 'off',
            breakdown: p.smc_score != null ? {
              smc: p.smc_score as number / 100,
              wyckoff: (p.wyckoff_score as number || 0) / 100,
              zone: (p.zone_score as number || 0) / 100,
              sr: (p.sr_score as number || 0) / 100,
              session: (p.session_score as number || 0) / 100,
            } : undefined,
          })));
        }
      }
    } catch { /* handled */ }

    try {
      const res = await fetch('/api/client/status', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.ai_state_by_pair) {
          const states = Object.entries(data.ai_state_by_pair).map(([pair, state]: [string, unknown]) => {
            const s = state as Record<string, unknown>;
            return {
              pair,
              status: (s.runtime_status as string) || 'unknown',
              action: (s.last_action as string) || '-',
              confidence: (s.confidence as number) || 0,
              condition: (s.market_condition as string) || '-',
              updatedAgo: s.updated_seconds_ago ? `${s.updated_seconds_ago}d` : '-',
            };
          });
          setAiStates(states);
        }
        if (data.open_positions && Array.isArray(data.open_positions)) {
          setPositions(data.open_positions as Position[]);
        }
      }
    } catch { /* handled */ }

    try {
      const res = await fetch('/api/admin/vps', { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setVpsInstances(data);
        else if (data.instances) setVpsInstances(data.instances);
      }
    } catch { /* handled */ }

    setLoading(false);
    setLastRefreshed(new Date());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equityPeriod]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  // Auto-refresh positions and AI state every 5s
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch('/api/client/status', { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          if (data.open_positions) setPositions(data.open_positions as Position[]);
          if (data.ai_state_by_pair) {
            const states = Object.entries(data.ai_state_by_pair).map(([pair, state]: [string, unknown]) => {
              const s = state as Record<string, unknown>;
              return {
                pair,
                status: (s.runtime_status as string) || 'unknown',
                action: (s.last_action as string) || '-',
                confidence: (s.confidence as number) || 0,
                condition: (s.market_condition as string) || '-',
                updatedAgo: s.updated_seconds_ago ? `${s.updated_seconds_ago}d` : '-',
              };
            });
            setAiStates(states);
          }
          setLastRefreshed(new Date());
        }
      } catch { /* handled */ }
    }, 5000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openPnlTotal = positions.reduce((s, p) => s + (p.pnl_usd || 0), 0);
  const openPnlRunning = positions.reduce<number[]>((acc, p) => {
    const prev = acc.length > 0 ? acc[acc.length - 1] : 0;
    acc.push(prev + (p.pnl_usd || 0));
    return acc;
  }, []);
  const openPnlTrendPct = positions.length > 0
    ? Math.max(-100, Math.min(100, (openPnlTotal / Math.max(positions.length, 1)) * 1))
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations · Live"
        title="Dashboard"
        description="Pantau lisensi, VPS fleet, dan signal engine secara real-time."
        actions={
          <div className="flex items-center gap-2">
            {lastRefreshed ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Diperbarui {formatDateTime(lastRefreshed)}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void fetchAll()}
              className="inline-flex items-center gap-1.5 px-2.5 h-9 rounded-md border border-input bg-background text-sm hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Muat ulang dashboard"
            >
              <Icon icon={RefreshCw} size="sm" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        }
      />

      {/* ROW 1: KPI Cards */}
      <StatCardGrid columns={4}>
        <StatCard
          label="Active Licenses"
          value={stats ? `${stats.activeLicenses}/${stats.totalLicenses}` : '-'}
          sub={stats?.expiringIn7Days ? `${stats.expiringIn7Days} akan kedaluwarsa 7 hari` : 'Healthy'}
          icon={KeyRound}
          iconTone="info"
          trend={stats?.trendPct?.licenses ?? null}
          spark={stats?.trend7d?.licenses ?? null}
          loading={loading}
        />
        <StatCard
          label="VPS Online"
          value={stats ? `${stats.onlineVps}/${stats.totalVps}` : '-'}
          sub="Instances"
          icon={Server}
          iconTone="success"
          trend={stats?.trendPct?.vpsOnline ?? null}
          spark={stats?.trend7d?.vpsOnline ?? null}
          loading={loading}
        />
        <StatCard
          label="Total Users"
          value={stats?.totalUsers ?? '-'}
          sub="Terdaftar"
          icon={UsersIcon}
          iconTone="accent"
          trend={stats?.trendPct?.users ?? null}
          spark={stats?.trend7d?.users ?? null}
          loading={loading}
        />
        <StatCard
          label="Open Trades"
          value={positions.length}
          sub={positions.length > 0
            ? <span className={cn('font-mono', openPnlTotal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                {openPnlTotal >= 0 ? '+' : ''}${openPnlTotal.toFixed(2)}
              </span>
            : 'Tidak ada posisi terbuka'}
          icon={TrendingUp}
          iconTone={positions.length > 0 ? (openPnlTotal >= 0 ? 'success' : 'danger') : 'default'}
          trend={openPnlTrendPct}
          spark={openPnlRunning.length >= 2 ? openPnlRunning : null}
          loading={loading}
        />
      </StatCardGrid>

      {/* ROW 2: Equity Curve + Daily PnL Bar */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3 min-w-0">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Master Equity Curve</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-w-0">
              <EquityCurve
                data={equityData}
                height={360}
                periods={['7D', '30D', '90D', 'YTD']}
                activePeriod={equityPeriod}
                onPeriodChange={setEquityPeriod}
              />
            </div>
            {equityData.length === 0 && !loading && (
              <EmptyState
                variant="inline"
                icon={Activity}
                title="Belum ada data equity"
                description="Hubungkan VPS backend untuk mulai mengalirkan snapshot equity."
                size="sm"
                className="mt-4"
              />
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2 min-w-0">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Daily PnL (30D)</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyPnl.length > 0 ? (
              <div className="w-full min-w-0">
                <PnlBarChart data={dailyPnl} height={360} />
              </div>
            ) : (
              <EmptyState
                variant="inline"
                icon={TrendingUp}
                title="Belum ada data PnL"
                size="sm"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ROW 3: Scanner Heatmap + AI State Monitor */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Scanner Heatmap (14 Pairs)</CardTitle>
          </CardHeader>
          <CardContent>
            {scannerPairs.length > 0 ? (
              <div className="w-full min-w-0">
                <ScannerHeatmap pairs={scannerPairs} mode="admin" />
              </div>
            ) : (
              <EmptyState
                variant="inline"
                icon={Activity}
                title="Belum ada data scanner"
                description="Hubungkan VPS backend untuk mulai membaca scanner."
                size="sm"
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">AI State Monitor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {aiStates.length > 0 ? aiStates.map((ai) => (
                <div key={ai.pair} className="border rounded-lg p-3 bg-card hover:bg-muted/40 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold font-mono text-sm">{ai.pair}</span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                      ai.status.includes('MONITOR') ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' :
                      ai.status.includes('SIGNAL') || ai.status.includes('BUY') || ai.status.includes('SELL') ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' :
                      'bg-slate-500/15 text-slate-700 dark:text-slate-300',
                    )}>
                      {ai.status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div>Action: <span className="font-mono">{ai.action}</span> (conf: {ai.confidence.toFixed(2)})</div>
                    <div>Condition: {ai.condition}</div>
                    <div className="text-[10px]">Updated: {ai.updatedAgo}</div>
                  </div>
                </div>
              )) : (
                <EmptyState
                  variant="inline"
                  icon={Activity}
                  title="Belum ada data AI state"
                  description="Hubungkan VPS backend untuk live AI monitor."
                  size="sm"
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROW 4: Live Positions Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Live Positions</CardTitle>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Auto-refresh 5d
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {positions.length === 0 ? (
            <div className="p-6">
              <EmptyState
                variant="inline"
                icon={TrendingUp}
                title="Tidak ada posisi terbuka"
                description="Posisi terbuka akan tampil di sini saat sistem mengeksekusi trade."
                size="sm"
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium text-muted-foreground">Pair</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Dir</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Lot</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Entry</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Current</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">PnL $</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">PnL pts</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Duration</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Setup</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Conf</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Risk%</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((pos) => {
                    const outcomeMeta = tradeOutcomeBadge(pos.direction);
                    return (
                      <tr key={pos.ticket} className={cn('border-b transition-colors', pos.pnl_usd >= 0 ? 'hover:bg-emerald-500/5' : 'hover:bg-rose-500/5')}>
                        <td className="p-3 font-mono font-semibold">{pos.symbol}</td>
                        <td className="p-3">
                          <span className={cn('px-2 py-0.5 rounded text-xs font-medium',
                            pos.direction === 'BUY' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
                          )}>
                            {pos.direction}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono">{pos.lot}</td>
                        <td className="p-3 text-right font-mono">{pos.entry_price}</td>
                        <td className="p-3 text-right font-mono">{pos.current_price}</td>
                        <td className={cn('p-3 text-right font-mono font-semibold', pos.pnl_usd >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                          {pos.pnl_usd >= 0 ? '+' : ''}${pos.pnl_usd?.toFixed(2)}
                        </td>
                        <td className={cn('p-3 text-right font-mono', pos.pnl_pips >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                          {pos.pnl_pips >= 0 ? '+' : ''}{pos.pnl_pips}
                        </td>
                        <td className="p-3 text-right font-mono text-xs">{formatDuration(pos.duration_seconds || 0)}</td>
                        <td className="p-3">
                          <span className={cn('px-2 py-0.5 rounded text-xs font-medium', SETUP_TONE_CLASS[pos.setup] || 'bg-slate-500/15 text-slate-700 dark:text-slate-300')}>
                            {pos.setup}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono">{pos.confidence?.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono">{pos.risk_pct?.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ROW 5: Multi-VPS Status Grid */}
      {vpsInstances.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">VPS Client Status</h3>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {vpsInstances.map((vps) => {
              const meta = vpsStatusBadge(vps.status, vps.lastHealthStatus);
              const isOnline = meta.tone === 'success';
              return (
                <Card key={vps.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <IconCircle icon={isOnline ? Wifi : WifiOff} size="sm" tone={isOnline ? 'success' : 'danger'} />
                        <span className="font-semibold truncate">{vps.name}</span>
                      </div>
                      <span className={cn('shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider', meta.cls)}>
                        {meta.label}
                      </span>
                    </div>
                    <dl className="text-xs text-muted-foreground space-y-1">
                      <div className="flex justify-between">
                        <dt>Region</dt>
                        <dd className="font-mono">{vps.region || '-'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Last check</dt>
                        <dd>{vps.lastHealthCheckAt ? formatDateTime(vps.lastHealthCheckAt) : '-'}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ROW 6: Recent Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent Audit Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {auditEntries.length === 0 ? (
            <div className="p-6">
              <EmptyState
                variant="inline"
                icon={Activity}
                title="Belum ada aktivitas audit"
                size="sm"
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium text-muted-foreground">Waktu</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">User</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {auditEntries.map((entry) => (
                    <tr key={entry.id} className="border-b hover:bg-accent/50 transition-colors">
                      <td className="p-3 text-muted-foreground whitespace-nowrap text-xs">
                        {formatDateTime(entry.createdAt)}
                      </td>
                      <td className="p-3">{entry.user?.name || entry.user?.email || entry.userId || '-'}</td>
                      <td className="p-3 font-mono text-xs">{entry.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
