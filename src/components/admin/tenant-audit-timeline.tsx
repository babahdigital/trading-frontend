'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-context';
import { ScrollText, RefreshCw, Sparkles, ShieldAlert, ArrowDownToLine, Pause, Play, ChevronDown, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Per-tenant audit timeline.
 *
 * Backend: GET /api/forex/admin/tenants/{id}/audit (Phase 14W pending).
 * Saat backend belum ship, render empty state + pending badge.
 *
 * Event types mapped ke icon + color:
 *   - tenant_suspended: red Pause
 *   - tenant_reactivated: emerald Play
 *   - tier_changed: amber ArrowDownToLine
 *   - engines_changed: blue Sparkles
 *   - kill_switch_triggered: red Zap
 *   - kill_switch_resolved: emerald ShieldAlert
 *   - whatsapp_addon_toggled: violet Sparkles
 *   - api_key_rotated: slate RefreshCw
 *   - (any other): default ScrollText
 */
interface AuditEntry {
  id?: string;
  actor: string;
  event_type: string;
  payload?: Record<string, unknown>;
  ts: string;
}

interface AuditResponse {
  source: 'backend' | 'pending' | 'unreachable';
  entries: AuditEntry[];
  total: number;
  next_cursor?: string | null;
  message?: string;
}

interface EventStyle {
  icon: LucideIcon;
  color: string;
  label: string;
}

const EVENT_STYLES: Record<string, EventStyle> = {
  tenant_suspended: { icon: Pause, color: 'text-rose-500 dark:text-rose-400', label: 'Suspended' },
  tenant_reactivated: { icon: Play, color: 'text-emerald-500 dark:text-emerald-400', label: 'Reactivated' },
  tier_changed: { icon: ArrowDownToLine, color: 'text-amber-600 dark:text-amber-400', label: 'Tier changed' },
  engines_changed: { icon: Sparkles, color: 'text-blue-500 dark:text-blue-300', label: 'Engines override' },
  kill_switch_triggered: { icon: Zap, color: 'text-rose-500 dark:text-rose-400', label: 'Kill-switch triggered' },
  kill_switch_resolved: { icon: ShieldAlert, color: 'text-emerald-500 dark:text-emerald-400', label: 'Kill-switch resolved' },
  whatsapp_addon_toggled: { icon: Sparkles, color: 'text-violet-500 dark:text-violet-300', label: 'WhatsApp addon' },
  api_key_rotated: { icon: RefreshCw, color: 'text-slate-500 dark:text-slate-400', label: 'API key rotated' },
};

const DEFAULT_STYLE: EventStyle = { icon: ScrollText, color: 'text-muted-foreground', label: 'Event' };

interface TenantAuditTimelineProps {
  tenantId: string;
  /** Locale untuk format tanggal */
  locale?: 'id' | 'en';
  /** Auto-refresh interval ms (default 30s). 0 = disable. */
  refreshMs?: number;
}

export function TenantAuditTimeline({ tenantId, locale = 'id', refreshMs = 30_000 }: TenantAuditTimelineProps) {
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAudit = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/admin/tenants/${encodeURIComponent(tenantId)}/audit?limit=50`, {
        headers: getAuthHeaders(),
        cache: 'no-store',
      });
      if (res.ok) {
        const body = (await res.json()) as AuditResponse;
        setData(body);
      }
    } catch {
      // graceful degrade
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAuthHeaders, tenantId]);

  useEffect(() => {
    fetchAudit();
    if (refreshMs > 0) {
      const interval = setInterval(fetchAudit, refreshMs);
      return () => clearInterval(interval);
    }
  }, [fetchAudit, refreshMs]);

  function formatTime(ts: string): string {
    try {
      const d = new Date(ts);
      return locale === 'id'
        ? d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
        : d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return ts;
    }
  }

  const isPending = data?.source === 'pending';
  const hasEntries = data && data.entries.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <ScrollText className="h-4 w-4 text-amber-500 dark:text-amber-400" />
            {locale === 'id' ? 'Audit trail tenant' : 'Tenant audit trail'}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={fetchAudit} disabled={loading || refreshing}>
            <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', refreshing && 'animate-spin')} />
            {locale === 'id' ? 'Refresh' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-md bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : isPending ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3 text-sm">
            <p className="font-medium text-amber-700 dark:text-amber-300 mb-1">
              {locale === 'id' ? 'Endpoint backend Phase 14W pending' : 'Backend endpoint Phase 14W pending'}
            </p>
            <p className="text-xs text-foreground/70">
              {locale === 'id'
                ? 'UI siap consume otomatis saat backend ship /api/forex/admin/tenants/{id}/audit. Sementara tampilkan placeholder ini.'
                : 'UI is ready to consume automatically when backend ships /api/forex/admin/tenants/{id}/audit. Showing placeholder for now.'}
            </p>
          </div>
        ) : !hasEntries ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <ChevronDown className="h-6 w-6 mx-auto mb-2 opacity-40" strokeWidth={1.5} />
            {locale === 'id' ? 'Belum ada aktivitas audit untuk tenant ini.' : 'No audit activity yet for this tenant.'}
          </div>
        ) : (
          <ol className="space-y-0">
            {data!.entries.map((entry, idx) => {
              const style = EVENT_STYLES[entry.event_type] || DEFAULT_STYLE;
              const Icon = style.icon;
              return (
                <li key={entry.id || idx} className="flex gap-3 py-3 border-b border-border/40 last:border-b-0">
                  <div className={cn('mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted shrink-0', style.color)}>
                    <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className={cn('text-sm font-medium', style.color)}>{style.label}</span>
                      <span className="text-xs text-muted-foreground font-mono">{entry.event_type}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{entry.actor}</span>
                    </div>
                    {entry.payload && Object.keys(entry.payload).length > 0 ? (
                      <details className="mt-1">
                        <summary className="text-xs text-foreground/60 cursor-pointer hover:text-foreground inline-flex items-center gap-1">
                          <ChevronDown className="h-3 w-3" strokeWidth={2} />
                          {locale === 'id' ? 'Detail payload' : 'Payload details'}
                        </summary>
                        <pre className="mt-2 text-[11px] bg-muted/40 rounded p-2 overflow-x-auto font-mono">
                          {JSON.stringify(entry.payload, null, 2)}
                        </pre>
                      </details>
                    ) : null}
                    <p className="text-[11px] text-muted-foreground mt-1">{formatTime(entry.ts)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
