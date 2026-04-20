'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';
import { ArrowLeft, Shield, Settings2, Zap } from 'lucide-react';

interface StatusData {
  bot_status?: string;
  active_pairs?: number;
  ai_state_by_pair?: Record<string, {
    runtime_status_label?: string;
    pair?: string;
  }>;
  code_version?: string;
  license_status?: string;
  license_expiry?: string;
}

export default function MyVpsSettingsPage() {
  const { getAuthHeaders } = useAuth();
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/client/status', { headers: getAuthHeaders() });
        if (res.status === 401) { window.location.href = '/login'; return; }
        if (res.ok) setStatus(await res.json());
      } catch { /* handled */ }
      finally { setLoading(false); }
    }
    fetchStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pairs = status?.ai_state_by_pair ? Object.keys(status.ai_state_by_pair) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/portal/my-vps">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Pengaturan VPS</h1>
          <p className="text-sm text-muted-foreground">Konfigurasi trading bot dan parameter risiko</p>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Memuat data...</p>
      ) : (
        <>
          {/* Active Pairs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="w-4 h-4" /> Pair Aktif
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pairs.length === 0 ? (
                <p className="text-muted-foreground text-sm">Tidak ada pair aktif</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {pairs.map((pair) => (
                    <span key={pair} className="px-3 py-1.5 rounded-md bg-primary/10 text-primary text-sm font-mono font-medium">
                      {pair}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Risk Parameters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="w-4 h-4" /> Parameter Risiko
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow label="Manajemen Risiko" value="Otomatis oleh AI" />
                <InfoRow label="Max Posisi Bersamaan" value="Dikontrol oleh bot" />
                <InfoRow label="Stop Loss" value="Dinamis per pair" />
                <InfoRow label="Take Profit" value="Dinamis per pair" />
              </div>
              <div className="mt-4 p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400">
                Parameter risiko dikelola secara otomatis oleh AI trading bot. Hubungi admin untuk perubahan khusus.
              </div>
            </CardContent>
          </Card>

          {/* Bot Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> Informasi Bot
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow label="Versi Bot" value={status?.code_version || '-'} />
                <InfoRow label="Status Bot" value={status?.bot_status || '-'} />
                <InfoRow label="Status Lisensi" value={status?.license_status || '-'} />
                <InfoRow
                  label="Lisensi Berakhir"
                  value={status?.license_expiry
                    ? new Date(status.license_expiry).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                    : '-'
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Admin */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Ingin mengubah pengaturan atau menambah pair? Hubungi admin kami.
                </p>
                <Link href="/portal/my-vps/support">
                  <Button variant="outline" size="sm">Hubungi Support</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn('flex justify-between items-center p-3 rounded-lg border')}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium font-mono">{value}</span>
    </div>
  );
}
