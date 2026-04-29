'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, type TooltipProps } from 'recharts';
import { useThemeTokens } from '@/components/ui/theme-tokens';

interface StrategyDonutProps {
  data: { name: string; value: number; color: string }[];
  centerLabel?: string;
  height?: number;
  className?: string;
}

const RADIAN = Math.PI / 180;

function renderCustomLabel({
  cx, cy, midAngle, innerRadius, outerRadius, percent,
}: { cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number }) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

function ChartTooltip(props: TooltipProps<number, string>) {
  const { active, payload } = props;
  if (!active || !payload || !payload[0]) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border border-border bg-card/95 backdrop-blur px-3 py-2 shadow-lg">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{item.name}</div>
      <div className="mt-1 font-mono text-sm font-semibold text-foreground">{Number(item.value).toLocaleString()}</div>
    </div>
  );
}

export function StrategyDonut({ data, centerLabel, height = 300, className = '' }: StrategyDonutProps) {
  const t = useThemeTokens();
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            label={renderCustomLabel}
            labelLine={false}
            stroke={t.background}
            strokeWidth={2}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, color: t.mutedForeground }} />
          {centerLabel && (
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fill={t.foreground} fontSize={18} fontWeight={600}>
              {centerLabel}
            </text>
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
