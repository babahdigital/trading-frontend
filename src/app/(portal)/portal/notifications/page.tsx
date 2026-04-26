'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bell, RefreshCw, Inbox, Settings } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { NotificationCard, type BackendNotification } from '@/components/notifications/notification-card';
import { cn } from '@/lib/utils';

interface RecentResponse {
  source?: 'backend' | 'local-fallback';
  items?: BackendNotification[];
  count?: number;
  next_cursor?: string | null;
}

const SEVERITY_FILTERS = [
  { id: 'all', label: 'Semua' },
  { id: 'info', label: 'Info' },
  { id: 'warning', label: 'Warning' },
  { id: 'critical', label: 'Critical' },
] as const;

const CHANNEL_FILTERS = [
  { id: 'all', label: 'Semua' },
  { id: 'WHATSAPP', label: 'WhatsApp' },
  { id: 'TELEGRAM', label: 'Telegram' },
  { id: 'EMAIL', label: 'Email' },
  { id: 'INAPP', label: 'In-App' },
] as const;

type SeverityFilter = (typeof SEVERITY_FILTERS)[number]['id'];
type ChannelFilter = (typeof CHANNEL_FILTERS)[number]['id'];

function matchesChannel(notif: BackendNotification, filter: ChannelFilter): boolean {
  if (filter === 'all') return true;
  return notif.channel.toUpperCase() === filter;
}

export default function NotificationsPage() {
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
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const filtered = items.filter((n) => {
    if (filter !== 'all' && n.severity !== filter) return false;
    if (!matchesChannel(n, channelFilter)) return false;
    return true;
  });

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Bell className="h-6 w-6 sm:h-7 sm:w-7 text-amber-400" />
            Notifikasi
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm sm:text-base">
            Event dari trading bot — open/close posisi, kill switch, margin call. Auto-refresh tiap 30 detik.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {source === 'local-fallback' && (
            <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-amber-500/10 border border-amber-500/30 text-amber-300">
              local fallback
            </span>
          )}
          <Button size="sm" variant="outline" asChild>
            <Link href="/portal/account#notifications">
              <Settings className="h-4 w-4 mr-2" /> Preferensi
            </Link>
          </Button>
          <Button size="sm" variant="outline" onClick={load} disabled={refreshing}>
            <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} /> Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="inline-flex rounded-md border border-white/10 bg-card p-0.5 text-xs">
          {SEVERITY_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'px-3 py-1.5 rounded font-mono uppercase transition-colors',
                filter === f.id ? 'bg-amber-500/15 text-amber-300' : 'text-muted-foreground hover:text-foreground',
              )}
              aria-pressed={filter === f.id}
            >
              {f.label}
              {filter === f.id && f.id !== 'all' && (
                <span className="ml-1.5 text-[10px] opacity-70">
                  ({items.filter((n) => n.severity === f.id).length})
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-md border border-white/10 bg-card p-0.5 text-xs">
          {CHANNEL_FILTERS.map((c) => (
            <button
              key={c.id}
              onClick={() => setChannelFilter(c.id)}
              className={cn(
                'px-3 py-1.5 rounded font-mono uppercase transition-colors',
                channelFilter === c.id ? 'bg-emerald-500/15 text-emerald-300' : 'text-muted-foreground hover:text-foreground',
              )}
              aria-pressed={channelFilter === c.id}
            >
              {c.label}
              {channelFilter === c.id && c.id !== 'all' && (
                <span className="ml-1.5 text-[10px] opacity-70">
                  ({items.filter((n) => matchesChannel(n, c.id)).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-lg bg-white/5 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground space-y-3">
            <Inbox className="h-10 w-10 mx-auto opacity-40" />
            <p className="font-medium">{filter === 'all' ? 'Belum ada notifikasi' : `Tidak ada notifikasi dengan severity ${filter}`}</p>
            <p className="text-xs">
              Notifikasi muncul saat bot membuka/menutup posisi atau memicu safeguard. Cek preferensi untuk
              mengontrol kanal pengiriman (Telegram, email, in-app).
            </p>
          </CardContent>
        </Card>
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
