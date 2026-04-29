'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
  type TooltipProps,
} from 'recharts';
import { useThemeTokens } from '@/components/ui/theme-tokens';

interface PnlBarChartProps {
  data: { date: string; pnl: number; trades?: number; winRate?: number }[];
  height?: number;
  className?: string;
}

function formatUsd(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1000) return `${v < 0 ? '-' : ''}$${(abs / 1000).toFixed(1)}k`;
  return `${v < 0 ? '-' : ''}$${abs.toFixed(0)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function ChartTooltip(props: TooltipProps<number, string>) {
  const { active, payload, label } = props;
  if (!active || !payload || !payload[0]) return null;
  const value = Number(payload[0].value ?? 0);
  const isProfit = value >= 0;
  return (
    <div className="rounded-lg border border-border bg-card/95 backdrop-blur px-3 py-2 shadow-lg">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{formatDate(String(label ?? ''))}</div>
      <div className={`mt-1 font-mono text-sm font-semibold ${isProfit ? 'text-[hsl(var(--profit))]' : 'text-[hsl(var(--loss))]'}`}>
        {isProfit ? '+' : ''}{formatUsd(value)}
      </div>
    </div>
  );
}

export function PnlBarChart({ data, height = 360, className = '' }: PnlBarChartProps) {
  const t = useThemeTokens();

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <defs>
            <linearGradient id="pnl-bar-pos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={t.profit} stopOpacity={0.95} />
              <stop offset="100%" stopColor={t.profit} stopOpacity={0.55} />
            </linearGradient>
            <linearGradient id="pnl-bar-neg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={t.loss} stopOpacity={0.55} />
              <stop offset="100%" stopColor={t.loss} stopOpacity={0.95} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke={t.chartGrid} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: t.mutedForeground, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatDate}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: t.mutedForeground, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatUsd}
            width={48}
          />
          <Tooltip
            cursor={{ fill: t.muted, opacity: 0.4 }}
            content={<ChartTooltip />}
          />
          <Bar dataKey="pnl" radius={[6, 6, 0, 0]} maxBarSize={32}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.pnl >= 0 ? 'url(#pnl-bar-pos)' : 'url(#pnl-bar-neg)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
