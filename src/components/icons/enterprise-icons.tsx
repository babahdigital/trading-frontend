// Custom monoline SVG icons for BabahAlgo enterprise design system
// All icons: 24x24 viewBox, 1.5px stroke, no fill, currentColor

export function StrategyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Multi-timeframe confluence — layered candlesticks */}
      <path d="M4 18V10" />
      <rect x="2.5" y="12" width="3" height="4" rx="0.5" />
      <path d="M9 20V6" />
      <rect x="7.5" y="8" width="3" height="8" rx="0.5" />
      <path d="M14 16V4" />
      <rect x="12.5" y="6" width="3" height="6" rx="0.5" />
      <path d="M19 20V8" />
      <rect x="17.5" y="10" width="3" height="6" rx="0.5" />
    </svg>
  );
}

export function TechnologyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* AI neural node — central node with connections */}
      <circle cx="12" cy="12" r="3" />
      <circle cx="4" cy="6" r="1.5" />
      <circle cx="20" cy="6" r="1.5" />
      <circle cx="4" cy="18" r="1.5" />
      <circle cx="20" cy="18" r="1.5" />
      <path d="M9.5 10.5L5.5 7" />
      <path d="M14.5 10.5L18.5 7" />
      <path d="M9.5 13.5L5.5 17" />
      <path d="M14.5 13.5L18.5 17" />
    </svg>
  );
}

export function RiskIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Shield with layers — multi-layer protection */}
      <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7l-9-5z" />
      <path d="M12 6L7 8.5v3c0 3 2 5.75 5 6.5 3-.75 5-3.5 5-6.5v-3L12 6z" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  );
}

export function SignalIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Signal broadcast — concentric arcs with center dot */}
      <circle cx="12" cy="12" r="2" />
      <path d="M8.5 8.5a5 5 0 0 1 7 0" />
      <path d="M6 6a9 9 0 0 1 12 0" />
      <path d="M8.5 15.5a5 5 0 0 0 7 0" />
      <path d="M6 18a9 9 0 0 0 12 0" />
    </svg>
  );
}

export function PammIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Managed account — chart with ascending line */}
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <path d="M6 17l4-5 3 2 5-7" />
      <path d="M15 7h3v3" />
    </svg>
  );
}

export function LicenseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Server/VPS — stacked server blocks */}
      <rect x="3" y="3" width="18" height="5" rx="1" />
      <rect x="3" y="10" width="18" height="5" rx="1" />
      <rect x="3" y="17" width="18" height="4" rx="1" />
      <circle cx="7" cy="5.5" r="0.75" />
      <circle cx="7" cy="12.5" r="0.75" />
      <circle cx="7" cy="19" r="0.75" />
      <path d="M15 5.5h2" />
      <path d="M15 12.5h2" />
      <path d="M15 19h2" />
    </svg>
  );
}

export function ExecutionIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Lightning-fast execution — bolt */}
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  );
}

export function InstrumentsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Globe with grid — multi-instrument coverage */}
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2c2.76 2.76 4.33 6.5 4.33 10S14.76 19.24 12 22" />
      <path d="M12 2c-2.76 2.76-4.33 6.5-4.33 10S9.24 19.24 12 22" />
    </svg>
  );
}
