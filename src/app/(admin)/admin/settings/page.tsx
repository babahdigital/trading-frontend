'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-context';
import { RefreshCw, CheckCircle2, XCircle, AlertCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type Presence = 'configured' | 'missing';
type FlagState = 'on' | 'off';

interface SystemInfo {
  app: {
    name: string;
    version: string;
    node: string;
    platform: string;
    env: string;
    uptimeSeconds: number;
  };
  database: { ok: boolean; queryLatencyMs: number };
  flags: Record<string, FlagState>;
  secrets: Record<string, Presence>;
  sessions: { total: number; active: number };
  licenses: Record<string, number>;
  vps: Record<string, number>;
  blogTopics: Record<string, number>;
  workers: {
    recent: Array<{
      worker: string;
      status: string;
      startedAt: string;
      finishedAt: string | null;
      itemsProcessed: number;
      errorMessage: string | null;
    }>;
    summary: Array<{
      worker: string;
      runCount: number;
      lastStartedAt: string | null;
      lastFinishedAt: string | null;
    }>;
  };
  ai: {
    last7Days: Array<{
      purpose: string;
      calls: number;
      inputTokens: number;
      outputTokens: number;
    }>;
  };
  generatedAt: string;
}

function formatUptime(s: number): string {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-mono',
      ok ? 'bg-green-500/15 text-green-300 border border-green-500/30' : 'bg-red-500/15 text-red-300 border border-red-500/30',
    )}>
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label}
    </span>
  );
}

export default function SettingsPage() {
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInfo = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/admin/system-info', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">Memuat system info...</div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-8 text-red-400">
        Gagal memuat: {error ?? 'unknown'}
        <div className="mt-2">
          <Button size="sm" onClick={fetchInfo}>Coba lagi</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings & System</h2>
          <p className="text-muted-foreground">
            Observability snapshot — flags, secrets presence, worker health, AI usage.
          </p>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            Generated {new Date(data.generatedAt).toLocaleString('id-ID')}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchInfo} disabled={refreshing}>
          <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Row 1: App + DB */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Application</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1 font-mono">
            <div><span className="text-muted-foreground">Name:</span> {data.app.name}</div>
            <div><span className="text-muted-foreground">Version:</span> {data.app.version}</div>
            <div><span className="text-muted-foreground">Environment:</span> {data.app.env}</div>
            <div><span className="text-muted-foreground">Node:</span> {data.app.node}</div>
            <div><span className="text-muted-foreground">Platform:</span> {data.app.platform}</div>
            <div><span className="text-muted-foreground">Uptime:</span> {formatUptime(data.app.uptimeSeconds)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Database & Sessions</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">PostgreSQL:</span>
              <StatusPill ok={data.database.ok} label={`${data.database.queryLatencyMs}ms`} />
            </div>
            <div className="font-mono">
              <span className="text-muted-foreground">Active sessions:</span> {data.sessions.active} / {data.sessions.total}
            </div>
            <div className="pt-2">
              <Button size="sm" variant="outline" asChild>
                <Link href="/admin/audit" className="gap-1">Audit log <ExternalLink className="h-3 w-3" /></Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Feature flags */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Feature Flags</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 text-sm font-mono">
            {Object.entries(data.flags).map(([name, state]) => (
              <div key={name} className="flex items-center justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground text-xs">{name}</span>
                <StatusPill ok={state === 'on'} label={state.toUpperCase()} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Row 3: Secrets presence */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Secrets Presence</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Menampilkan hanya apakah env var ada — nilai tidak pernah dibaca atau ditampilkan.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 text-sm font-mono">
            {Object.entries(data.secrets).map(([name, presence]) => (
              <div key={name} className="flex items-center justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground text-xs">{name}</span>
                <StatusPill ok={presence === 'configured'} label={presence} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Row 4: Worker summary */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Background Workers (10 Run Terakhir)</CardTitle></CardHeader>
        <CardContent>
          {data.workers.recent.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-4">Belum ada WorkerRun tercatat.</div>
          ) : (
            <div className="space-y-1 text-xs font-mono">
              <div className="grid grid-cols-[1fr_100px_90px_100px_1fr] gap-2 border-b border-border pb-1 text-muted-foreground">
                <span>Worker</span>
                <span>Status</span>
                <span>Items</span>
                <span>Duration</span>
                <span>Error</span>
              </div>
              {data.workers.recent.map((w, idx) => {
                const duration = w.finishedAt
                  ? Math.round((new Date(w.finishedAt).getTime() - new Date(w.startedAt).getTime()) / 1000)
                  : null;
                const ok = w.status === 'OK';
                return (
                  <div key={idx} className="grid grid-cols-[1fr_100px_90px_100px_1fr] gap-2 py-1 border-b border-border/30">
                    <span>{w.worker}</span>
                    <span className={cn(ok ? 'text-green-300' : w.status === 'RUNNING' ? 'text-blue-300' : 'text-red-300')}>
                      {w.status}
                    </span>
                    <span>{w.itemsProcessed}</span>
                    <span>{duration !== null ? `${duration}s` : '—'}</span>
                    <span className="truncate text-red-300">{w.errorMessage ?? ''}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Row 5: AI usage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">OpenRouter AI Usage (7 Hari Terakhir)</CardTitle>
        </CardHeader>
        <CardContent>
          {data.ai.last7Days.length === 0 ? (
            <div className="text-sm text-muted-foreground">Belum ada AI call — mungkin OPENROUTER_API_KEY belum di-set atau worker belum dipicu.</div>
          ) : (
            <div className="space-y-1 text-sm font-mono">
              <div className="grid grid-cols-4 gap-2 border-b border-border pb-1 text-muted-foreground text-xs">
                <span>Purpose</span>
                <span>Calls</span>
                <span>Input Tokens</span>
                <span>Output Tokens</span>
              </div>
              {data.ai.last7Days.map((c, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-2 py-1">
                  <span>{c.purpose}</span>
                  <span>{c.calls.toLocaleString()}</span>
                  <span>{c.inputTokens.toLocaleString()}</span>
                  <span>{c.outputTokens.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Row 6: Business stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-lg">Licenses</CardTitle></CardHeader>
          <CardContent className="text-sm font-mono space-y-1">
            {Object.entries(data.licenses).length === 0 ? (
              <div className="text-muted-foreground">Tidak ada data.</div>
            ) : (
              Object.entries(data.licenses).map(([status, count]) => (
                <div key={status} className="flex justify-between">
                  <span className="text-muted-foreground">{status}</span>
                  <span>{count}</span>
                </div>
              ))
            )}
            <div className="pt-2">
              <Button size="sm" variant="outline" asChild>
                <Link href="/admin/licenses" className="gap-1">Manage <ExternalLink className="h-3 w-3" /></Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">VPS Fleet</CardTitle></CardHeader>
          <CardContent className="text-sm font-mono space-y-1">
            {Object.entries(data.vps).length === 0 ? (
              <div className="text-muted-foreground">Tidak ada VPS terdaftar.</div>
            ) : (
              Object.entries(data.vps).map(([status, count]) => (
                <div key={status} className="flex justify-between">
                  <span className="text-muted-foreground">{status}</span>
                  <span>{count}</span>
                </div>
              ))
            )}
            <div className="pt-2">
              <Button size="sm" variant="outline" asChild>
                <Link href="/admin/vps-fleet" className="gap-1">Fleet dashboard <ExternalLink className="h-3 w-3" /></Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Blog Topics (AI)</CardTitle></CardHeader>
          <CardContent className="text-sm font-mono space-y-1">
            {Object.entries(data.blogTopics).length === 0 ? (
              <div className="text-muted-foreground">
                <AlertCircle className="h-3 w-3 inline mr-1" />
                Belum di-seed. Trigger /api/cron/seed-blog-topics.
              </div>
            ) : (
              Object.entries(data.blogTopics).map(([status, count]) => (
                <div key={status} className="flex justify-between">
                  <span className="text-muted-foreground">{status}</span>
                  <span>{count}</span>
                </div>
              ))
            )}
            <div className="pt-2">
              <Button size="sm" variant="outline" asChild>
                <Link href="/admin/cms/blog-topics" className="gap-1">Manage <ExternalLink className="h-3 w-3" /></Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
