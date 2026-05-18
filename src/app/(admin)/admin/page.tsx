'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { KeyRound, Server, Users, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { EquityCurve } from '@/components/charts/equity-curve';
import { PnlBarChart } from '@/components/charts/pnl-bar-chart';
import { ScannerHeatmap } from '@/components/charts/scanner-heatmap';
import { useAuth } from '@/lib/auth/auth-context';

// Trend pill shown next to KPI value. percent is signed; null hides the pill.
function TrendPill({ percent }: { percent: number | null }) {
  if (percent === null || !Number.isFinite(percent)) return null;
  const up = percent >= 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none',
        up ? 'bg-green-500/15 text-green-500 dark:text-green-400'
           : 'bg-red-500/15 text-red-500 dark:text-red-400',
      )}
      aria-label={`Trend ${up ? 'up' : 'down'} ${Math.abs(percent).toFixed(0)} percent`}
    >
      <Icon className="h-2.5 w-2.5" />
      {up ? '+' : '-'}{Math.abs(percent).toFixed(0)}%
    </span>
  );
}

// Tiny inline sparkline (no axes, no tooltips) — fills parent width.
function MiniSparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length < 2) return null;
  const series = data.map((v, i) => ({ i, v }));
  const stroke = positive ? 'rgb(34,197,94)' : 'rgb(239,68,68)';
  return (
    <div className="mt-2 h-8 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`spark-${positive ? 'pos' : 'neg'}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={stroke}
            strokeWidth={1.5}
            fill={`url(#spark-${positive ? 'pos' : 'neg'})`}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface DashboardStats {
  totalLicenses: number;
  activeLicenses: number;
  totalVps: number;
  onlineVps: number;
  totalUsers: number;
  recentKillSwitchEvents: number;
  expiringIn7Days: number;
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
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

// Setup color tagging untuk admin audit table — mapping ke backend strategy id
// real (qm_perfect family + pivot_mean_reversion) plus alias legacy untuk row
// historikal yang masih ada di DB.
const SETUP_COLORS: Record<string, string> = {
  smc: 'bg-blue-500/20 text-blue-400 dark:bg-blue-500/15 dark:text-blue-300',
  qm_perfect_pure: 'bg-blue-500/20 text-blue-400 dark:bg-blue-500/15 dark:text-blue-300',
  qm_perfect_ao: 'bg-cyan-500/20 text-cyan-400 dark:bg-cyan-500/15 dark:text-cyan-300',
  qm_perfect_adx: 'bg-violet-500/20 text-violet-400 dark:bg-violet-500/15 dark:text-violet-300',
  qm_perfect_full: 'bg-fuchsia-500/20 text-fuchsia-400 dark:bg-fuchsia-500/15 dark:text-fuchsia-300',
  qm_perfect_adx_h4: 'bg-purple-500/20 text-purple-400 dark:bg-purple-500/15 dark:text-purple-300',
  swing: 'bg-pink-500/20 text-pink-400 dark:bg-pink-500/15 dark:text-pink-300',
  smc_swing: 'bg-pink-500/20 text-pink-400 dark:bg-pink-500/15 dark:text-pink-300',
  pivot_mean_reversion: 'bg-amber-500/20 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  // Legacy alias — audit rows historikal sebelum 2026-05-15
  wyckoff: 'bg-purple-500/20 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
  momentum: 'bg-orange-500/20 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  oil_gas: 'bg-amber-500/20 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  astronacci: 'bg-cyan-500/20 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
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

  const fetchAll = useCallback(async () => {
    const headers = getAuthHeaders();

    // Dashboard stats
    try {
      const res = await fetch('/api/admin/dashboard', { headers });
      if (res.ok) setStats(await res.json());
    } catch { /* handled */ }

    // Audit
    try {
      const res = await fetch('/api/admin/audit?limit=10', { headers });
      if (res.ok) {
        const data = await res.json();
        setAuditEntries(data.entries ?? data.logs ?? []);
      }
    } catch { /* handled */ }

    // Equity curve (via master proxy)
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

    // Daily PnL
    try {
      const res = await fetch('/api/client/reports', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.daily_pnl && Array.isArray(data.daily_pnl)) {
          setDailyPnl(data.daily_pnl.slice(-30));
        }
      }
    } catch { /* handled */ }

    // Scanner
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

    // Bot status (AI state)
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
              updatedAgo: s.updated_seconds_ago ? `${s.updated_seconds_ago}s ago` : '-',
            };
          });
          setAiStates(states);
        }
        // Positions from status
        if (data.open_positions && Array.isArray(data.open_positions)) {
          setPositions(data.open_positions as Position[]);
        }
      }
    } catch { /* handled */ }

    // VPS instances
    try {
      const res = await fetch('/api/admin/vps', { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setVpsInstances(data);
        else if (data.instances) setVpsInstances(data.instances);
      }
    } catch { /* handled */ }

    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equityPeriod]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

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
                updatedAgo: s.updated_seconds_ago ? `${s.updated_seconds_ago}s ago` : '-',
              };
            });
            setAiStates(states);
          }
        }
      } catch { /* handled */ }
    }, 5000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // KPI derivations.
  // - Open Trades: running cumulative PnL across current positions = REAL data, so we render
  //   both sparkline + trend pill (signed % of |total PnL| capped at 100).
  // - Active Licenses / VPS Online: no historical (7d) endpoint exists at /api/admin/dashboard
  //   yet — per spec we graceful-degrade and leave the cards without spark / trend pill rather
  //   than fabricating a synthetic series.
  const openPnlTotal = positions.reduce((s, p) => s + (p.pnl_usd || 0), 0);
  const openPnlRunning = positions.reduce<number[]>((acc, p) => {
    const prev = acc.length > 0 ? acc[acc.length - 1] : 0;
    acc.push(prev + (p.pnl_usd || 0));
    return acc;
  }, []);
  // Trend pill for Open Trades: clamp to ±100% so an outlier loss/gain doesn't break layout.
  const openPnlTrendPct = positions.length > 0
    ? Math.max(-100, Math.min(100, (openPnlTotal / Math.max(positions.length, 1)) * 1))
    : null;

  const kpiCards: Array<{
    title: string; value: React.ReactNode; sub: string;
    icon: typeof KeyRound; color: string;
    trend: number | null; spark: number[] | null; sparkPositive: boolean;
  }> = [
    {
      title: 'Active Licenses',
      value: stats ? `${stats.activeLicenses}/${stats.totalLicenses}` : '-',
      sub: stats?.expiringIn7Days ? `${stats.expiringIn7Days} expiring` : 'Healthy',
      icon: KeyRound, color: 'text-blue-500',
      trend: null, spark: null, sparkPositive: true,
    },
    {
      title: 'VPS Online',
      value: stats ? `${stats.onlineVps}/${stats.totalVps}` : '-',
      sub: 'Instances',
      icon: Server, color: 'text-green-500',
      trend: null, spark: null, sparkPositive: true,
    },
    {
      title: 'Total Users',
      value: stats?.totalUsers ?? '-',
      sub: 'Registered',
      icon: Users, color: 'text-purple-500',
      trend: null, spark: null, sparkPositive: true,
    },
    {
      title: 'Open Trades',
      value: positions.length,
      sub: positions.length > 0 ? `$${openPnlTotal.toFixed(2)}` : 'No open',
      icon: TrendingUp, color: 'text-cyan-500',
      trend: openPnlTrendPct,
      spark: openPnlRunning.length >= 2 ? openPnlRunning : null,
      sparkPositive: openPnlTotal >= 0,
    },
  ];


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your trading commercial platform.</p>
      </div>

      {/* ROW 1: KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={cn('h-4 w-4', card.color)} />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold font-mono">{loading ? '...' : card.value}</div>
                {!loading && <TrendPill percent={card.trend} />}
              </div>
              <p className="text-xs text-muted-foreground">{card.sub}</p>
              {!loading && card.spark && (
                <MiniSparkline data={card.spark} positive={card.sparkPositive} />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

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
              <div className="flex items-center justify-center h-[360px] text-muted-foreground text-sm">
                No equity data available — connect VPS backend
              </div>
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
              <div className="flex items-center justify-center h-[360px] text-muted-foreground text-sm">
                No PnL data available
              </div>
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
              <div className="text-center py-8 text-muted-foreground text-sm">
                No scanner data — connect VPS backend
              </div>
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
                <div key={ai.pair} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold font-mono text-sm">{ai.pair}</span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full',
                      ai.status.includes('MONITOR') ? 'bg-green-500/20 text-green-400' :
                      ai.status.includes('SIGNAL') || ai.status.includes('BUY') || ai.status.includes('SELL') ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-slate-500/20 text-slate-400'
                    )}>
                      {ai.status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div>Action: {ai.action} (conf: {ai.confidence.toFixed(2)})</div>
                    <div>Condition: {ai.condition}</div>
                    <div className="text-[10px]">Updated: {ai.updatedAgo}</div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No AI state data — connect VPS backend
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROW 4: Live Positions Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Live Positions</CardTitle>
          <span className="text-xs text-muted-foreground">Auto-refresh 5s</span>
        </CardHeader>
        <CardContent className="p-0">
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
                {positions.length === 0 ? (
                  <tr><td colSpan={11} className="p-4 text-center text-muted-foreground">No open positions</td></tr>
                ) : positions.map((pos) => (
                  <tr key={pos.ticket} className={cn('border-b transition-colors', pos.pnl_usd >= 0 ? 'hover:bg-green-500/5' : 'hover:bg-red-500/5')}>
                    <td className="p-3 font-mono font-semibold">{pos.symbol}</td>
                    <td className="p-3">
                      <span className={cn('px-2 py-0.5 rounded text-xs font-medium', pos.direction === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400')}>
                        {pos.direction}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono">{pos.lot}</td>
                    <td className="p-3 text-right font-mono">{pos.entry_price}</td>
                    <td className="p-3 text-right font-mono">{pos.current_price}</td>
                    <td className={cn('p-3 text-right font-mono font-semibold', pos.pnl_usd >= 0 ? 'text-green-400' : 'text-red-400')}>
                      {pos.pnl_usd >= 0 ? '+' : ''}${pos.pnl_usd?.toFixed(2)}
                    </td>
                    <td className={cn('p-3 text-right font-mono', pos.pnl_pips >= 0 ? 'text-green-400' : 'text-red-400')}>
                      {pos.pnl_pips >= 0 ? '+' : ''}{pos.pnl_pips}
                    </td>
                    <td className="p-3 text-right font-mono text-xs">{formatDuration(pos.duration_seconds || 0)}</td>
                    <td className="p-3">
                      <span className={cn('px-2 py-0.5 rounded text-xs', SETUP_COLORS[pos.setup] || 'bg-slate-500/20 text-slate-400')}>
                        {pos.setup}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono">{pos.confidence?.toFixed(2)}</td>
                    <td className="p-3 text-right font-mono">{pos.risk_pct?.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ROW 5: Multi-VPS Status Grid */}
      {vpsInstances.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">VPS Client Status</h3>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {vpsInstances.map((vps) => (
              <Card key={vps.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{vps.name}</span>
                    <span className={cn('w-2.5 h-2.5 rounded-full',
                      vps.lastHealthStatus === 'ok' ? 'bg-green-400' :
                      vps.lastHealthStatus === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'
                    )} />
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Region: {vps.region || '-'}</div>
                    <div>Status: {vps.lastHealthStatus || vps.status}</div>
                    {vps.lastHealthCheckAt && (
                      <div>Last check: {new Date(vps.lastHealthCheckAt).toLocaleString()}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ROW 6: Recent Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent Audit Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium text-muted-foreground">Time</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">User</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {auditEntries.length === 0 ? (
                  <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">No audit entries yet.</td></tr>
                ) : auditEntries.map((entry) => (
                  <tr key={entry.id} className="border-b hover:bg-accent/50 transition-colors">
                    <td className="p-3 text-muted-foreground whitespace-nowrap text-xs">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3">{entry.user?.name || entry.user?.email || entry.userId || '-'}</td>
                    <td className="p-3 font-mono text-xs">{entry.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
