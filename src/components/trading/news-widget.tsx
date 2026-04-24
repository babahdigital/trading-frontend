'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Newspaper, TrendingDown, TrendingUp, Minus, AlertTriangle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatInTimezone } from '@/lib/timezone/util';

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  expectedImpact: 'low' | 'medium' | 'high';
  expectedImpactMinutes: number | null;
  publishedAt: string;
  source: string;
  url: string | null;
  tickers: string[];
}

export interface NewsWidgetProps {
  /** Filter news by pair (optional) */
  pair?: string;
  /** Filter by minimum impact level */
  minImpact?: 'low' | 'medium' | 'high';
  /** Max items to show */
  limit?: number;
  /** Auto-refresh interval in ms (default 60000 = 1 min) */
  refreshMs?: number;
  /** Compact layout (for sidebars) */
  compact?: boolean;
  className?: string;
}

const SENTIMENT_ICON = {
  BULLISH: TrendingUp,
  BEARISH: TrendingDown,
  NEUTRAL: Minus,
} as const;

const SENTIMENT_COLOR = {
  BULLISH: 'text-green-400 bg-green-500/10 border-green-500/30',
  BEARISH: 'text-red-400 bg-red-500/10 border-red-500/30',
  NEUTRAL: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
} as const;

const IMPACT_ORDER: Record<string, number> = { low: 0, medium: 1, high: 2 };
const IMPACT_COLOR = {
  low: 'text-slate-400',
  medium: 'text-amber-400',
  high: 'text-red-400',
} as const;

/**
 * News feed widget per FRONTEND_DEVELOPMENT_GUIDE §5.4.
 *
 * Polls /api/client/news every `refreshMs` (default 60s). Shows item
 * title, summary, sentiment, impact, source, and timestamp formatted
 * in user's effective timezone.
 */
export function NewsWidget({
  pair,
  minImpact,
  limit = 10,
  refreshMs = 60_000,
  compact = false,
  className,
}: NewsWidgetProps) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'backend' | 'empty'>('empty');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const ac = new AbortController();

    async function load() {
      const qs = new URLSearchParams();
      qs.set('limit', String(limit));
      if (pair) qs.set('pair', pair);
      try {
        const res = await fetch(`/api/client/news?${qs}`, { signal: ac.signal, credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as { source: 'backend' | 'empty'; items: NewsItem[] };
        if (!alive) return;
        const filtered = minImpact
          ? body.items.filter((i) => IMPACT_ORDER[i.expectedImpact] >= IMPACT_ORDER[minImpact])
          : body.items;
        setItems(filtered);
        setSource(body.source);
        setError(null);
      } catch (err) {
        if (!alive || (err as { name?: string }).name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'unknown');
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, refreshMs);
    return () => {
      alive = false;
      ac.abort();
      clearInterval(interval);
    };
  }, [pair, minImpact, limit, refreshMs]);

  if (loading && items.length === 0) {
    return (
      <div className={cn('flex items-center justify-center p-6 text-sm text-muted-foreground', className)}>
        <Newspaper className="h-4 w-4 mr-2 animate-pulse" />
        Memuat feed berita...
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className={cn('flex items-center gap-2 p-3 text-sm text-red-400 bg-red-500/5 rounded-md border border-red-500/20', className)}>
        <AlertTriangle className="h-4 w-4" />
        <span>Gagal memuat berita: {error}</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={cn('text-center p-6 text-sm text-muted-foreground border border-dashed border-border rounded-md', className)}>
        <Newspaper className="h-6 w-6 mx-auto mb-2 opacity-50" />
        {source === 'empty'
          ? 'Belum ada berita dari backend news pipeline. Worker news_ingest_loop perlu diaktifkan.'
          : 'Tidak ada berita relevan saat ini.'}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item) => {
        const Icon = SENTIMENT_ICON[item.sentiment];
        return (
          <div
            key={item.id}
            className={cn(
              'rounded-md border border-border bg-background p-3 hover:border-primary/40 transition-colors',
              compact && 'p-2',
            )}
          >
            <div className="flex items-start gap-2">
              <span
                className={cn(
                  'inline-flex items-center justify-center rounded-full border w-7 h-7 shrink-0',
                  SENTIMENT_COLOR[item.sentiment],
                )}
                aria-label={`Sentiment ${item.sentiment.toLowerCase()}`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <h4 className={cn('font-semibold', compact ? 'text-sm' : 'text-base')}>{item.title}</h4>
                  {item.url && (
                    <Link href={item.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
                {!compact && item.summary && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.summary}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono flex-wrap">
                  <span className={cn('uppercase tracking-wide', IMPACT_COLOR[item.expectedImpact])}>
                    {item.expectedImpact} impact
                  </span>
                  {item.tickers.length > 0 && (
                    <span className="text-muted-foreground">{item.tickers.join(', ')}</span>
                  )}
                  <span className="text-muted-foreground ml-auto">
                    {formatInTimezone(new Date(item.publishedAt), { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
                {!compact && <div className="text-[10px] text-muted-foreground mt-0.5">{item.source}</div>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
