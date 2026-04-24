'use client';

import { useEffect, useState } from 'react';
import { Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import { rateLimitBus, type RateLimitInfo } from '@/lib/api/rate-limit-bus';

/**
 * Rate limit status indicator per FRONTEND_DEVELOPMENT_GUIDE §5.5.
 *
 * Subscribes to `rateLimitBus` events emitted by API client wrappers.
 * Displays remaining quota + countdown to window reset. Color shifts
 * to warning at <20% and danger at <5%.
 */
export interface RateLimitStatusProps {
  /** Filter to a specific API scope (optional) */
  scope?: string;
  /** Compact badge vs full text */
  compact?: boolean;
  className?: string;
}

export function RateLimitStatus({ scope, compact = false, className }: RateLimitStatusProps) {
  const [info, setInfo] = useState<RateLimitInfo | null>(() => {
    const last = rateLimitBus.snapshot();
    return last && (!scope || last.scope === scope) ? last : null;
  });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const unsubscribe = rateLimitBus.on((next) => {
      if (scope && next.scope !== scope) return;
      setInfo(next);
    });
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      unsubscribe();
      clearInterval(tick);
    };
  }, [scope]);

  if (!info) return null;

  const ratio = info.limit > 0 ? info.remaining / info.limit : 1;
  const resetSecondsLeft = Math.max(0, Math.ceil((info.resetAtMs - now) / 1000));
  const resetLabel =
    resetSecondsLeft <= 0
      ? 'reset pending'
      : resetSecondsLeft < 60
        ? `reset ${resetSecondsLeft}s`
        : `reset ${Math.floor(resetSecondsLeft / 60)}m ${resetSecondsLeft % 60}s`;

  const tone =
    ratio < 0.05
      ? 'text-red-300 border-red-500/40 bg-red-500/10'
      : ratio < 0.2
        ? 'text-amber-200 border-amber-500/40 bg-amber-500/10'
        : 'text-muted-foreground border-border bg-muted/40';

  if (compact) {
    return (
      <span
        data-testid="rate-limit-status-compact"
        className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-xs border', tone, className)}
      >
        <Gauge className="h-3 w-3" aria-hidden />
        {info.remaining}/{info.limit}
      </span>
    );
  }

  return (
    <div
      data-testid="rate-limit-status"
      role="status"
      aria-label={`API quota: ${info.remaining} of ${info.limit} remaining`}
      className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-md font-mono text-xs border', tone, className)}
    >
      <Gauge className="h-4 w-4" aria-hidden />
      <span className="font-semibold">
        {info.remaining.toLocaleString()} / {info.limit.toLocaleString()}
      </span>
      <span className="text-xs opacity-75">· {resetLabel}</span>
    </div>
  );
}
