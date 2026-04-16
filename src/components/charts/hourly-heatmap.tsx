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
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function HourlyHeatmap({ data, className = '' }: HourlyHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; cell: HeatmapCell } | null>(null);

  const maxAbs = Math.max(...data.map((d) => Math.abs(d.pnl)), 1);

  const grid: Record<string, HeatmapCell> = {};
  for (const cell of data) {
    grid[`${cell.day}-${cell.hour}`] = cell;
  }

  return (
    <div className={`relative ${className}`}>
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Hour labels */}
          <div className="flex ml-10 mb-1">
            {HOURS.map((h) => (
              <div key={h} className="flex-1 text-center text-[10px] text-muted-foreground">
                {h % 3 === 0 ? String(h).padStart(2, '0') : ''}
              </div>
            ))}
          </div>
          {/* Grid rows */}
          {DAYS.map((day, dayIdx) => (
            <div key={day} className="flex items-center gap-1 mb-1">
              <span className="w-9 text-xs text-muted-foreground text-right">{day}</span>
              <div className="flex flex-1 gap-[2px]">
                {HOURS.map((hour) => {
                  const cell = grid[`${dayIdx}-${hour}`] || { hour, day: dayIdx, pnl: 0, trades: 0 };
                  const intensity = Math.min(Math.abs(cell.pnl) / maxAbs, 1);
                  const bgStyle = cell.pnl === 0
                    ? { backgroundColor: 'rgba(51,65,85,0.3)' }
                    : cell.pnl > 0
                      ? { backgroundColor: `rgba(34,197,94,${0.15 + intensity * 0.6})` }
                      : { backgroundColor: `rgba(239,68,68,${0.15 + intensity * 0.6})` };

                  return (
                    <div
                      key={hour}
                      className="flex-1 aspect-square rounded-sm cursor-default transition-transform hover:scale-125"
                      style={bgStyle}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({ x: rect.left, y: rect.top - 50, cell });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="font-semibold">{DAYS[tooltip.cell.day]} {String(tooltip.cell.hour).padStart(2, '0')}:00</div>
          <div className={tooltip.cell.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
            ${tooltip.cell.pnl.toFixed(2)} | {tooltip.cell.trades} trades
          </div>
        </div>
      )}
    </div>
  );
}
