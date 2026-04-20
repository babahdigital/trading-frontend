'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';
import { Plus, Search } from 'lucide-react';

interface Customer {
  id: string;
  email: string;
  name: string | null;
  mt5Account: string | null;
  lastLoginAt: string | null;
  license: {
    id: string;
    licenseKey: string;
    status: string;
    type: string;
    expiresAt: string | null;
  } | null;
  vps: {
    id: string;
    name: string;
    status: string;
    healthStatus: string | null;
  } | null;
}

type FilterStatus = 'all' | 'ACTIVE' | 'EXPIRED';

export default function CustomersPage() {
  const { getAuthHeaders } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filter !== 'all') params.set('status', filter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/customers?${params}`, { headers: getAuthHeaders() });
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
        setTotal(data.total || 0);
      }
    } catch { /* handled */ }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filter, search]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  // Debounce search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  function statusBadge(status?: string) {
    if (!status) return { label: 'Tanpa Lisensi', cls: 'bg-slate-500/20 text-slate-400' };
    if (status === 'ACTIVE') return { label: 'Aktif', cls: 'bg-green-500/20 text-green-400' };
    if (status === 'EXPIRED') return { label: 'Kedaluwarsa', cls: 'bg-red-500/20 text-red-400' };
    if (status === 'SUSPENDED') return { label: 'Ditangguhkan', cls: 'bg-orange-500/20 text-orange-400' };
    return { label: status, cls: 'bg-yellow-500/20 text-yellow-400' };
  }

  function vpsBadge(status?: string) {
    if (!status) return null;
    if (status === 'ONLINE') return { label: 'Online', cls: 'bg-green-500/20 text-green-400' };
    if (status === 'OFFLINE') return { label: 'Offline', cls: 'bg-red-500/20 text-red-400' };
    return { label: status, cls: 'bg-yellow-500/20 text-yellow-400' };
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
          <p className="text-muted-foreground">{total} customer terdaftar</p>
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
          {([['all', 'Semua'], ['ACTIVE', 'Aktif'], ['EXPIRED', 'Kedaluwarsa']] as [FilterStatus, string][]).map(([f, label]) => (
            <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => { setFilter(f); setPage(1); }}>
              {label}
            </Button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, email, MT5..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
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
                ) : customers.length === 0 ? (
                  <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Tidak ada customer ditemukan</td></tr>
                ) : (
                  customers.map((c) => {
                    const lBadge = statusBadge(c.license?.status);
                    const vBadge = c.vps ? vpsBadge(c.vps.status) : null;
                    return (
                      <tr key={c.id} className="border-b hover:bg-accent/50 transition-colors">
                        <td className="p-4 font-medium">{c.name || '-'}</td>
                        <td className="p-4">{c.email}</td>
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
                          {c.lastLoginAt ? new Date(c.lastLoginAt).toLocaleDateString('id-ID') : 'Belum pernah'}
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
        ) : customers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Tidak ada customer ditemukan</div>
        ) : (
          customers.map((c) => {
            const lBadge = statusBadge(c.license?.status);
            return (
              <Card key={c.id}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">{c.name || c.email}</p>
                      {c.name && <p className="text-xs text-muted-foreground">{c.email}</p>}
                    </div>
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', lBadge.cls)}>
                      {lBadge.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{c.vps ? c.vps.name : 'Tanpa VPS'}</span>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Sebelumnya
          </Button>
          <span className="text-sm text-muted-foreground">
            Halaman {page} dari {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Selanjutnya
          </Button>
        </div>
      )}
    </div>
  );
}
