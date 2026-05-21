'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ShieldCheck, FileSearch, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/admin/page-header';
import { FilterBar } from '@/components/admin/filter-bar';
import { EmptyState } from '@/components/admin/empty-state';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';
import { kycStatusBadge } from '@/lib/admin/badges';
import { formatDateTime } from '@/lib/format-locale';

interface KycRow {
  id: string;
  userId: string;
  status: string;
  fullName: string | null;
  documentType: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  user: { email: string };
}

type FilterStatus = 'all' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'ADDITIONAL_INFO_REQUIRED';

export default function AdminKycPage() {
  const { getAuthHeaders } = useAuth();
  const [items, setItems] = useState<KycRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('PENDING_REVIEW');

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filter !== 'all') params.set('status', filter);
      const res = await fetch(`/api/admin/kyc?${params}`, { headers: getAuthHeaders() });
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
      }
    } catch {
      // handled via empty state
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, filter]);

  useEffect(() => {
    void fetchQueue();
  }, [fetchQueue]);

  const pendingCount = items.filter((i) => i.status === 'PENDING_REVIEW').length;

  return (
    <div>
      <PageHeader
        title="KYC Review Queue"
        description={`${items.length} entry · ${pendingCount} menunggu review`}
        actions={
          <Button variant="outline" size="sm" onClick={() => void fetchQueue()}>
            <Clock className="w-4 h-4 mr-1.5" /> Refresh
          </Button>
        }
      />

      <FilterBar
        className="mb-4"
        searchVisible={false}
        filters={[
          { value: 'PENDING_REVIEW', label: 'Menunggu review' },
          { value: 'ADDITIONAL_INFO_REQUIRED', label: 'Info tambahan' },
          { value: 'APPROVED', label: 'Disetujui' },
          { value: 'REJECTED', label: 'Ditolak' },
          { value: 'all', label: 'Semua' },
        ]}
        activeFilter={filter}
        onFilterChange={(v) => setFilter(v as FilterStatus)}
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-6">
              <EmptyState
                variant="inline"
                icon={ShieldCheck}
                title={filter === 'PENDING_REVIEW' ? 'Queue kosong — semua KYC sudah direview' : 'Tidak ada entry untuk filter ini'}
                description={filter === 'PENDING_REVIEW' ? 'Bagus! Tidak ada KYC yang menunggu.' : 'Coba ubah filter di atas.'}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium text-muted-foreground">Nama</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Email</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Dokumen</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Diajukan</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => {
                    const meta = kycStatusBadge(row.status);
                    return (
                      <tr key={row.id} className="border-b hover:bg-accent/50 transition-colors">
                        <td className="p-4 font-medium">{row.fullName ?? '—'}</td>
                        <td className="p-4 text-muted-foreground">{row.user.email}</td>
                        <td className="p-4 font-mono text-xs uppercase">{row.documentType ?? '—'}</td>
                        <td className="p-4">
                          <span className={cn('px-2 py-1 rounded-full text-xs font-medium', meta.cls)}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground text-xs">
                          {row.submittedAt ? formatDateTime(row.submittedAt) : '—'}
                        </td>
                        <td className="p-4 text-right">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/kyc/${row.id}`}>
                              <FileSearch className="w-4 h-4 mr-1.5" /> Review
                            </Link>
                          </Button>
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
