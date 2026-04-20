'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';
import { Plus, Search } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  mt5Account: string | null;
  lastLoginAt: string | null;
  _count: { licenses: number; subscriptions: number };
}

interface License {
  id: string;
  status: string;
  type: string;
  expiresAt: string | null;
  user: { id: string; email: string; name: string | null };
  vpsInstance: { id: string; name: string; status: string } | null;
}

interface VpsInstance {
  id: string;
  name: string;
  status: string;
  lastHealthStatus: string | null;
}

interface CustomerRow {
  user: User;
  license: License | null;
  vps: VpsInstance | null;
}

type FilterStatus = 'all' | 'active' | 'expired';

export default function CustomersPage() {
  const { getAuthHeaders } = useAuth();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');

  useEffect(() => {
    async function fetchData() {
      try {
        const headers = getAuthHeaders();
        const [usersRes, licensesRes, vpsRes] = await Promise.all([
          fetch('/api/admin/users?limit=200', { headers }),
          fetch('/api/admin/licenses?limit=200', { headers }),
          fetch('/api/admin/vps?limit=200', { headers }),
        ]);

        const usersData = usersRes.ok ? await usersRes.json() : { users: [] };
        const licensesData = licensesRes.ok ? await licensesRes.json() : { licenses: [] };
        const vpsData = vpsRes.ok ? await vpsRes.json() : { vpsInstances: [] };

        const clientUsers: User[] = (usersData.users || []).filter((u: User) => u.role === 'CLIENT');
        const licenses: License[] = licensesData.licenses || [];
        const vpsInstances: VpsInstance[] = vpsData.vpsInstances || [];

        // Build customer rows: join user → license → vps
        const rows: CustomerRow[] = clientUsers.map((user) => {
          const userLicense = licenses.find((l) => l.user.id === user.id) || null;
          const vps = userLicense?.vpsInstance
            ? vpsInstances.find((v) => v.id === userLicense.vpsInstance?.id) || null
            : null;
          return { user, license: userLicense, vps };
        });

        setCustomers(rows);
      } catch { /* handled */ }
      finally { setLoading(false); }
    }
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = customers.filter((c) => {
    // Search
    if (search) {
      const q = search.toLowerCase();
      const match = c.user.email.toLowerCase().includes(q)
        || (c.user.name || '').toLowerCase().includes(q)
        || (c.user.mt5Account || '').includes(q);
      if (!match) return false;
    }
    // Status filter
    if (filter === 'active') {
      return c.license?.status === 'ACTIVE';
    }
    if (filter === 'expired') {
      return c.license?.status === 'EXPIRED' || !c.license;
    }
    return true;
  });

  function statusBadge(status?: string) {
    if (!status) return { label: 'No License', cls: 'bg-slate-500/20 text-slate-400' };
    if (status === 'ACTIVE') return { label: 'Aktif', cls: 'bg-green-500/20 text-green-400' };
    if (status === 'EXPIRED') return { label: 'Expired', cls: 'bg-red-500/20 text-red-400' };
    if (status === 'SUSPENDED') return { label: 'Suspended', cls: 'bg-orange-500/20 text-orange-400' };
    return { label: status, cls: 'bg-yellow-500/20 text-yellow-400' };
  }

  function vpsBadge(status?: string) {
    if (!status) return null;
    if (status === 'ONLINE') return { label: 'Online', cls: 'bg-green-500/20 text-green-400' };
    if (status === 'OFFLINE') return { label: 'Offline', cls: 'bg-red-500/20 text-red-400' };
    return { label: status, cls: 'bg-yellow-500/20 text-yellow-400' };
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
          <p className="text-muted-foreground">{filtered.length} customer{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/admin/customers/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" /> Tambah Customer
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-1">
          {(['all', 'active', 'expired'] as FilterStatus[]).map((f) => (
            <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}>
              {f === 'all' ? 'Semua' : f === 'active' ? 'Aktif' : 'Expired'}
            </Button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, email, MT5..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-64 bg-background"
          />
        </div>
      </div>

      {/* Desktop Table */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium text-muted-foreground">Nama</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Email</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Lisensi</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Berakhir</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">VPS</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Login Terakhir</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Memuat data...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Tidak ada customer ditemukan</td></tr>
                ) : (
                  filtered.map((c) => {
                    const lBadge = statusBadge(c.license?.status);
                    const vBadge = c.vps ? vpsBadge(c.vps.status) : null;
                    return (
                      <tr key={c.user.id} className="border-b hover:bg-accent/50 transition-colors">
                        <td className="p-4 font-medium">{c.user.name || '-'}</td>
                        <td className="p-4">{c.user.email}</td>
                        <td className="p-4">
                          <span className={cn('px-2 py-1 rounded-full text-xs font-medium', lBadge.cls)}>
                            {lBadge.label}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground text-xs">
                          {c.license?.expiresAt
                            ? new Date(c.license.expiresAt).toLocaleDateString('id-ID')
                            : '-'}
                        </td>
                        <td className="p-4">
                          {c.vps ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs">{c.vps.name}</span>
                              {vBadge && (
                                <span className={cn('px-1.5 py-0.5 rounded text-xs', vBadge.cls)}>
                                  {vBadge.label}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-4 text-muted-foreground text-xs">
                          {c.user.lastLoginAt ? new Date(c.user.lastLoginAt).toLocaleDateString('id-ID') : 'Belum pernah'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <p className="text-muted-foreground text-sm text-center py-4">Memuat data...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Tidak ada customer ditemukan</div>
        ) : (
          filtered.map((c) => {
            const lBadge = statusBadge(c.license?.status);
            return (
              <Card key={c.user.id}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">{c.user.name || c.user.email}</p>
                      {c.user.name && <p className="text-xs text-muted-foreground">{c.user.email}</p>}
                    </div>
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', lBadge.cls)}>
                      {lBadge.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{c.vps ? c.vps.name : 'No VPS'}</span>
                    <span>
                      {c.license?.expiresAt
                        ? `Exp: ${new Date(c.license.expiresAt).toLocaleDateString('id-ID')}`
                        : ''}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
