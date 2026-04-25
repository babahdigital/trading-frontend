'use client';

import Link from 'next/link';
import { Info, AlertTriangle, AlertOctagon, ArrowUpRight, Wallet, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BackendNotification {
  id: string;
  occurred_at: string;
  channel: string;
  severity: 'info' | 'warning' | 'critical';
  locale: string;
  event_type: string;
  title: string;
  body: string;
  tags: {
    symbol?: string;
    side?: string;
    tenant_id?: string;
    position_id?: string;
    result?: 'profit' | 'loss';
  };
}

const SEVERITY_TONE: Record<BackendNotification['severity'], string> = {
  info: 'border-blue-500/30 bg-blue-500/5 text-blue-300',
  warning: 'border-amber-500/30 bg-amber-500/5 text-amber-300',
  critical: 'border-red-500/40 bg-red-500/10 text-red-300',
};

const SEVERITY_ICON_BG: Record<BackendNotification['severity'], string> = {
  info: 'bg-blue-500/15 text-blue-300',
  warning: 'bg-amber-500/15 text-amber-300',
  critical: 'bg-red-500/15 text-red-300',
};

const SEVERITY_ICON: Record<BackendNotification['severity'], typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertOctagon,
};

const RESULT_BADGE: Record<'profit' | 'loss', string> = {
  profit: 'bg-green-500/15 text-green-300 border-green-500/30',
  loss: 'bg-red-500/15 text-red-300 border-red-500/30',
};

function formatRelative(iso: string, locale: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return locale === 'id' ? 'baru saja' : 'just now';
  if (min < 60) return locale === 'id' ? `${min} menit lalu` : `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return locale === 'id' ? `${hr} jam lalu` : `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return locale === 'id' ? `${days} hari lalu` : `${days}d ago`;
}

export function NotificationCard({ notification }: { notification: BackendNotification }) {
  const tone = SEVERITY_TONE[notification.severity] ?? SEVERITY_TONE.info;
  const iconBg = SEVERITY_ICON_BG[notification.severity] ?? SEVERITY_ICON_BG.info;
  const Icon = SEVERITY_ICON[notification.severity] ?? Info;
  const positionId = notification.tags?.position_id;

  const Body = (
    <div className={cn('rounded-lg border p-3.5 transition-colors', tone)}>
      <div className="flex items-start gap-3">
        <span className={cn('inline-flex h-9 w-9 rounded-full items-center justify-center shrink-0', iconBg)}>
          <Icon className="h-4 w-4" />
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
            <p className="font-semibold text-sm leading-tight break-words">
              {notification.title}
            </p>
            <span className="text-[11px] font-mono text-muted-foreground/70 shrink-0">
              {formatRelative(notification.occurred_at, notification.locale)}
            </span>
          </div>

          {notification.body && (
            <p
              className="text-sm text-foreground/80 leading-relaxed mt-1.5"
              style={{ whiteSpace: 'pre-line' }}
            >
              {notification.body}
            </p>
          )}

          <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
            {notification.tags?.symbol && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-white/5 border border-white/10 text-muted-foreground">
                {notification.tags.symbol}
                {notification.tags.side && ` · ${notification.tags.side}`}
              </span>
            )}
            {notification.tags?.result && (
              <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-mono uppercase border', RESULT_BADGE[notification.tags.result])}>
                {notification.tags.result === 'profit'
                  ? <Wallet className="inline h-2.5 w-2.5 mr-0.5" />
                  : <ArrowUpRight className="inline h-2.5 w-2.5 mr-0.5 rotate-180" />}
                {notification.tags.result}
              </span>
            )}
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-white/5 border border-white/10 text-muted-foreground">
              {notification.event_type.replace(/_/g, ' ')}
            </span>
            {positionId && (
              <span className="ml-auto inline-flex items-center gap-0.5 text-[11px] font-medium text-amber-400">
                {notification.locale === 'id' ? 'Lihat posisi' : 'View position'}
                <ChevronRight className="h-3 w-3" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Wrap with deep-link only when position_id present
  if (positionId) {
    return (
      <Link
        href={`/portal/positions/${encodeURIComponent(positionId)}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
      >
        {Body}
      </Link>
    );
  }
  return Body;
}
