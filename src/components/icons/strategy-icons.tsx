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

/** AI Decision — Neural network / circuit brain */
export function AiDecisionIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Input nodes */}
      <circle cx="4" cy="6" r="1.5" />
      <circle cx="4" cy="12" r="1.5" />
      <circle cx="4" cy="18" r="1.5" />
      {/* Hidden layer */}
      <circle cx="12" cy="8" r="1.5" />
      <circle cx="12" cy="16" r="1.5" />
      {/* Output node */}
      <circle cx="20" cy="12" r="2" fill="currentColor" opacity="0.2" />
      {/* Connections */}
      <line x1="5.5" y1="6" x2="10.5" y2="8" opacity="0.5" />
      <line x1="5.5" y1="6" x2="10.5" y2="16" opacity="0.3" />
      <line x1="5.5" y1="12" x2="10.5" y2="8" opacity="0.5" />
      <line x1="5.5" y1="12" x2="10.5" y2="16" opacity="0.5" />
      <line x1="5.5" y1="18" x2="10.5" y2="8" opacity="0.3" />
      <line x1="5.5" y1="18" x2="10.5" y2="16" opacity="0.5" />
      <line x1="13.5" y1="8" x2="18" y2="12" opacity="0.7" />
      <line x1="13.5" y1="16" x2="18" y2="12" opacity="0.7" />
    </svg>
  );
}

/** Map strategy slug to icon component */
export const STRATEGY_ICONS: Record<string, React.ComponentType<IconProps>> = {
  'smc': SmcIcon,
  'wyckoff': WyckoffIcon,
  'astronacci': AstronacciIcon,
  'ai-momentum': AiDecisionIcon,
  'quasimodo': QuasimodoIcon,
  'oil-gas': SmcIcon, // Reuse SMC for oil-gas (similar institutional flow)
  'smc-swing': SmcIcon,
};
