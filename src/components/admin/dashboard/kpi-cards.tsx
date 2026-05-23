'use client';

import { ReactNode } from 'react';
import { KeyRound, Server, Users as UsersIcon, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatCard, StatCardGrid } from '@/components/admin/stat-card';

export interface KpiCardsProps {
  stats: {
    totalLicenses: number;
    activeLicenses: number;
    totalVps: number;
    onlineVps: number;
    totalUsers: number;
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
  } | null;
  positions: { pnl_usd: number }[];
  openPnlTotal: number;
  openPnlRunning: number[];
  openPnlTrendPct: number | null;
  loading: boolean;
  error?: string | null;
}

export function KpiCards({
  stats,
  positions,
  openPnlTotal,
  openPnlRunning,
  openPnlTrendPct,
  loading,
  error,
}: KpiCardsProps) {
  return (
    <>
      {error && (
        <div role="alert" className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded px-3 py-2 mb-3">
          {error}
        </div>
      )}
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
    </>
  );
}
