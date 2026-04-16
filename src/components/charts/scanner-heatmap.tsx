'use client';

import { useState } from 'react';

interface PairData {
  pair: string;
  score: number;
  status: 'active' | 'standby' | 'off';
  breakdown?: {
    smc: number;
    wyckoff: number;
    zone: number;
    sr: number;
    session: number;
  };
}

interface ScannerHeatmapProps {
  pairs: PairData[];
  mode?: 'admin' | 'client';
  className?: string;
}

function getScoreColor(score: number): string {
  if (score >= 0.8) return 'bg-green-500/80';
  if (score >= 0.6) return 'bg-green-600/60';
  if (score >= 0.3) return 'bg-yellow-500/50';
  return 'bg-slate-700/50';
}

function getStatusDot(status: string) {
  switch (status) {
    case 'active': return 'bg-green-400';
    case 'standby': return 'bg-yellow-400';
    default: return 'bg-slate-500';
  }
}

export function ScannerHeatmap({ pairs, mode = 'admin', className = '' }: ScannerHeatmapProps) {
  const [hoveredPair, setHoveredPair] = useState<string | null>(null);

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-7 gap-2 ${className}`}>
      {pairs.map((pair) => (
        <div
          key={pair.pair}
          className={`relative rounded-lg p-3 transition-all cursor-default ${getScoreColor(pair.score)} hover:ring-1 hover:ring-primary/50`}
          onMouseEnter={() => setHoveredPair(pair.pair)}
          onMouseLeave={() => setHoveredPair(null)}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-foreground">{pair.pair}</span>
            <span className={`w-2 h-2 rounded-full ${getStatusDot(pair.status)}`} />
          </div>
          {mode === 'admin' ? (
            <span className="text-lg font-mono font-bold text-foreground">{pair.score.toFixed(2)}</span>
          ) : (
            <span className="text-xs text-muted-foreground">
              {pair.status === 'active' ? 'Aktif' : pair.status === 'standby' ? 'Standby' : 'Di luar jam'}
            </span>
          )}

          {/* Admin tooltip */}
          {mode === 'admin' && hoveredPair === pair.pair && pair.breakdown && (
            <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs shadow-xl">
              <div className="grid grid-cols-2 gap-1">
                <span className="text-muted-foreground">SMC:</span>
                <span className="font-mono">{pair.breakdown.smc.toFixed(2)}</span>
                <span className="text-muted-foreground">Wyckoff:</span>
                <span className="font-mono">{pair.breakdown.wyckoff.toFixed(2)}</span>
                <span className="text-muted-foreground">Zone:</span>
                <span className="font-mono">{pair.breakdown.zone.toFixed(2)}</span>
                <span className="text-muted-foreground">S/R:</span>
                <span className="font-mono">{pair.breakdown.sr.toFixed(2)}</span>
                <span className="text-muted-foreground">Session:</span>
                <span className="font-mono">{pair.breakdown.session.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
