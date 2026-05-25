/**
 * Strategy SVG icons — flat white monoline, 24×24.
 * Decorative only, uses currentColor.
 */

interface IconProps {
  className?: string;
}

/** Quasimodo — M/W reversal pattern */
export function QuasimodoIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 18 L6 8 L9 14 L12 4 L15 14 L18 8 L22 18" />
      <circle cx="12" cy="4" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Wyckoff — Accumulation/distribution phases */
export function WyckoffIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Accumulation range */}
      <path d="M2 16 L5 16 L6 14 L7 16 L8 15 L9 16" />
      {/* Markup phase */}
      <path d="M9 16 L12 8 L13 10 L14 6" />
      {/* Distribution range */}
      <path d="M14 6 L15 7 L16 5 L17 7 L18 6 L19 7" />
      {/* Markdown phase */}
      <path d="M19 7 L22 18" />
      {/* Phase labels — horizontal dotted lines */}
      <line x1="2" y1="16" x2="9" y2="16" strokeDasharray="1 2" opacity="0.3" />
      <line x1="14" y1="6" x2="19" y2="6" strokeDasharray="1 2" opacity="0.3" />
    </svg>
  );
}

/** Astronacci — Fibonacci spiral with celestial element */
export function AstronacciIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Fibonacci spiral approximation */}
      <path d="M12 12 C12 9, 15 6, 18 6 C21 6, 22 9, 22 12 C22 17, 17 22, 12 22 C5 22, 2 17, 2 12 C2 5, 7 2, 12 2" />
      {/* Center dot */}
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      {/* Star/celestial element */}
      <circle cx="18" cy="4" r="1" fill="currentColor" stroke="none" />
      <line x1="18" y1="2" x2="18" y2="6" strokeWidth="1" />
      <line x1="16" y1="4" x2="20" y2="4" strokeWidth="1" />
    </svg>
  );
}

/** SMC — Smart Money Concepts / Order block */
export function SmcIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Order block zone */}
      <rect x="3" y="10" width="18" height="4" rx="1" fill="currentColor" opacity="0.15" stroke="currentColor" />
      {/* Price action sweeping through */}
      <path d="M2 18 L6 14 L9 16 L12 8 L15 12 L18 6 L22 4" />
      {/* Liquidity grab wick */}
      <line x1="6" y1="14" x2="6" y2="19" strokeWidth="1" opacity="0.5" />
      <line x1="18" y1="6" x2="18" y2="3" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

/** Quad Confluence — 4-factor multi-directional convergence */
export function QuadConfluenceIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.15" />
      <line x1="12" y1="3" x2="12" y2="9" />
      <line x1="12" y1="15" x2="12" y2="21" />
      <line x1="3" y1="12" x2="9" y2="12" />
      <line x1="15" y1="12" x2="21" y2="12" />
      <circle cx="12" cy="3" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="21" r="1" fill="currentColor" stroke="none" />
      <circle cx="3" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="21" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Pivot Mean Reversion — Daily pivot fade scalper */
export function PivotIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Daily pivot horizontal line */}
      <line x1="2" y1="12" x2="22" y2="12" strokeDasharray="3 2" opacity="0.6" />
      {/* R1/S1 boundary lines */}
      <line x1="2" y1="6" x2="22" y2="6" strokeDasharray="1 2" opacity="0.3" />
      <line x1="2" y1="18" x2="22" y2="18" strokeDasharray="1 2" opacity="0.3" />
      {/* Price oscillation around pivot (mean reverting) */}
      <path d="M2 12 Q5 6, 8 12 T14 12 T20 12" />
      {/* Entry arrow back to pivot */}
      <path d="M18 5 L20 7 L22 5" />
      <circle cx="20" cy="6" r="1" fill="currentColor" stroke="none" opacity="0.5" />
    </svg>
  );
}

export const STRATEGY_ICONS: Record<string, React.ComponentType<IconProps>> = {
  'smc': SmcIcon,
  'smc-swing': QuasimodoIcon,
  'pivot-mean-reversion': PivotIcon,
  'quad-confluence': QuadConfluenceIcon,
  'wyckoff': WyckoffIcon,
  'quasimodo': QuasimodoIcon,
};
