'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, type IChartApi } from 'lightweight-charts';
import { chartTheme } from '@/lib/charts/theme';

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
        textColor: chartTheme.colors.text,
        fontFamily: chartTheme.fonts.mono,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: chartTheme.colors.grid },
        horzLines: { color: chartTheme.colors.gridStrong },
      },
      width: chartContainerRef.current.clientWidth,
      height,
      rightPriceScale: {
        borderColor: chartTheme.colors.axis,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: chartTheme.colors.axis,
        timeVisible: false,
      },
      crosshair: {
        mode: 1,
        vertLine: { color: 'rgba(245, 181, 71, 0.5)', width: 1, style: 0 },
        horzLine: { visible: false },
      },
    });

    const areaSeries = chart.addAreaSeries({
      topColor: chartTheme.colors.primarySoft,
      bottomColor: chartTheme.colors.primaryFaint,
      lineColor: chartTheme.colors.primary,
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
        <div className="tab-bar mb-4">
          {periods.map((p) => (
            <button
              type="button"
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={`tab-btn ${currentPeriod === p ? 'active' : ''}`}
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
