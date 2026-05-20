/**
 * StatCard — KPI card primitive untuk admin/portal dashboards.
 *
 * Konsisten layout: icon top-right, label, value (mono large), sub-text,
 * optional trend pill + sparkline.
 *
 * Replace pattern lama `<Card><CardHeader>{title + icon}</CardHeader><CardContent>{value}</CardContent></Card>`
 * yang berulang 4-8x per dashboard page dengan inline styling berbeda.
 */
'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export interface StatCardProps {
  label: string;
  value: ReactNode;
  /** Optional second line below value (small, muted) */
  sub?: ReactNode;
  /** Top-right icon */
  icon?: LucideIcon;
  /** Optional color hint for icon — semantic, defaults muted */
  iconTone?: 'default' | 'accent' | 'success' | 'danger' | 'info' | 'warning';
  /** Signed percent for trend pill (e.g. +12.4, -3.2). null hides */
  trend?: number | null;
  /** Optional sparkline data points (rendered if length ≥ 2) */
  spark?: number[] | null;
  /** Loading skeleton */
  loading?: boolean;
  /** Make card full-height to fill grid row */
  fillHeight?: boolean;
  className?: string;
  /** Click handler — turns card into button */
  onClick?: () => void;
  /** Optional badge slot top-right next to icon (e.g. "Live", "Beta") */
  badge?: ReactNode;
}

const ICON_TONE_CLASS: Record<NonNullable<StatCardProps['iconTone']>, string> = {
  default: 'text-muted-foreground bg-muted',
  accent:  'text-amber-600 bg-amber-500/10 dark:text-amber-300 dark:bg-amber-500/15',
  success: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-300 dark:bg-emerald-500/15',
  danger:  'text-rose-600 bg-rose-500/10 dark:text-rose-300 dark:bg-rose-500/15',
  info:    'text-sky-600 bg-sky-500/10 dark:text-sky-300 dark:bg-sky-500/15',
  warning: 'text-amber-600 bg-amber-500/10 dark:text-amber-300 dark:bg-amber-500/15',
};

function TrendPill({ percent }: { percent: number }) {
  if (!Number.isFinite(percent)) return null;
  const up = percent >= 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none',
        up
          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
          : 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
      )}
      aria-label={`Trend ${up ? 'naik' : 'turun'} ${Math.abs(percent).toFixed(0)} persen`}
    >
      <Icon className="h-2.5 w-2.5" aria-hidden="true" />
      {up ? '+' : '-'}{Math.abs(percent).toFixed(0)}%
    </span>
  );
}

function MiniSpark({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((v - min) / range) * 100;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const color = positive ? 'rgb(16 185 129)' : 'rgb(244 63 94)';
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="mt-2 h-8 w-full"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconTone = 'default',
  trend,
  spark,
  loading,
  fillHeight,
  className,
  onClick,
  badge,
}: StatCardProps) {
  const isInteractive = Boolean(onClick);
  const Wrap = isInteractive ? 'button' : 'div';
  const hasTrend = trend != null && Number.isFinite(trend);

  return (
    <Card
      className={cn(
        fillHeight && 'h-full',
        isInteractive && 'cursor-pointer transition-colors hover:border-amber-500/40',
        className,
      )}
    >
      <Wrap
        type={isInteractive ? 'button' : undefined}
        onClick={onClick}
        className={cn(
          'block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          isInteractive && 'rounded-lg',
        )}
      >
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {badge}
              {Icon ? (
                <span
                  className={cn(
                    'inline-flex h-7 w-7 items-center justify-center rounded-md',
                    ICON_TONE_CLASS[iconTone],
                  )}
                  aria-hidden="true"
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
              ) : null}
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2 flex-wrap">
            {loading ? (
              <div className="h-7 w-20 rounded bg-muted animate-pulse" />
            ) : (
              <div className="font-mono text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                {value}
              </div>
            )}
            {!loading && hasTrend ? <TrendPill percent={trend as number} /> : null}
          </div>
          {sub ? (
            <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
          ) : null}
          {!loading && spark && spark.length >= 2 ? (
            <MiniSpark data={spark} positive={(trend ?? 0) >= 0} />
          ) : null}
        </CardContent>
      </Wrap>
    </Card>
  );
}

/** Grid wrapper with sensible defaults (2/4 column) for KPI rows. */
export function StatCardGrid({
  children,
  columns = 4,
  className,
}: {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid gap-3 sm:gap-4',
        columns === 2 && 'grid-cols-2',
        columns === 3 && 'grid-cols-2 lg:grid-cols-3',
        columns === 4 && 'grid-cols-2 lg:grid-cols-4',
        className,
      )}
    >
      {children}
    </div>
  );
}
