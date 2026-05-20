'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';
import { Plus, UserCheck } from 'lucide-react';
import { TenantActions } from '@/components/admin/tenant-actions';
import { PageHeader } from '@/components/admin/page-header';
import { FilterBar } from '@/components/admin/filter-bar';
import { EmptyState } from '@/components/admin/empty-state';
import { licenseStatusBadge, vpsStatusBadge } from '@/lib/admin/badges';
import { formatDate } from '@/lib/format-locale';

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
  const [searchInput, setSearchInput] = useState('');
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

  // fetchCustomers drives setState — intentional fetch on mount + refetch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchCustomers(); }, [fetchCustomers]);

  // Debounce search 400ms
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <PageHeader
        title="Customers"
        description={`${total} customer terdaftar`}
        actions={
          <Button asChild>
            <Link href="/admin/customers/new">
              <Plus className="h-4 w-4 mr-2" /> Tambah Customer
            </Link>
          </Button>
        }
      />

      <FilterBar
        className="mb-4"
        search={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Cari nama, email, MT5…"
        filters={[
          { value: 'all', label: 'Semua' },
          { value: 'ACTIVE', label: 'Aktif' },
          { value: 'EXPIRED', label: 'Kedaluwarsa' },
        ]}
        activeFilter={filter}
        onFilterChange={(v) => { setFilter(v as FilterStatus); setPage(1); }}
      />

      {/* Desktop Table */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div className="p-6">
              <EmptyState
                variant="inline"
                icon={UserCheck}
                title={search || filter !== 'all' ? 'Tidak ada customer cocok filter' : 'Belum ada customer'}
                description={search || filter !== 'all' ? 'Coba ubah filter atau pencarian.' : 'Tambahkan customer baru untuk mulai onboard.'}
                actions={!search && filter === 'all' ? [{ label: 'Tambah Customer', href: '/admin/customers/new', icon: Plus }] : []}
              />
            </div>
          ) : (
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
                    <th className="text-right p-4 font-medium text-muted-foreground">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => {
                    const lMeta = licenseStatusBadge(c.license?.status);
                    const vMeta = c.vps ? vpsStatusBadge(c.vps.status, c.vps.healthStatus) : null;
                    return (
                      <tr key={c.id} className="border-b hover:bg-accent/50 transition-colors">
                        <td className="p-4 font-medium">{c.name || '-'}</td>
                        <td className="p-4">{c.email}</td>
                        <td className="p-4">
                          <span className={cn('px-2 py-1 rounded-full text-xs font-medium', lMeta.cls)}>
                            {lMeta.label}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground text-xs">
                          {c.license?.expiresAt ? formatDate(c.license.expiresAt) : '-'}
                        </td>
                        <td className="p-4">
                          {c.vps ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs">{c.vps.name}</span>
                              {vMeta && (
                                <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', vMeta.cls)}>
                                  {vMeta.label}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-4 text-muted-foreground text-xs">
                          {c.lastLoginAt ? formatDate(c.lastLoginAt) : 'Belum pernah'}
                        </td>
                        <td className="p-4 text-right">
                          <TenantActions
                            tenantId={c.id}
                            isSuspended={c.license?.status === 'SUSPENDED'}
                            onMutated={() => fetchCustomers()}
                          />
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

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))
        ) : customers.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title={search || filter !== 'all' ? 'Tidak ada customer cocok' : 'Belum ada customer'}
            description={search || filter !== 'all' ? 'Coba ubah filter.' : 'Tambah customer untuk mulai.'}
            actions={!search && filter === 'all' ? [{ label: 'Tambah Customer', href: '/admin/customers/new', icon: Plus }] : []}
          />
        ) : (
          customers.map((c) => {
            const lMeta = licenseStatusBadge(c.license?.status);
            return (
              <Card key={c.id}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{c.name || c.email}</p>
                      {c.name && <p className="text-xs text-muted-foreground truncate">{c.email}</p>}
                    </div>
                    <span className={cn('shrink-0 px-2 py-1 rounded-full text-xs font-medium', lMeta.cls)}>
                      {lMeta.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{c.vps ? c.vps.name : 'Tanpa VPS'}</span>
                    <span>
                      {c.license?.expiresAt ? `Exp ${formatDate(c.license.expiresAt)}` : ''}
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
        <nav aria-label="Pagination" className="flex items-center justify-center gap-2 mt-6">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Sebelumnya
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">
            Halaman {page} dari {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Selanjutnya
          </Button>
        </nav>
      )}
    </div>
  );
}
