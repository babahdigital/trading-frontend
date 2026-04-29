'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
  type TooltipProps,
} from 'recharts';
import { useThemeTokens } from '@/components/ui/theme-tokens';

interface WinRateBarProps {
  data: { name: string; winRate: number }[];
  height?: number;
  className?: string;
}

function getBarColor(rate: number, t: ReturnType<typeof useThemeTokens>) {
  if (rate >= 60) return t.profit;
  if (rate >= 50) return t.warning;
  return t.loss;
}

function ChartTooltip(props: TooltipProps<number, string>) {
  const { active, payload, label } = props;
  if (!active || !payload || !payload[0]) return null;
  return (
    <div className="rounded-lg border border-border bg-card/95 backdrop-blur px-3 py-2 shadow-lg">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-sm font-semibold text-foreground">{Number(payload[0].value).toFixed(1)}%</div>
    </div>
  );
}

export function WinRateBar({ data, height = 300, className = '' }: WinRateBarProps) {
  const t = useThemeTokens();
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 80 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={t.chartGrid} horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: t.mutedForeground, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}%`}
          />
          <YAxis
            dataKey="name"
            type="category"
            tick={{ fill: t.mutedForeground, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip cursor={{ fill: t.muted, opacity: 0.4 }} content={<ChartTooltip />} />
          <Bar dataKey="winRate" radius={[0, 6, 6, 0]} maxBarSize={28}>
            {data.map((entry, index) => (
              <Cell key={index} fill={getBarColor(entry.winRate, t)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
