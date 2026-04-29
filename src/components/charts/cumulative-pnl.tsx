'use client';

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  type TooltipProps,
} from 'recharts';
import { useThemeTokens } from '@/components/ui/theme-tokens';

interface CumulativePnlProps {
  data: { trade: number; pnl: number }[];
  height?: number;
  className?: string;
}

function formatUsd(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1000) return `${v < 0 ? '-' : ''}$${(abs / 1000).toFixed(1)}k`;
  return `${v < 0 ? '-' : ''}$${abs.toFixed(0)}`;
}

function ChartTooltip(props: TooltipProps<number, string>) {
  const { active, payload, label } = props;
  if (!active || !payload || !payload[0]) return null;
  const value = Number(payload[0].value ?? 0);
  return (
    <div className="rounded-lg border border-border bg-card/95 backdrop-blur px-3 py-2 shadow-lg">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Trade #{label}</div>
      <div className="mt-1 font-mono text-sm font-semibold text-foreground">
        {value >= 0 ? '+' : ''}{formatUsd(value)}
      </div>
    </div>
  );
}

export function CumulativePnl({ data, height = 200, className = '' }: CumulativePnlProps) {
  const t = useThemeTokens();

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <defs>
            <linearGradient id="cumPnlGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={t.primary} stopOpacity={0.45} />
              <stop offset="95%" stopColor={t.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke={t.chartGrid} vertical={false} />
          <XAxis
            dataKey="trade"
            tick={{ fill: t.mutedForeground, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            label={{ value: 'Trade #', position: 'insideBottom', offset: -3, fill: t.mutedForeground, fontSize: 10 }}
          />
          <YAxis
            tick={{ fill: t.mutedForeground, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatUsd}
            width={48}
          />
          <Tooltip
            cursor={{ stroke: t.primary, strokeOpacity: 0.4 }}
            content={<ChartTooltip />}
          />
          <Area
            type="monotone"
            dataKey="pnl"
            stroke={t.primary}
            fill="url(#cumPnlGrad)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
