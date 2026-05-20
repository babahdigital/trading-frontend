'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, ScrollText } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/empty-state';
import { formatDateTime } from '@/lib/format-locale';

interface AuditEntry {
  id: string;
  createdAt: string;
  userId: string | null;
  action: string;
  licenseId: string | null;
  ipAddress: string | null;
}

const PAGE_SIZE = 50;

export default function AuditPage() {
  const { getAuthHeaders } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [actionFilter, setActionFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
      });
      if (actionFilter.trim()) params.set('action', actionFilter.trim());
      if (userIdFilter.trim()) params.set('userId', userIdFilter.trim());

      const res = await fetch(`/api/admin/audit?${params}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        const list = data.entries ?? data.logs ?? [];
        setEntries(list);
        setHasMore(list.length === PAGE_SIZE);
      }
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, actionFilter, userIdFilter]);

  // `fetchAudit` callback memicu setState (loading/data) — fetch on mount + refetch
  // saat dependencies berubah. Intentional, bukan render cascade.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchAudit(); }, [fetchAudit]);

  function applyFilters() {
    setPage(1);
    void fetchAudit();
  }

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Riwayat aktivitas lengkap untuk compliance + forensik."
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-[180px]">
          <Input
            type="search"
            placeholder="Filter berdasarkan action…"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            aria-label="Filter action"
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <Input
            type="search"
            placeholder="Filter berdasarkan user ID…"
            value={userIdFilter}
            onChange={(e) => setUserIdFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            aria-label="Filter user ID"
          />
        </div>
        <Button onClick={applyFilters} variant="outline">Terapkan</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="p-6">
              <EmptyState
                variant="inline"
                icon={ScrollText}
                title={actionFilter || userIdFilter ? 'Tidak ada audit entry cocok filter' : 'Belum ada aktivitas audit'}
                description={actionFilter || userIdFilter ? 'Coba ubah filter pencarian.' : 'Audit entry akan muncul saat sistem mencatat aktivitas user/admin.'}
                size="sm"
              />
            </div>
          ) : (
            <div className="md:overflow-x-auto">
              <table className="w-full text-sm table-responsive">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium text-muted-foreground">Waktu</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">User ID</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Action</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">License ID</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b hover:bg-accent/50 transition-colors">
                      <td className="p-4 text-muted-foreground whitespace-nowrap" data-label="Waktu">
                        {formatDateTime(entry.createdAt)}
                      </td>
                      <td className="p-4 font-mono text-xs" data-label="User ID">{entry.userId || '-'}</td>
                      <td className="p-4 font-mono text-xs" data-label="Action">{entry.action}</td>
                      <td className="p-4 font-mono text-xs" data-label="License ID">{entry.licenseId || '-'}</td>
                      <td className="p-4 text-muted-foreground" data-label="IP Address">{entry.ipAddress || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <nav aria-label="Pagination" className="flex items-center justify-between mt-4">
        <p className="text-sm text-muted-foreground tabular-nums">Halaman {page}</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Sebelumnya
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore || loading}
          >
            Selanjutnya <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </nav>
    </div>
  );
}
