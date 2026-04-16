'use client';

import { useState } from 'react';

interface DayData {
  date: string;
  pnl: number;
  trades: number;
  winRate: number;
}

interface MonthlyCalendarProps {
  data: DayData[];
  month: number;
  year: number;
  className?: string;
}

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function MonthlyCalendar({ data, month, year, className = '' }: MonthlyCalendarProps) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  // Monday = 0
  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;

  const maxAbs = Math.max(...data.map((d) => Math.abs(d.pnl)), 1);
  const dataMap: Record<string, DayData> = {};
  for (const d of data) dataMap[d.date] = d;

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  return (
    <div className={className}>
      <div className="text-center text-sm font-semibold mb-3">
        {monthNames[month]} {year}
      </div>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[10px] text-muted-foreground font-medium">{d}</div>
        ))}
      </div>
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) return <div key={idx} />;
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dd = dataMap[dateStr];
          const intensity = dd ? Math.min(Math.abs(dd.pnl) / maxAbs, 1) : 0;

          let bgStyle: React.CSSProperties = { backgroundColor: 'rgba(51,65,85,0.2)' };
          if (dd && dd.pnl !== 0) {
            bgStyle = dd.pnl > 0
              ? { backgroundColor: `rgba(34,197,94,${0.15 + intensity * 0.6})` }
              : { backgroundColor: `rgba(239,68,68,${0.15 + intensity * 0.6})` };
          }

          return (
            <div
              key={idx}
              className="relative aspect-square rounded-sm flex items-center justify-center text-xs cursor-default"
              style={bgStyle}
              onMouseEnter={() => setHoveredDate(dateStr)}
              onMouseLeave={() => setHoveredDate(null)}
            >
              {day}
              {hoveredDate === dateStr && dd && (
                <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 w-40 bg-slate-900 border border-slate-700 rounded-lg p-2 text-[10px] shadow-xl pointer-events-none">
                  <div className={dd.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                    ${dd.pnl.toFixed(2)}
                  </div>
                  <div className="text-muted-foreground">{dd.trades} trades | WR: {dd.winRate}%</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
