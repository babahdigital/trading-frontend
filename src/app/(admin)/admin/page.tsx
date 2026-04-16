'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { KeyRound, Server, Users, Zap, DollarSign, TrendingUp } from 'lucide-react';
import { EquityCurve } from '@/components/charts/equity-curve';
import { PnlBarChart } from '@/components/charts/pnl-bar-chart';
import { ScannerHeatmap } from '@/components/charts/scanner-heatmap';

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

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('access_token')}` };
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

const SETUP_COLORS: Record<string, string> = {
  smc: 'bg-blue-500/20 text-blue-400',
  wyckoff: 'bg-purple-500/20 text-purple-400',
  momentum: 'bg-orange-500/20 text-orange-400',
  oil_gas: 'bg-amber-500/20 text-amber-400',
  astronacci: 'bg-cyan-500/20 text-cyan-400',
  swing: 'bg-pink-500/20 text-pink-400',
};

export default function AdminDashboard() {
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
    const headers = authHeaders();

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
  }, [equityPeriod]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-refresh positions and AI state every 5s
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch('/api/client/status', { headers: authHeaders() });
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
  }, []);

  const kpiCards = [
    { title: 'Active Licenses', value: stats ? `${stats.activeLicenses}/${stats.totalLicenses}` : '-', sub: stats?.expiringIn7Days ? `${stats.expiringIn7Days} expiring` : 'Healthy', icon: KeyRound, color: 'text-blue-500' },
    { title: 'VPS Online', value: stats ? `${stats.onlineVps}/${stats.totalVps}` : '-', sub: 'Instances', icon: Server, color: 'text-green-500' },
    { title: 'Total Users', value: stats?.totalUsers ?? '-', sub: 'Registered', icon: Users, color: 'text-purple-500' },
    { title: 'Open Trades', value: positions.length, sub: positions.length > 0 ? `$${positions.reduce((sum, p) => sum + (p.pnl_usd || 0), 0).toFixed(2)}` : 'No open', icon: TrendingUp, color: 'text-cyan-500' },
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
              <div className="text-2xl font-bold font-mono">{loading ? '...' : card.value}</div>
              <p className="text-xs text-muted-foreground">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ROW 2: Equity Curve + Daily PnL Bar */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Master Equity Curve</CardTitle>
          </CardHeader>
          <CardContent>
            <EquityCurve
              data={equityData}
              height={360}
              periods={['7D', '30D', '90D', 'YTD']}
              activePeriod={equityPeriod}
              onPeriodChange={setEquityPeriod}
            />
            {equityData.length === 0 && !loading && (
              <div className="flex items-center justify-center h-[360px] text-muted-foreground text-sm">
                No equity data available — connect VPS backend
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Daily PnL (30D)</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyPnl.length > 0 ? (
              <PnlBarChart data={dailyPnl} height={360} />
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
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Scanner Heatmap (14 Pairs)</CardTitle>
          </CardHeader>
          <CardContent>
            {scannerPairs.length > 0 ? (
              <ScannerHeatmap pairs={scannerPairs} mode="admin" />
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
