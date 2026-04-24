import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Paper mode indicator per ADR-014 (paper-trading-mode).
 *
 * WAJIB ditampilkan kalau account.is_paper === true — customer harus
 * selalu aware apakah trading real money atau simulasi. Compliance +
 * UX requirement dari backend contract.
 */
export interface PaperModeBadgeProps {
  isPaper: boolean | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'inline' | 'banner';
  className?: string;
}

export function PaperModeBadge({
  isPaper,
  size = 'md',
  variant = 'inline',
  className,
}: PaperModeBadgeProps) {
  if (!isPaper) return null;

  if (variant === 'banner') {
    return (
      <div
        data-testid="paper-mode-banner"
        className={cn(
          'w-full rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-200 px-4 py-2 flex items-center gap-2 text-sm',
          className,
        )}
        role="status"
      >
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
        <span>
          <strong className="font-semibold">Paper Mode</strong> — eksekusi simulasi, tidak ada dana
          riil di MT5. Perilaku fill, slippage, dan swap diperkirakan.
        </span>
      </div>
    );
  }

  const sizeClass = size === 'sm'
    ? 'text-[11px] px-1.5 py-0.5 gap-1'
    : size === 'lg'
      ? 'text-sm px-2.5 py-1 gap-1.5'
      : 'text-xs px-2 py-0.5 gap-1';

  return (
    <span
      data-testid="paper-mode-badge"
      role="status"
      aria-label="Paper trading mode active"
      className={cn(
        'inline-flex items-center rounded font-mono font-semibold uppercase tracking-wider',
        'bg-amber-500/15 text-amber-300 border border-amber-500/30',
        sizeClass,
        className,
      )}
    >
      <AlertTriangle className={cn(size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5')} aria-hidden />
      Paper
    </span>
  );
}
