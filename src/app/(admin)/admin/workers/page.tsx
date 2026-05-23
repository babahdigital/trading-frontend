'use client';

import { useEffect, useState, useCallback } from 'react';
import { Cog, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/empty-state';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth/auth-context';
import { formatDateTime, formatRelative } from '@/lib/format-locale';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

interface WorkerSummary {
  worker: string;
  okCount: number;
  errorCount: number;
  runningCount: number;
  totalCount: number;
  errorRate: number;
  lastRun: {
    startedAt: string;
    finishedAt: string | null;
    status: string;
  } | null;
}

interface WorkerError {
  id: string;
  worker: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  errorMessage: string | null;
  itemsProcessed: number;
}

interface WorkersResponse {
  workers: WorkerSummary[];
  recentErrors: WorkerError[];
}

export default function AdminWorkersPage() {
  const t = useTranslations('admin.workers');
  const tc = useTranslations('admin.common');
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState<WorkersResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/workers', { headers: getAuthHeaders() });
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  // `load` callback drives setState — intentional fetch on mount + refetch
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  function getHealthTone(errorRate: number): { bg: string; text: string; label: string } {
    if (errorRate === 0) return { bg: 'border-emerald-500/30 bg-emerald-500/[0.03]', text: 'text-emerald-600 dark:text-emerald-400', label: t('health_healthy') };
    if (errorRate < 10) return { bg: 'border-amber-500/30 bg-amber-500/[0.03]', text: 'text-amber-600 dark:text-amber-400', label: t('health_warning') };
    return { bg: 'border-rose-500/30 bg-rose-500/[0.03]', text: 'text-rose-600 dark:text-rose-400', label: t('health_unhealthy') };
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('description')}
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()} aria-label={tc('refresh')}>
            <Icon icon={RefreshCw} size="sm" className="mr-1.5" />
            {tc('refresh')}
          </Button>
        }
      />

      {/* Worker Health Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-24 rounded bg-muted animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !data || data.workers.length === 0 ? (
        <EmptyState
          icon={Cog}
          title={t('empty_title')}
          description={t('empty_desc')}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.workers.map((w) => {
              const tone = getHealthTone(w.errorRate);
              return (
                <Card key={w.worker} className={cn('card-enterprise', tone.bg)}>
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <h3 className="font-semibold text-foreground text-sm">{w.worker}</h3>
                        <span className={cn('text-[10px] uppercase tracking-wider font-medium', tone.text)}>
                          {tone.label}
                        </span>
                      </div>
                      <span
                        className={cn(
                          'inline-flex h-7 w-7 items-center justify-center rounded-md',
                          w.errorRate === 0
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                            : w.errorRate < 10
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
                        )}
                        aria-hidden="true"
                      >
                        <Cog className="h-3.5 w-3.5" strokeWidth={2} />
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="font-mono text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                          {w.okCount}
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">OK</div>
                      </div>
                      <div>
                        <div className="font-mono text-lg font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                          {w.errorCount}
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Error</div>
                      </div>
                      <div>
                        <div className={cn('font-mono text-lg font-semibold tabular-nums', tone.text)}>
                          {w.errorRate.toFixed(1)}%
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Err Rate</div>
                      </div>
                    </div>

                    {w.runningCount > 0 && (
                      <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                        {t('currently_running', { count: w.runningCount })}
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-border/40 text-xs text-muted-foreground">
                      {w.lastRun ? (
                        <span>
                          Last run: {formatRelative(w.lastRun.startedAt)}
                          <span className={cn(
                            'ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                            w.lastRun.status === 'OK' || w.lastRun.status === 'SUCCESS'
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : w.lastRun.status === 'RUNNING'
                                ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                                : 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
                          )}>
                            {w.lastRun.status}
                          </span>
                        </span>
                      ) : (
                        <span>{t('no_runs')}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Recent Errors Table */}
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                {t('errors_title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.recentErrors.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    variant="inline"
                    icon={Cog}
                    title={t('errors_empty')}
                    description={t('errors_empty_desc')}
                    size="sm"
                  />
                </div>
              ) : (
                <div className="md:overflow-x-auto">
                  <table className="w-full text-sm table-responsive">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-medium text-muted-foreground">Worker</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Started</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">Items</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentErrors.map((err) => (
                        <tr key={err.id} className="border-b hover:bg-accent/50 transition-colors">
                          <td className="p-4 font-mono text-xs font-medium" data-label="Worker">{err.worker}</td>
                          <td className="p-4 text-muted-foreground whitespace-nowrap text-xs" data-label="Started">
                            {formatDateTime(err.startedAt)}
                          </td>
                          <td className="p-4" data-label="Status">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/15 text-rose-700 dark:text-rose-300">
                              {err.status}
                            </span>
                          </td>
                          <td className="p-4 text-right font-mono text-xs tabular-nums" data-label="Items">
                            {err.itemsProcessed}
                          </td>
                          <td className="p-4 text-xs text-rose-600 dark:text-rose-400 max-w-sm" data-label="Error">
                            <span className="line-clamp-2" title={err.errorMessage || undefined}>
                              {err.errorMessage || '-'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
