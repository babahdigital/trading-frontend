/**
 * Shared empty state untuk chart components.
 *
 * Render saat data array kosong/null. Konsisten visual + a11y across:
 * - EquityCurve, PnlBarChart, CumulativePnl, WinRateBar, StrategyDonut,
 *   HourlyHeatmap, ScannerHeatmap, MonthlyCalendar.
 *
 * locale optional — default 'id'. Kalau component caller punya translations
 * own, override via `title` + `hint` props.
 */
import { LucideIcon, LineChart as LineChartIcon } from 'lucide-react';

interface ChartEmptyStateProps {
  /** Tinggi container — match height chart yang seharusnya tampil. */
  height?: number;
  /** Override icon. */
  icon?: LucideIcon;
  /** Override judul. */
  title?: string;
  /** Override hint (subteks kecil). */
  hint?: string;
  locale?: 'id' | 'en';
  className?: string;
}

const COPY: Record<'id' | 'en', { title: string; hint: string }> = {
  id: {
    title: 'Belum ada data',
    hint: 'Chart muncul otomatis setelah ada aktivitas trading.',
  },
  en: {
    title: 'No data yet',
    hint: 'The chart appears automatically once trading activity is recorded.',
  },
};

export function ChartEmptyState({
  height = 240,
  icon: Icon = LineChartIcon,
  title,
  hint,
  locale = 'id',
  className = '',
}: ChartEmptyStateProps) {
  const copy = COPY[locale] ?? COPY.id;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-card/40 text-center text-muted-foreground px-6 ${className}`}
      style={{ minHeight: height }}
    >
      <Icon className="h-7 w-7 opacity-40 mb-2.5" strokeWidth={1.5} aria-hidden />
      <p className="text-sm font-medium text-foreground/80">{title ?? copy.title}</p>
      <p className="text-xs mt-1 max-w-xs">{hint ?? copy.hint}</p>
    </div>
  );
}

/** Skeleton untuk loading state — animasi pulse halus. */
export function ChartSkeleton({ height = 240, className = '' }: { height?: number; className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading chart"
      className={`relative rounded-md border border-border/60 bg-card/30 overflow-hidden ${className}`}
      style={{ minHeight: height }}
    >
      <div className="absolute inset-0 animate-pulse">
        <div className="absolute bottom-6 left-6 right-6 grid grid-cols-12 gap-1 items-end h-3/5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="rounded-t-sm bg-foreground/[0.06]"
              style={{ height: `${30 + ((i * 17) % 60)}%` }}
            />
          ))}
        </div>
        <div className="absolute top-4 left-6 h-4 w-24 rounded bg-foreground/[0.08]" />
      </div>
    </div>
  );
}
