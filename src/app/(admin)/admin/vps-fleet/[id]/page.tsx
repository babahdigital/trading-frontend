'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';
import { ArrowLeft, Activity, Globe, KeyRound, RefreshCw, Wifi } from 'lucide-react';

interface HealthCheck {
  id: string;
  checkedAt: string;
  httpStatus: number | null;
  responseTimeMs: number | null;
  zmqConnected: boolean | null;
  dbOk: boolean | null;
  lastTickAge: number | null;
}

interface License {
  id: string;
  licenseKey: string;
  status: string;
  type: string;
  expiresAt: string | null;
  user: { id: string; email: string; name: string | null };
}

interface VpsDetail {
  id: string;
  name: string;
  host: string;
  port: number;
  backendBaseUrl: string;
  status: string;
  lastHealthCheckAt: string | null;
  lastHealthStatus: string | null;
  codeVersion: string | null;
  isUpToDate: boolean | null;
  lastSyncStatus: string | null;
  lastSyncAt: string | null;
  hasSeedChecksum: boolean;
  hasSyncToken: boolean;
  customerCode: string | null;
  notes: string | null;
  licenseCount: number;
  healthChecks: HealthCheck[];
  licenses: License[];
}

export default function VpsFleetDetailPage() {
  const { getAuthHeaders } = useAuth();
  const params = useParams();
  const vpsId = params.id as string;

  const [vps, setVps] = useState<VpsDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/admin/vps/${vpsId}`, { headers: getAuthHeaders() });
        if (res.status === 401) {
          window.location.href = '/login';
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Gagal memuat data VPS');
        }
        setVps(await res.json());
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Koneksi error');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vpsId]);

  function statusBadge(status: string) {
    if (status === 'ONLINE') return { label: 'Online', cls: 'bg-green-500/20 text-green-400' };
    if (status === 'OFFLINE') return { label: 'Offline', cls: 'bg-red-500/20 text-red-400' };
    if (status === 'PROVISIONING') return { label: 'Provisioning', cls: 'bg-blue-500/20 text-blue-400' };
    return { label: status, cls: 'bg-yellow-500/20 text-yellow-400' };
  }

  function healthBadge(health: string | null) {
    if (!health) return { label: 'Tidak diketahui', cls: 'bg-slate-500/20 text-slate-400' };
    if (health === 'ok') return { label: 'Sehat', cls: 'bg-green-500/20 text-green-400' };
    if (health === 'degraded') return { label: 'Terganggu', cls: 'bg-yellow-500/20 text-yellow-400' };
    return { label: 'Tidak terjangkau', cls: 'bg-red-500/20 text-red-400' };
  }

  function licenseBadge(status: string) {
    if (status === 'ACTIVE') return { label: 'Aktif', cls: 'bg-green-500/20 text-green-400' };
    if (status === 'EXPIRED') return { label: 'Kedaluwarsa', cls: 'bg-red-500/20 text-red-400' };
    return { label: status, cls: 'bg-yellow-500/20 text-yellow-400' };
  }

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin/vps-fleet">
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Kembali</Button>
          </Link>
          <h2 className="text-3xl font-bold tracking-tight">Detail VPS</h2>
        </div>
        <p className="text-muted-foreground text-sm">Memuat data...</p>
      </div>
    );
  }

  if (error || !vps) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin/vps-fleet">
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Kembali</Button>
          </Link>
          <h2 className="text-3xl font-bold tracking-tight">Detail VPS</h2>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          {error || 'VPS tidak ditemukan'}
        </div>
      </div>
    );
  }

  const sBadge = statusBadge(vps.status);
  const hBadge = healthBadge(vps.lastHealthStatus);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/vps-fleet">
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Kembali</Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tight">{vps.name}</h2>
              <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', sBadge.cls)}>
                {sBadge.label}
              </span>
            </div>
            <p className="text-muted-foreground font-mono">{vps.host}:{vps.port}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Connection Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Globe className="w-4 h-4" /> Informasi Koneksi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Host" value={vps.host} mono />
            <DetailRow label="Port" value={String(vps.port)} mono />
            <DetailRow label="Backend URL" value={vps.backendBaseUrl} mono />
            <DetailRow label="Customer Code" value={vps.customerCode || '-'} mono />
            <DetailRow label="Jumlah Lisensi" value={String(vps.licenseCount)} />
            {vps.notes && <DetailRow label="Catatan" value={vps.notes} />}
          </CardContent>
        </Card>

        {/* Health */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4" /> Kesehatan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className={cn('px-2 py-0.5 rounded text-xs font-medium', hBadge.cls)}>{hBadge.label}</span>
            </div>
            <DetailRow label="Cek Terakhir" value={
              vps.lastHealthCheckAt
                ? new Date(vps.lastHealthCheckAt).toLocaleString('id-ID')
                : 'Belum pernah'
            } />
            {/* Recent health checks */}
            {vps.healthChecks.length > 0 && (
              <div className="pt-2 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Riwayat Cek Terakhir</p>
                {vps.healthChecks.map((hc) => (
                  <div key={hc.id} className="flex items-center justify-between text-xs p-2 rounded border">
                    <span className="text-muted-foreground">
                      {new Date(hc.checkedAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="flex items-center gap-2">
                      {hc.responseTimeMs !== null && <span className="font-mono">{hc.responseTimeMs}ms</span>}
                      <span className={cn('px-1.5 py-0.5 rounded',
                        hc.httpStatus === 200 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      )}>
                        {hc.httpStatus || '?'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sync / Version */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Sinkronisasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Versi Kode" value={vps.codeVersion || '-'} mono badge={
              vps.isUpToDate === false ? { label: 'Perlu Update', cls: 'bg-orange-500/20 text-orange-400' } :
              vps.isUpToDate === true ? { label: 'Terbaru', cls: 'bg-green-500/20 text-green-400' } : undefined
            } />
            <DetailRow label="Status Sync" value={vps.lastSyncStatus || '-'} />
            <DetailRow label="Sync Terakhir" value={
              vps.lastSyncAt ? new Date(vps.lastSyncAt).toLocaleString('id-ID') : '-'
            } />
            <DetailRow label="Seed Checksum" value={vps.hasSeedChecksum ? 'Ada' : 'Belum ada'} />
            <DetailRow label="Sync Token" value={vps.hasSyncToken ? 'Terenkripsi' : 'Belum ada'} />
          </CardContent>
        </Card>

        {/* Connectivity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wifi className="w-4 h-4" /> Konektivitas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Status VPS" value={vps.status} />
            <DetailRow label="Kesehatan" value={vps.lastHealthStatus || 'Tidak diketahui'} />
            {vps.healthChecks[0] && (
              <>
                <DetailRow label="ZMQ" value={vps.healthChecks[0].zmqConnected ? 'Terhubung' : 'Terputus'} />
                <DetailRow label="Database" value={vps.healthChecks[0].dbOk ? 'OK' : 'Error'} />
                {vps.healthChecks[0].lastTickAge !== null && (
                  <DetailRow label="Last Tick Age" value={`${vps.healthChecks[0].lastTickAge}s`} mono />
                )}
              </>
            )}
            <div className="pt-2 text-xs text-muted-foreground">
              Health check otomatis setiap 5 menit.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Linked Licenses */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <KeyRound className="w-4 h-4" /> Lisensi Terhubung ({vps.licenses.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vps.licenses.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">Tidak ada lisensi terhubung</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium text-muted-foreground">Customer</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">License Key</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Tipe</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Berakhir</th>
                  </tr>
                </thead>
                <tbody>
                  {vps.licenses.map((lic) => {
                    const lBadge = licenseBadge(lic.status);
                    return (
                      <tr key={lic.id} className="border-b last:border-0">
                        <td className="p-3">
                          <div>
                            <span className="font-medium">{lic.user.name || lic.user.email}</span>
                            {lic.user.name && <p className="text-xs text-muted-foreground">{lic.user.email}</p>}
                          </div>
                        </td>
                        <td className="p-3 font-mono text-xs">{lic.licenseKey}</td>
                        <td className="p-3 text-xs">{lic.type}</td>
                        <td className="p-3">
                          <span className={cn('px-2 py-0.5 rounded text-xs font-medium', lBadge.cls)}>
                            {lBadge.label}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">
                          {lic.expiresAt ? new Date(lic.expiresAt).toLocaleDateString('id-ID') : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({ label, value, mono, badge }: {
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
