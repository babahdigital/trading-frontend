'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CmsPageHeader } from '@/components/cms/page-header';
import { useAuth } from '@/lib/auth/auth-context';
import { Search, Download } from 'lucide-react';

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  locale: string;
  source: 'FOOTER' | 'CHAT_LEAD' | 'CONTACT_FORM' | 'RESEARCH_INLINE' | 'EXIT_INTENT' | 'IMPORT';
  status: 'ACTIVE' | 'UNSUBSCRIBED' | 'BOUNCED';
  lastSentAt: string | null;
  createdAt: string;
}

const STATUSES: Subscriber['status'][] = ['ACTIVE', 'UNSUBSCRIBED', 'BOUNCED'];
const SOURCES: Subscriber['source'][] = ['FOOTER', 'CHAT_LEAD', 'CONTACT_FORM', 'RESEARCH_INLINE', 'EXIT_INTENT', 'IMPORT'];
const STATUS_COLORS: Record<Subscriber['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'default',
  UNSUBSCRIBED: 'secondary',
  BOUNCED: 'destructive',
};

interface CountsBundle {
  byStatus?: Record<string, number>;
  bySource?: Record<string, number>;
}

export default function CmsSubscribersPage() {
  const { getAuthHeaders } = useAuth();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [counts, setCounts] = useState<CountsBundle>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (sourceFilter) params.set('source', sourceFilter);
    if (debouncedSearch) params.set('q', debouncedSearch);
    params.set('limit', '100');
    const res = await fetch(`/api/admin/cms/subscribers?${params.toString()}`, { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      setSubscribers(data.subscribers);
      setTotal(data.total);
      setCounts(data.counts ?? {});
    }
    setLoading(false);
  }, [getAuthHeaders, statusFilter, sourceFilter, debouncedSearch]);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  async function setStatus(id: string, status: Subscriber['status']) {
    await fetch('/api/admin/cms/subscribers', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ id, status }),
    });
    fetchSubscribers();
  }

  async function downloadCsv() {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (sourceFilter) params.set('source', sourceFilter);
    if (debouncedSearch) params.set('q', debouncedSearch);
    params.set('format', 'csv');
    params.set('limit', '5000');
    const res = await fetch(`/api/admin/cms/subscribers?${params.toString()}`, { headers: getAuthHeaders() });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div>
        <CmsPageHeader
          title="Newsletter Subscribers"
          description="Daftar subscriber riset & update produk. Source membantu attribution kanal akuisisi."
        />
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span>
            Total: <span className="font-semibold text-foreground">{total}</span>
          </span>
          {STATUSES.map((s) => (
            <span key={s}>
              {s}: <span className="font-semibold text-foreground">{counts.byStatus?.[s] ?? 0}</span>
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
          {SOURCES.map((s) => (
            <span key={s}>
              {s}: <span className="font-semibold text-foreground">{counts.bySource?.[s] ?? 0}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Filters + export */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari email / nama…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Semua Status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Semua Source</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button onClick={downloadCsv} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Memuat...</div>
      ) : subscribers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
          Belum ada subscriber dengan filter ini.
        </div>
      ) : (
        <div className="space-y-2">
          {subscribers.map((sub) => (
            <Card key={sub.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold">{sub.email}</span>
                    <Badge variant={STATUS_COLORS[sub.status]}>{sub.status}</Badge>
                    <Badge variant="outline" className="text-xs">{sub.source}</Badge>
                    <span className="text-xs text-muted-foreground">{sub.locale.toUpperCase()}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {sub.name && <span>{sub.name}</span>}
                    {sub.phone && <span>{sub.phone}</span>}
                    {sub.lastSentAt && (
                      <span>· Last sent: {new Date(sub.lastSentAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(sub.createdAt).toLocaleDateString()}
                  </span>
                  {sub.status === 'ACTIVE' ? (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(sub.id, 'UNSUBSCRIBED')}>
                      Unsubscribe
                    </Button>
                  ) : sub.status === 'UNSUBSCRIBED' ? (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(sub.id, 'ACTIVE')}>
                      Reactivate
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
