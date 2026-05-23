'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/empty-state';
import { formatDateTime, formatNumber } from '@/lib/format-locale';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth/auth-context';
import { RefreshCw, CheckCircle2, XCircle, AlertCircle, ExternalLink, Wrench } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LabeledSwitch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

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

// ---------- Maintenance Mode Card ----------

interface MaintenanceState {
  enabled: boolean;
  message?: string;
  estimatedEnd?: string;
}

function MaintenanceCard({ getAuthHeaders }: { getAuthHeaders: () => HeadersInit }) {
  const t = useTranslations('admin.settings');
  const tc = useTranslations('admin.common');
  const [state, setState] = useState<MaintenanceState>({ enabled: false });
  const [draft, setDraft] = useState<MaintenanceState>({ enabled: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/maintenance', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setState(data);
        setDraft(data);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [getAuthHeaders]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchState();
  }, [fetchState]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/admin/maintenance', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(draft),
      });
      if (res.ok) {
        const data = await res.json();
        setState(data);
        setDraft(data);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch { /* ignore */ }
    setSaving(false);
  }

  const hasChanges =
    draft.enabled !== state.enabled ||
    (draft.message ?? '') !== (state.message ?? '') ||
    (draft.estimatedEnd ?? '') !== (state.estimatedEnd ?? '');

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-24 rounded bg-muted animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      'border-2 transition-colors',
      draft.enabled ? 'border-amber-500/50 bg-amber-500/5' : 'border-border',
    )}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Wrench className="h-5 w-5 text-amber-400" />
          {t('maintenance_title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <LabeledSwitch
          label={t('maintenance_toggle')}
          description={t('maintenance_toggle_desc')}
          checked={draft.enabled}
          onCheckedChange={(checked) => setDraft({ ...draft, enabled: !!checked })}
        />

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            {t('maintenance_message_label')} <span className="text-muted-foreground font-normal">{t('maintenance_optional')}</span>
          </label>
          <Textarea
            value={draft.message ?? ''}
            onChange={(e) => setDraft({ ...draft, message: e.target.value })}
            placeholder={t('maintenance_message_placeholder')}
            rows={3}
            className="text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            {t('maintenance_end_label')} <span className="text-muted-foreground font-normal">{t('maintenance_optional')}</span>
          </label>
          <Input
            type="datetime-local"
            value={draft.estimatedEnd ?? ''}
            onChange={(e) => setDraft({ ...draft, estimatedEnd: e.target.value })}
            className="text-sm font-mono max-w-xs"
          />
        </div>

        {draft.enabled && (
          <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-3">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {t('maintenance_warning')}
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            variant={draft.enabled ? 'destructive' : 'default'}
            size="sm"
          >
            {saving ? t('maintenance_saved') + '...' : draft.enabled ? t('maintenance_btn_activate') : tc('save')}
          </Button>
          {saved && (
            <span className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              {t('maintenance_saved')}
            </span>
          )}
          {state.enabled && (
            <span className="text-xs text-amber-600 dark:text-amber-400 font-mono">
              {t('maintenance_active_badge')}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Status Pill ----------

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-mono',
      ok
        ? 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-500/30'
        : 'bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-500/30',
    )}>
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label}
    </span>
  );
}

export default function SettingsPage() {
  const t = useTranslations('admin.settings');
  const tc = useTranslations('admin.common');
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
    // fetchInfo drives setState — intentional fetch on mount + refetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInfo();
  }, [fetchInfo]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('title')} description={t('loading_desc')} />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><div className="h-32 rounded bg-muted animate-pulse" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('title')} />
        <EmptyState
          variant="error"
          icon={AlertCircle}
          title={t('error_title')}
          description={error ?? 'unknown error'}
          actions={[{ label: t('btn_retry'), onClick: fetchInfo, icon: RefreshCw }]}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button size="sm" variant="outline" onClick={fetchInfo} disabled={refreshing}>
            <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
            {tc('refresh')}
          </Button>
        }
      />
      <p className="text-xs text-muted-foreground -mt-3 font-mono">
        Generated {formatDateTime(data.generatedAt)}
      </p>

      {/* Maintenance Mode */}
      <MaintenanceCard getAuthHeaders={getAuthHeaders} />

      {/* Row 1: App + DB */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">{t('app_title')}</CardTitle></CardHeader>
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
          <CardHeader><CardTitle className="text-lg">{t('db_title')}</CardTitle></CardHeader>
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
        <CardHeader><CardTitle className="text-lg">{t('flags_title')}</CardTitle></CardHeader>
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
          <CardTitle className="text-lg">{t('secrets_title')}</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {t('secrets_desc')}
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
        <CardHeader><CardTitle className="text-lg">{t('workers_title')}</CardTitle></CardHeader>
        <CardContent>
          {data.workers.recent.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-4">{t('workers_empty')}</div>
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
                    <span className={cn(
                      ok
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : w.status === 'RUNNING'
                          ? 'text-sky-700 dark:text-sky-300'
                          : 'text-rose-700 dark:text-rose-300'
                    )}>
                      {w.status}
                    </span>
                    <span>{w.itemsProcessed}</span>
                    <span>{duration !== null ? `${duration}s` : '—'}</span>
                    <span className="truncate text-rose-700 dark:text-rose-300">{w.errorMessage ?? ''}</span>
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
          <CardTitle className="text-lg">{t('ai_title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.ai.last7Days.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t('ai_empty')}</div>
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
                  <span>{formatNumber(c.calls)}</span>
                  <span>{formatNumber(c.inputTokens)}</span>
                  <span>{formatNumber(c.outputTokens)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Row 6: Business stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-lg">{t('licenses_title')}</CardTitle></CardHeader>
          <CardContent className="text-sm font-mono space-y-1">
            {Object.entries(data.licenses).length === 0 ? (
              <div className="text-muted-foreground">{tc('no_data')}</div>
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
          <CardHeader><CardTitle className="text-lg">{t('vps_title')}</CardTitle></CardHeader>
          <CardContent className="text-sm font-mono space-y-1">
            {Object.entries(data.vps).length === 0 ? (
              <div className="text-muted-foreground">{t('vps_empty')}</div>
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
          <CardHeader><CardTitle className="text-lg">{t('blog_title')}</CardTitle></CardHeader>
          <CardContent className="text-sm font-mono space-y-1">
            {Object.entries(data.blogTopics).length === 0 ? (
              <div className="text-muted-foreground">
                <AlertCircle className="h-3 w-3 inline mr-1" />
                {t('blog_empty')}
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
