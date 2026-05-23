'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';
import { Icon } from '@/components/ui/icon';
import { formatDateTime } from '@/lib/format-locale';

import { KpiCards } from '@/components/admin/dashboard/kpi-cards';
import { EquitySection } from '@/components/admin/dashboard/equity-section';
import { ScannerSection, type AiState, type ScannerPair } from '@/components/admin/dashboard/scanner-section';
import { PositionsTable, type Position } from '@/components/admin/dashboard/positions-table';
import { VpsGrid, type VpsStatus } from '@/components/admin/dashboard/vps-grid';
import { AuditSection, type AuditEntry } from '@/components/admin/dashboard/audit-section';

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

export default function AdminDashboard() {
  const { getAuthHeaders } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [equityData, setEquityData] = useState<{ time: string; value: number }[]>([]);
  const [dailyPnl, setDailyPnl] = useState<{ date: string; pnl: number }[]>([]);
  const [scannerPairs, setScannerPairs] = useState<ScannerPair[]>([]);
  const [aiStates, setAiStates] = useState<AiState[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [vpsInstances, setVpsInstances] = useState<VpsStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [equityPeriod, setEquityPeriod] = useState('30D');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchAll = useCallback(async () => {
    const headers = getAuthHeaders();
    const sectionErrors: Record<string, string> = {};

    try {
      const res = await fetch('/api/admin/dashboard', { headers });
      if (res.ok) setStats(await res.json());
      else sectionErrors.stats = `Failed to load stats (HTTP ${res.status})`;
    } catch (err) { sectionErrors.stats = err instanceof Error ? err.message : 'Network error'; }

    try {
      const res = await fetch('/api/admin/audit?limit=10', { headers });
      if (res.ok) {
        const data = await res.json();
        setAuditEntries(data.entries ?? data.logs ?? []);
      } else sectionErrors.audit = `Failed to load audit log (HTTP ${res.status})`;
    } catch (err) { sectionErrors.audit = err instanceof Error ? err.message : 'Network error'; }

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
      } else sectionErrors.equity = `Failed to load equity data (HTTP ${res.status})`;
    } catch (err) { sectionErrors.equity = err instanceof Error ? err.message : 'Network error'; }

    try {
      const res = await fetch('/api/client/reports', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.daily_pnl && Array.isArray(data.daily_pnl)) {
          setDailyPnl(data.daily_pnl.slice(-30));
        }
      } else sectionErrors.pnl = `Failed to load PnL data (HTTP ${res.status})`;
    } catch (err) { sectionErrors.pnl = err instanceof Error ? err.message : 'Network error'; }

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
      } else sectionErrors.scanner = `Failed to load scanner data (HTTP ${res.status})`;
    } catch (err) { sectionErrors.scanner = err instanceof Error ? err.message : 'Network error'; }

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
      } else sectionErrors.status = `Failed to load status data (HTTP ${res.status})`;
    } catch (err) { sectionErrors.status = err instanceof Error ? err.message : 'Network error'; }

    try {
      const res = await fetch('/api/admin/vps', { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setVpsInstances(data);
        else if (data.instances) setVpsInstances(data.instances);
      } else sectionErrors.vps = `Failed to load VPS data (HTTP ${res.status})`;
    } catch (err) { sectionErrors.vps = err instanceof Error ? err.message : 'Network error'; }

    setErrors(sectionErrors);
    setLoading(false);
    setLastRefreshed(new Date());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equityPeriod]);

  // fetchAll drives setState — intentional fetch on mount + refetch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
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
      <KpiCards
        stats={stats}
        positions={positions}
        openPnlTotal={openPnlTotal}
        openPnlRunning={openPnlRunning}
        openPnlTrendPct={openPnlTrendPct}
        loading={loading}
        error={errors.stats}
      />

      {/* ROW 2: Equity Curve + Daily PnL Bar */}
      <EquitySection
        equityData={equityData}
        dailyPnl={dailyPnl}
        equityPeriod={equityPeriod}
        onPeriodChange={setEquityPeriod}
        loading={loading}
        equityError={errors.equity}
        pnlError={errors.pnl}
      />

      {/* ROW 3: Scanner Heatmap + AI State Monitor */}
      <ScannerSection
        scannerPairs={scannerPairs}
        aiStates={aiStates}
        scannerError={errors.scanner}
        statusError={errors.status}
      />

      {/* ROW 4: Live Positions Table */}
      <PositionsTable positions={positions} error={errors.status} />

      {/* ROW 5: Multi-VPS Status Grid */}
      <VpsGrid vpsInstances={vpsInstances} />

      {/* ROW 6: Recent Audit Log */}
      <AuditSection auditEntries={auditEntries} error={errors.audit} />
    </div>
  );
}
