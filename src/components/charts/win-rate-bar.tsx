'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
} from 'recharts';

interface WinRateBarProps {
  data: { name: string; winRate: number }[];
  height?: number;
  className?: string;
}

function getBarColor(rate: number) {
  if (rate >= 60) return '#22c55e';
  if (rate >= 50) return '#eab308';
  return '#ef4444';
}

export function WinRateBar({ data, height = 300, className = '' }: WinRateBarProps) {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(100,116,139,0.2)' }}
            tickFormatter={(v: number) => `${v}%`}
          />
          <YAxis
            dataKey="name"
            type="category"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={{ stroke: 'rgba(100,116,139,0.2)' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1c2940',
              border: '1px solid rgba(100,116,139,0.2)',
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: 12,
            }}
            formatter={(value: number) => [`${value}%`, 'Win Rate']}
          />
          <Bar dataKey="winRate" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={getBarColor(entry.winRate)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
