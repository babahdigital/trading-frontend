'use client';

// Architecture flow diagram: Market Data → AI Engine → Risk Layer → MT5 Execution
// Monoline enterprise style, responsive, uses brand tokens via CSS vars

export function ArchitectureDiagram({ className }: { className?: string }) {
  return (
    <div className={className}>
      <svg viewBox="0 0 900 220" fill="none" className="w-full h-auto" aria-label="BabahAlgo architecture: Market Data to AI Engine to Risk Layer to MT5 Execution">
        {/* Connection lines */}
        <line x1="195" y1="110" x2="255" y2="110" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" className="text-border" />
        <line x1="420" y1="110" x2="480" y2="110" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" className="text-border" />
        <line x1="645" y1="110" x2="705" y2="110" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" className="text-border" />

        {/* Arrow heads */}
        <polygon points="253,106 263,110 253,114" className="fill-muted-foreground" />
        <polygon points="478,106 488,110 478,114" className="fill-muted-foreground" />
        <polygon points="703,106 713,110 703,114" className="fill-muted-foreground" />

        {/* Box 1: Market Data */}
        <rect x="20" y="40" width="175" height="140" rx="8" className="stroke-border" strokeWidth="1.5" fill="none" />
        <text x="107" y="80" textAnchor="middle" className="fill-foreground text-[13px] font-semibold" fontFamily="var(--font-display)">Market Data</text>
        <text x="107" y="102" textAnchor="middle" className="fill-muted-foreground text-[11px]" fontFamily="var(--font-body)">14 Instruments</text>
        <text x="107" y="120" textAnchor="middle" className="fill-muted-foreground text-[11px]" fontFamily="var(--font-body)">Multi-timeframe</text>
        <text x="107" y="138" textAnchor="middle" className="fill-muted-foreground text-[11px]" fontFamily="var(--font-body)">H4 → H1 → M15 → M5</text>
        {/* Amber accent dot */}
        <circle cx="107" cy="158" r="4" className="fill-accent" />

        {/* Box 2: AI Engine */}
        <rect x="255" y="40" width="175" height="140" rx="8" className="stroke-accent" strokeWidth="1.5" fill="none" />
        <text x="342" y="80" textAnchor="middle" className="fill-foreground text-[13px] font-semibold" fontFamily="var(--font-display)">AI Engine</text>
        <text x="342" y="102" textAnchor="middle" className="fill-muted-foreground text-[11px]" fontFamily="var(--font-body)">Gemini 2.5 Advisor</text>
        <text x="342" y="120" textAnchor="middle" className="fill-muted-foreground text-[11px]" fontFamily="var(--font-body)">6 Confluence Strategies</text>
        <text x="342" y="138" textAnchor="middle" className="fill-muted-foreground text-[11px]" fontFamily="var(--font-body)">SMC · Wyckoff · Astro</text>
        <circle cx="342" cy="158" r="4" className="fill-accent" />

        {/* Box 3: Risk Layer */}
        <rect x="480" y="40" width="175" height="140" rx="8" className="stroke-border" strokeWidth="1.5" fill="none" />
        <text x="567" y="80" textAnchor="middle" className="fill-foreground text-[13px] font-semibold" fontFamily="var(--font-display)">Risk Layer</text>
        <text x="567" y="102" textAnchor="middle" className="fill-muted-foreground text-[11px]" fontFamily="var(--font-body)">12-Layer Protection</text>
        <text x="567" y="120" textAnchor="middle" className="fill-muted-foreground text-[11px]" fontFamily="var(--font-body)">Dynamic Lot Sizing</text>
        <text x="567" y="138" textAnchor="middle" className="fill-muted-foreground text-[11px]" fontFamily="var(--font-body)">Kill Switch · DD Guard</text>
        <circle cx="567" cy="158" r="4" className="fill-accent" />

        {/* Box 4: MT5 Execution */}
        <rect x="705" y="40" width="175" height="140" rx="8" className="stroke-border" strokeWidth="1.5" fill="none" />
        <text x="792" y="80" textAnchor="middle" className="fill-foreground text-[13px] font-semibold" fontFamily="var(--font-display)">MT5 Execution</text>
        <text x="792" y="102" textAnchor="middle" className="fill-muted-foreground text-[11px]" fontFamily="var(--font-body)">ZeroMQ Bridge</text>
        <text x="792" y="120" textAnchor="middle" className="fill-muted-foreground text-[11px]" fontFamily="var(--font-body)">&lt;2ms Latency</text>
        <text x="792" y="138" textAnchor="middle" className="fill-muted-foreground text-[11px]" fontFamily="var(--font-body)">24/7 Execution</text>
        <circle cx="792" cy="158" r="4" className="fill-accent" />

        {/* Bottom label */}
        <text x="450" y="210" textAnchor="middle" className="fill-muted-foreground text-[10px] uppercase tracking-widest" fontFamily="var(--font-body)">Zero-Trust Architecture · Cloudflare Tunnel · VPS Isolation</text>
      </svg>
    </div>
  );
}
