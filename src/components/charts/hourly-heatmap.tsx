'use client';

import { useState } from 'react';

interface HeatmapCell {
  hour: number;
  day: number;
  pnl: number;
  trades: number;
}

interface HourlyHeatmapProps {
  data: HeatmapCell[];
  className?: string;
  /** Locale dipakai untuk day name. Default 'id'. */
  locale?: 'id' | 'en';
}

const DAY_LABELS: Record<'id' | 'en', string[]> = {
  id: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};
const HOURS = Array.from({ length: 24 }, (_, i) => i);

/**
 * Hourly heatmap — 7 hari × 24 jam grid.
 *
 * Responsive: di mobile (<sm) tampilkan cuma rentang jam 8-22 (15 cell) dengan
 * cell yang lebih besar; di tablet/desktop tampilkan full 24 jam. CSS grid
 * cell minmax(0,1fr) supaya tidak overflow horizontal — tidak butuh scroll
 * paksa. Aspect ratio dipertahankan via `aspect-square` per cell.
 *
 * Empty state: data=[] → tampilkan placeholder "Belum ada data".
 */
export function HourlyHeatmap({ data, className = '', locale = 'id' }: HourlyHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; cell: HeatmapCell } | null>(null);

  if (!data || data.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-card/40 py-10 text-center text-muted-foreground ${className}`}
      >
        <p className="text-sm">{locale === 'id' ? 'Belum ada data heatmap untuk periode ini.' : 'No heatmap data for this period.'}</p>
        <p className="text-xs mt-1">{locale === 'id' ? 'Data muncul otomatis setelah aktivitas trading terekam.' : 'Data appears automatically once trading activity is recorded.'}</p>
      </div>
    );
  }

  const maxAbs = Math.max(...data.map((d) => Math.abs(d.pnl)), 1);
  const days = DAY_LABELS[locale] ?? DAY_LABELS.id;

  const grid: Record<string, HeatmapCell> = {};
  for (const cell of data) grid[`${cell.day}-${cell.hour}`] = cell;

  return (
    <div className={`relative ${className}`}>
      {/* Mobile (sm-): 15 jam slot (8-22) supaya cell readable */}
      <HeatmapGrid
        hourSlots={HOURS.filter((h) => h >= 8 && h <= 22)}
        days={days}
        grid={grid}
        maxAbs={maxAbs}
        onHover={setTooltip}
        className="sm:hidden"
      />
      {/* Tablet+ (sm+): full 24 jam */}
      <HeatmapGrid
        hourSlots={HOURS}
        days={days}
        grid={grid}
        maxAbs={maxAbs}
        onHover={setTooltip}
        className="hidden sm:block"
      />
      {/* Tooltip — anchored to viewport via fixed positioning */}
      {tooltip && (
        <div
          role="tooltip"
          className="fixed z-50 max-w-[calc(100vw-1rem)] rounded-md border border-slate-700 bg-slate-900/95 backdrop-blur px-3 py-2 text-xs shadow-xl pointer-events-none"
          style={{ left: Math.max(8, Math.min(tooltip.x, window.innerWidth - 200)), top: Math.max(8, tooltip.y) }}
        >
          <div className="font-semibold">
            {days[tooltip.cell.day]} {String(tooltip.cell.hour).padStart(2, '0')}:00 UTC
          </div>
          <div className={tooltip.cell.pnl >= 0 ? 'text-green-400 mt-0.5' : 'text-red-400 mt-0.5'}>
            {tooltip.cell.pnl >= 0 ? '+' : ''}${tooltip.cell.pnl.toFixed(2)} · {tooltip.cell.trades} {locale === 'id' ? 'trade' : 'trades'}
          </div>
        </div>
      )}
      <p className="mt-2 text-[10px] text-muted-foreground/70 sm:hidden">
        {locale === 'id' ? 'Mobile view: jam 8-22 UTC. Buka di tablet untuk full 24 jam.' : 'Mobile view: 8-22 UTC. Open on tablet for full 24h.'}
      </p>
    </div>
  );
}

function HeatmapGrid({
  hourSlots,
  days,
  grid,
  maxAbs,
  onHover,
  className,
}: {
  hourSlots: number[];
  days: string[];
  grid: Record<string, HeatmapCell>;
  maxAbs: number;
  onHover: (state: { x: number; y: number; cell: HeatmapCell } | null) => void;
  className?: string;
}) {
  const gridTemplate = `2rem repeat(${hourSlots.length}, minmax(0, 1fr))`;
  return (
    <div className={className}>
      {/* Header row (hour labels) */}
      <div className="grid gap-x-0.5 mb-1" style={{ gridTemplateColumns: gridTemplate }}>
        <span aria-hidden />
        {hourSlots.map((h) => (
          <span key={h} className="text-center text-[9px] sm:text-[10px] text-muted-foreground/70 font-mono">
            {h % 3 === 0 ? String(h).padStart(2, '0') : ''}
          </span>
        ))}
      </div>
      {/* Body rows */}
      {days.map((day, dayIdx) => (
        <div
          key={day}
          className="grid items-center gap-x-0.5 gap-y-[2px] mb-[2px]"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          <span className="text-right text-[10px] sm:text-xs text-muted-foreground font-medium pr-1.5">{day}</span>
          {hourSlots.map((hour) => {
            const cell = grid[`${dayIdx}-${hour}`] || { hour, day: dayIdx, pnl: 0, trades: 0 };
            const intensity = Math.min(Math.abs(cell.pnl) / maxAbs, 1);
            const bgStyle =
              cell.pnl === 0
                ? { backgroundColor: 'rgba(100,116,139,0.18)' }
                : cell.pnl > 0
                  ? { backgroundColor: `rgba(34,197,94,${0.18 + intensity * 0.62})` }
                  : { backgroundColor: `rgba(239,68,68,${0.18 + intensity * 0.62})` };
            return (
              <div
                key={hour}
                className="aspect-square rounded-sm cursor-default transition-transform hover:scale-110 hover:ring-1 hover:ring-amber-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                style={bgStyle}
                tabIndex={cell.trades > 0 ? 0 : -1}
                role={cell.trades > 0 ? 'button' : undefined}
                aria-label={cell.trades > 0
                  ? `${day} ${String(hour).padStart(2, '0')}:00 — PnL ${cell.pnl.toFixed(2)}, ${cell.trades} trades`
                  : undefined}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  onHover({ x: rect.left + rect.width / 2 - 90, y: rect.top - 56, cell });
                }}
                onMouseLeave={() => onHover(null)}
                onFocus={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  onHover({ x: rect.left + rect.width / 2 - 90, y: rect.top - 56, cell });
                }}
                onBlur={() => onHover(null)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
