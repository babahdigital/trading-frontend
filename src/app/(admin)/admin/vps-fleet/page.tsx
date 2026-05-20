'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/empty-state';
import { StatCard, StatCardGrid } from '@/components/admin/stat-card';
import { formatDateTime } from '@/lib/format-locale';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';
import { Activity, AlertTriangle, ArrowRight, Server, Wifi, WifiOff } from 'lucide-react';

interface FleetVps {
  id: string;
  name: string;
  host: string;
  status: string;
  lastHealthCheckAt: string | null;
  lastHealthStatus: string | null;
  codeVersion: string | null;
  isUpToDate: boolean | null;
  lastSyncStatus: string | null;
  lastSyncAt: string | null;
  licenseCount: number;
}

interface FleetSummary {
  total: number;
  online: number;
  offline: number;
  provisioning: number;
  suspended: number;
  healthy: number;
  degraded: number;
  unreachable: number;
  outdated: number | null;
}

export default function VpsFleetPage() {
  const { getAuthHeaders } = useAuth();
  const [fleet, setFleet] = useState<FleetVps[]>([]);
  const [summary, setSummary] = useState<FleetSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let interval: ReturnType<typeof setInterval>;
    async function fetchFleet() {
      if (document.hidden) return;
      try {
        const res = await fetch('/api/admin/vps/fleet-status', { headers: getAuthHeaders() });
        if (res.status === 401) { window.location.href = '/login'; return; }
        if (res.ok) {
          const data = await res.json();
          if (active) {
            setFleet(data.fleet || []);
            setSummary(data.summary || null);
          }
        }
      } catch { /* handled */ }
      finally { if (active) setLoading(false); }
    }
    fetchFleet();
    interval = setInterval(fetchFleet, 15000);

    const onVisChange = () => {
      if (!document.hidden) fetchFleet();
    };
    document.addEventListener('visibilitychange', onVisChange);
    return () => { active = false; clearInterval(interval); document.removeEventListener('visibilitychange', onVisChange); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function statusDot(status: string) {
    if (status === 'ONLINE') return 'bg-emerald-500 dark:bg-emerald-400';
    if (status === 'OFFLINE') return 'bg-rose-500 dark:bg-rose-400';
    if (status === 'PROVISIONING') return 'bg-sky-500 dark:bg-sky-400';
    return 'bg-amber-500 dark:bg-amber-400';
  }

  function healthBadge(health: string | null) {
    if (!health) return { label: 'Tidak diketahui', cls: 'bg-slate-500/15 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300' };
    if (health === 'ok') return { label: 'Sehat', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' };
    if (health === 'degraded') return { label: 'Terganggu', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' };
    return { label: 'Tidak terjangkau', cls: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' };
  }

  return (
    <div>
      <PageHeader
        title="VPS Fleet"
        description="Monitor kesehatan dan status semua VPS instance"
      />

      {/* Summary KPI Cards */}
      {summary && (
        <StatCardGrid columns={4} className="mb-6">
          <StatCard label="Total" value={summary.total} icon={Server} />
          <StatCard label="Aktif" value={summary.online} icon={Wifi} iconTone="success" />
          <StatCard label="Mati" value={summary.offline} icon={WifiOff} iconTone="danger" />
          <StatCard label="Terganggu" value={summary.degraded} icon={Activity} iconTone="warning" />
          {summary.outdated !== null && (
            <StatCard label="Perlu Update" value={summary.outdated} icon={AlertTriangle} iconTone="warning" />
          )}
        </StatCardGrid>
      )}

      {/* Fleet Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><div className="h-24 rounded bg-muted animate-pulse" /></CardContent></Card>
          ))}
        </div>
      ) : fleet.length === 0 ? (
        <EmptyState
          icon={Server}
          title="Tidak ada VPS instance"
          description="Belum ada VPS instance yang terdaftar di fleet."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fleet.map((vps) => {
            const hBadge = healthBadge(vps.lastHealthStatus);
            return (
              <Card key={vps.id} className="hover:border-primary/30 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn('w-2.5 h-2.5 rounded-full', statusDot(vps.status))} />
                      <CardTitle className="text-sm font-semibold">{vps.name}</CardTitle>
                    </div>
                    <span className={cn('px-2 py-0.5 rounded text-xs font-medium', hBadge.cls)}>
                      {hBadge.label}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <InfoLine label="Host" value={vps.host} mono />
                  <InfoLine label="Status" value={vps.status} />
                  <InfoLine label="Versi" value={vps.codeVersion || '-'} mono badge={
                    vps.isUpToDate === false ? { label: 'Perlu Update', cls: 'bg-orange-500/15 text-orange-700 dark:text-orange-300' } : undefined
                  } />
                  <InfoLine label="Lisensi" value={String(vps.licenseCount)} />
                  <InfoLine
                    label="Cek Terakhir"
                    value={vps.lastHealthCheckAt ? formatDateTime(vps.lastHealthCheckAt) : 'Belum pernah'}
                  />
                  <div className="pt-2">
                    <Link href={`/admin/vps-fleet/${vps.id}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                      Lihat Detail <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InfoLine({ label, value, mono, badge }: {
  label: string;
  value: string;
  mono?: boolean;
  badge?: { label: string; cls: string };
}) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className={cn(mono && 'font-mono')}>{value}</span>
        {badge && <span className={cn('px-1.5 py-0.5 rounded text-xs', badge.cls)}>{badge.label}</span>}
      </div>
    </div>
  );
}
