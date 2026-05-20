'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Bell, RefreshCw, Inbox, Settings } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { NotificationCard, type BackendNotification } from '@/components/notifications/notification-card';
import { NotificationChannelPrefs } from '@/components/portal/notification-channel-prefs';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/empty-state';

interface RecentResponse {
  source?: 'backend' | 'local-fallback';
  items?: BackendNotification[];
  count?: number;
  next_cursor?: string | null;
}

const SEVERITY_FILTERS = [
  { id: 'all', labelKey: 'filter_severity_all' },
  { id: 'info', labelKey: 'filter_severity_info' },
  { id: 'warning', labelKey: 'filter_severity_warning' },
  { id: 'critical', labelKey: 'filter_severity_critical' },
] as const;

const CHANNEL_FILTERS = [
  { id: 'all', labelKey: 'filter_channel_all' },
  { id: 'WHATSAPP', labelKey: 'filter_channel_whatsapp' },
  { id: 'TELEGRAM', labelKey: 'filter_channel_telegram' },
  { id: 'EMAIL', labelKey: 'filter_channel_email' },
  { id: 'INAPP', labelKey: 'filter_channel_inapp' },
] as const;

type SeverityFilter = (typeof SEVERITY_FILTERS)[number]['id'];
type ChannelFilter = (typeof CHANNEL_FILTERS)[number]['id'];

function matchesChannel(notif: BackendNotification, filter: ChannelFilter): boolean {
  if (filter === 'all') return true;
  return notif.channel.toUpperCase() === filter;
}

export default function NotificationsPage() {
  const t = useTranslations('portal.notifications');
  const tShared = useTranslations('portal.shared');
  const { getAuthHeaders } = useAuth();
  const [items, setItems] = useState<BackendNotification[]>([]);
  const [source, setSource] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<SeverityFilter>('all');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/client/notifications/recent?limit=100', { headers: getAuthHeaders() });
      if (res.ok) {
        const body = (await res.json()) as RecentResponse;
        setItems(body.items ?? []);
        setSource(body.source ?? '');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    // load drives setState — fetch on mount + 30s polling untuk live notifications.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const tm = setInterval(load, 30_000);
    return () => clearInterval(tm);
  }, [load]);

  const filtered = items.filter((n) => {
    if (filter !== 'all' && n.severity !== filter) return false;
    if (!matchesChannel(n, channelFilter)) return false;
    return true;
  });

  return (
    <div className="portal-page-stack max-w-3xl">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <Bell className="h-6 w-6 sm:h-7 sm:w-7 text-amber-600 dark:text-amber-400" />
            {t('title')}
          </span>
        }
        description={t('subtitle')}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {source === 'local-fallback' && (
              <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300">
                {tShared('local_fallback_badge')}
              </span>
            )}
            <Button size="sm" variant="outline" asChild>
              <Link href="/portal/account#notifications">
                <Settings className="h-4 w-4 mr-2" /> {t('preferences_button')}
              </Link>
            </Button>
            <Button size="sm" variant="outline" onClick={load} disabled={refreshing}>
              <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} /> {tShared('refresh')}
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="inline-flex rounded-md border border-border bg-card p-0.5 text-xs">
          {SEVERITY_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'px-3 py-1.5 rounded font-mono uppercase transition-colors',
                filter === f.id ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'text-muted-foreground hover:text-foreground',
              )}
              aria-pressed={filter === f.id}
            >
              {t(f.labelKey)}
              {filter === f.id && f.id !== 'all' && (
                <span className="ml-1.5 text-[10px] opacity-70">
                  ({items.filter((n) => n.severity === f.id).length})
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-md border border-border bg-card p-0.5 text-xs">
          {CHANNEL_FILTERS.map((c) => (
            <button
              key={c.id}
              onClick={() => setChannelFilter(c.id)}
              className={cn(
                'px-3 py-1.5 rounded font-mono uppercase transition-colors',
                channelFilter === c.id ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground hover:text-foreground',
              )}
              aria-pressed={channelFilter === c.id}
            >
              {t(c.labelKey)}
              {channelFilter === c.id && c.id !== 'all' && (
                <span className="ml-1.5 text-[10px] opacity-70">
                  ({items.filter((n) => matchesChannel(n, c.id)).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <NotificationChannelPrefs />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={filter === 'all' ? t('empty_all') : t('empty_filtered', { severity: filter })}
          description={t('empty_hint')}
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((n) => (
            <NotificationCard key={n.id} notification={n} />
          ))}
        </div>
      )}
    </div>
  );
}
