'use client';

import { useEffect, useState, useCallback } from 'react';
import { Brain, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/page-header';
import { StatCard, StatCardGrid } from '@/components/admin/stat-card';
import { EmptyState } from '@/components/admin/empty-state';
import { useAuth } from '@/lib/auth/auth-context';
import { formatDateTime } from '@/lib/format-locale';
import { Icon } from '@/components/ui/icon';
import { Activity, CheckCircle, DollarSign, Zap } from 'lucide-react';

interface AiCallEntry {
  id: string;
  purpose: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}

interface AiCallSummary {
  totalCalls: number;
  successCount: number;
  successRate: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  costEstimate: number;
}

interface AiCallsResponse {
  entries: AiCallEntry[];
  total: number;
  summary: AiCallSummary;
  purposes: string[];
}

const PAGE_SIZE = 50;

export default function AdminAiCallsPage() {
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState<AiCallsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [purposeFilter, setPurposeFilter] = useState('');
  const [successFilter, setSuccessFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
      });
      if (purposeFilter) params.set('purpose', purposeFilter);
      if (successFilter) params.set('success', successFilter);

      const res = await fetch(`/api/admin/ai-calls?${params}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const json = (await res.json()) as AiCallsResponse;
        setData(json);
        setHasMore(json.entries.length === PAGE_SIZE);
      }
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, purposeFilter, successFilter]);

  // `load` callback drives setState — intentional fetch on mount + refetch
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  function applyFilters() {
    setPage(1);
    void load();
  }

  function formatTokens(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Monitoring"
        title="AI Call Log"
        description="Monitoring penggunaan AI — token, cost, success rate, latency."
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()} aria-label="Refresh">
            <Icon icon={RefreshCw} size="sm" className="mr-1.5" />
            Refresh
          </Button>
        }
      />

      {/* KPI cards */}
      <StatCardGrid columns={4}>
        <StatCard
          label="Total Calls"
          value={data ? data.summary.totalCalls.toLocaleString() : '-'}
          icon={Activity}
          iconTone="info"
          loading={loading}
        />
        <StatCard
          label="Success Rate"
          value={data ? `${data.summary.successRate.toFixed(1)}%` : '-'}
          icon={CheckCircle}
          iconTone={data && data.summary.successRate >= 95 ? 'success' : data && data.summary.successRate >= 80 ? 'warning' : 'danger'}
          loading={loading}
        />
        <StatCard
          label="Total Tokens"
          value={data ? formatTokens(data.summary.totalTokens) : '-'}
          sub={data ? `In: ${formatTokens(data.summary.totalInputTokens)} / Out: ${formatTokens(data.summary.totalOutputTokens)}` : undefined}
          icon={Zap}
          iconTone="accent"
          loading={loading}
        />
        <StatCard
          label="Cost Estimate"
          value={data ? `$${data.summary.costEstimate.toFixed(2)}` : '-'}
          sub="~$3/M input, ~$15/M output"
          icon={DollarSign}
          iconTone={data && data.summary.costEstimate > 50 ? 'danger' : 'success'}
          loading={loading}
        />
      </StatCardGrid>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-w-[200px]"
          value={purposeFilter}
          onChange={(e) => { setPurposeFilter(e.target.value); setPage(1); }}
        >
          <option value="">Semua purpose</option>
          {data?.purposes.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-w-[140px]"
          value={successFilter}
          onChange={(e) => { setSuccessFilter(e.target.value); setPage(1); }}
        >
          <option value="">Semua status</option>
          <option value="true">Success</option>
          <option value="false">Failed</option>
        </select>
        <Button onClick={applyFilters} variant="outline" size="sm">Terapkan</Button>
      </div>

      {/* Table */}
      <Card className="card-enterprise">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : !data || data.entries.length === 0 ? (
            <div className="p-6">
              <EmptyState
                variant="inline"
                icon={Brain}
                title={purposeFilter || successFilter ? 'Tidak ada AI call cocok filter' : 'Belum ada AI call log'}
                description={purposeFilter || successFilter ? 'Coba ubah filter pencarian.' : 'Log akan muncul saat sistem memanggil AI model.'}
                size="sm"
              />
            </div>
          ) : (
            <div className="md:overflow-x-auto">
              <table className="w-full text-sm table-responsive">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium text-muted-foreground">Purpose</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Model</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">Tokens In</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">Tokens Out</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">Latency</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((entry) => (
                    <tr key={entry.id} className="border-b hover:bg-accent/50 transition-colors">
                      <td className="p-4 font-mono text-xs" data-label="Purpose">{entry.purpose}</td>
                      <td className="p-4 font-mono text-xs text-muted-foreground" data-label="Model">{entry.model}</td>
                      <td className="p-4 text-right font-mono text-xs tabular-nums" data-label="Tokens In">
                        {entry.inputTokens.toLocaleString()}
                      </td>
                      <td className="p-4 text-right font-mono text-xs tabular-nums" data-label="Tokens Out">
                        {entry.outputTokens.toLocaleString()}
                      </td>
                      <td className="p-4 text-right font-mono text-xs tabular-nums" data-label="Latency">
                        {entry.latencyMs.toLocaleString()}ms
                      </td>
                      <td className="p-4" data-label="Status">
                        {entry.success ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                            OK
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/15 text-rose-700 dark:text-rose-300 cursor-help"
                            title={entry.errorMessage || 'Unknown error'}
                          >
                            FAIL
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground whitespace-nowrap" data-label="Created">
                        {formatDateTime(entry.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.entries.length > 0 && (
        <nav aria-label="Pagination" className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground tabular-nums">
            Halaman {page} &middot; {data.total.toLocaleString()} total
          </p>
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
      )}
    </div>
  );
}
