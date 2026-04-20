'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    if (status === 'ONLINE') return 'bg-green-400';
    if (status === 'OFFLINE') return 'bg-red-400';
    if (status === 'PROVISIONING') return 'bg-blue-400';
    return 'bg-yellow-400';
  }

  function healthBadge(health: string | null) {
    if (!health) return { label: 'Tidak diketahui', cls: 'bg-slate-500/20 text-slate-400' };
    if (health === 'ok') return { label: 'Sehat', cls: 'bg-green-500/20 text-green-400' };
    if (health === 'degraded') return { label: 'Terganggu', cls: 'bg-yellow-500/20 text-yellow-400' };
    return { label: 'Tidak terjangkau', cls: 'bg-red-500/20 text-red-400' };
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">VPS Fleet</h2>
        <p className="text-muted-foreground">Monitor kesehatan dan status semua VPS instance</p>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <KpiCard label="Total" value={summary.total} icon={<Server className="w-4 h-4" />} />
          <KpiCard label="Online" value={summary.online} icon={<Wifi className="w-4 h-4 text-green-400" />} color="text-green-400" />
          <KpiCard label="Offline" value={summary.offline} icon={<WifiOff className="w-4 h-4 text-red-400" />} color="text-red-400" />
          <KpiCard label="Terganggu" value={summary.degraded} icon={<Activity className="w-4 h-4 text-yellow-400" />} color="text-yellow-400" />
          {summary.outdated !== null && (
            <KpiCard label="Perlu Update" value={summary.outdated} icon={<AlertTriangle className="w-4 h-4 text-orange-400" />} color="text-orange-400" />
          )}
        </div>
      )}

      {/* Fleet Grid */}
      {loading ? (
        <p className="text-muted-foreground text-sm">Memuat data fleet...</p>
      ) : fleet.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Tidak ada VPS instance</div>
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
                    vps.isUpToDate === false ? { label: 'Perlu Update', cls: 'bg-orange-500/20 text-orange-400' } : undefined
                  } />
                  <InfoLine label="Lisensi" value={String(vps.licenseCount)} />
                  <InfoLine
                    label="Cek Terakhir"
                    value={vps.lastHealthCheckAt
                      ? new Date(vps.lastHealthCheckAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                      : 'Belum pernah'}
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

function KpiCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <p className={cn('text-2xl font-bold font-mono', color)}>{value}</p>
      </CardContent>
    </Card>
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
