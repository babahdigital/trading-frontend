'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, type IChartApi } from 'lightweight-charts';

interface EquityCurveProps {
  data: { time: string; value: number }[];
  height?: number;
  periods?: string[];
  activePeriod?: string;
  onPeriodChange?: (period: string) => void;
  showDrawdown?: boolean;
  className?: string;
}

export function EquityCurve({
  data,
  height = 400,
  periods = ['7D', '30D', '90D', 'YTD'],
  activePeriod = '30D',
  onPeriodChange,
  className = '',
}: EquityCurveProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState(activePeriod);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
        fontFamily: "'Inter', sans-serif",
      },
      grid: {
        vertLines: { color: 'rgba(100, 116, 139, 0.1)' },
        horzLines: { color: 'rgba(100, 116, 139, 0.1)' },
      },
      width: chartContainerRef.current.clientWidth,
      height,
      rightPriceScale: {
        borderColor: 'rgba(100, 116, 139, 0.2)',
      },
      timeScale: {
        borderColor: 'rgba(100, 116, 139, 0.2)',
        timeVisible: true,
      },
      crosshair: {
        vertLine: { color: 'rgba(100, 116, 139, 0.4)' },
        horzLine: { color: 'rgba(100, 116, 139, 0.4)' },
      },
    });

    const areaSeries = chart.addAreaSeries({
      lineColor: '#3b82f6',
      topColor: 'rgba(59, 130, 246, 0.3)',
      bottomColor: 'rgba(59, 130, 246, 0.02)',
      lineWidth: 2,
      priceFormat: { type: 'custom', formatter: (p: number) => '$' + p.toLocaleString() },
    });

    areaSeries.setData(data as { time: string; value: number }[]);
    chart.timeScale().fitContent();

    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, height]);

  const handlePeriodChange = (period: string) => {
    setCurrentPeriod(period);
    onPeriodChange?.(period);
  };

  return (
    <div className={className}>
      {periods.length > 0 && (
        <div className="flex gap-1 mb-3">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                currentPeriod === p
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}
