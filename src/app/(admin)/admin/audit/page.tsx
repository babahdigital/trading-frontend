'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AuditEntry {
  id: string;
  createdAt: string;
  userId: string | null;
  action: string;
  licenseId: string | null;
  ipAddress: string | null;
}

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('access_token')}` };
}

const PAGE_SIZE = 50;

export default function AuditPage() {
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

      const res = await fetch(`/api/admin/audit?${params}`, { headers: authHeaders() });
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
  }, [page, actionFilter, userIdFilter]);

  useEffect(() => { fetchAudit(); }, [fetchAudit]);

  function applyFilters() {
    setPage(1);
    fetchAudit();
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Audit Log</h2>
        <p className="text-muted-foreground">Complete activity history</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Filter by action..."
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Filter by user ID..."
            value={userIdFilter}
            onChange={(e) => setUserIdFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          />
        </div>
        <Button onClick={applyFilters} variant="outline">Filter</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium text-muted-foreground">Timestamp</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">User ID</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Action</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">License ID</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Loading...</td></tr>
                ) : entries.length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No audit entries found.</td></tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry.id} className="border-b hover:bg-accent/50 transition-colors">
                      <td className="p-4 text-muted-foreground whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4 font-mono text-xs">{entry.userId || '-'}</td>
                      <td className="p-4 font-mono text-xs">{entry.action}</td>
                      <td className="p-4 font-mono text-xs">{entry.licenseId || '-'}</td>
                      <td className="p-4 text-muted-foreground">{entry.ipAddress || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-muted-foreground">Page {page}</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore || loading}
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
