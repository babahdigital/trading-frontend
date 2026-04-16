'use client';

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

interface CumulativePnlProps {
  data: { trade: number; pnl: number }[];
  height?: number;
  className?: string;
}

export function CumulativePnl({ data, height = 200, className = '' }: CumulativePnlProps) {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" />
          <XAxis
            dataKey="trade"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(100,116,139,0.2)' }}
            label={{ value: 'Trade #', position: 'insideBottom', offset: -3, fill: '#94a3b8', fontSize: 11 }}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(100,116,139,0.2)' }}
            tickFormatter={(v: number) => `$${v}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1c2940',
              border: '1px solid rgba(100,116,139,0.2)',
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: 12,
            }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cumulative PnL']}
          />
          <defs>
            <linearGradient id="cumPnlGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="pnl"
            stroke="#3b82f6"
            fill="url(#cumPnlGrad)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
