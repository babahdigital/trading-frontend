'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, type IChartApi } from 'lightweight-charts';
import { useTheme } from 'next-themes';
import { chartTheme, getChartAxisColors } from '@/lib/charts/theme';
import { ChartEmptyState } from '@/components/charts/chart-empty-state';

interface EquityCurveProps {
  data: { time: string; value: number }[];
  height?: number;
  periods?: string[];
  activePeriod?: string;
  onPeriodChange?: (period: string) => void;
  showDrawdown?: boolean;
  className?: string;
  locale?: 'id' | 'en';
}

export function EquityCurve({
  data,
  height = 400,
  periods = ['7D', '30D', '90D', 'YTD'],
  activePeriod = '30D',
  onPeriodChange,
  className = '',
  locale = 'id',
}: EquityCurveProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState(activePeriod);
  const isEmpty = !data || data.length === 0;
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!chartContainerRef.current) return;
    if (isEmpty) return;

    // Theme-aware axis/grid/text so the chart is legible in light mode too. (P2-A11Y-1)
    const ax = getChartAxisColors(resolvedTheme !== 'light');

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: ax.text,
        fontFamily: chartTheme.fonts.mono,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: ax.grid },
        horzLines: { color: ax.gridStrong },
      },
      width: chartContainerRef.current.clientWidth,
      height,
      rightPriceScale: {
        borderColor: ax.axis,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: ax.axis,
        timeVisible: false,
      },
      crosshair: {
        mode: 1,
        vertLine: { color: ax.crosshair, width: 1, style: 0 },
        horzLine: { visible: false },
      },
      // 2026-05-20 — disable interactive pan + zoom. Period switcher (tab-bar)
      // adalah satu-satunya control yang kita expose; horizontal scroll/drag
      // di chart menyebabkan time-window berubah lalu y-scale auto-shift →
      // layout jumping yang merusak tampilan. Lock view to fitContent.
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: false,
        horzTouchDrag: false,
        vertTouchDrag: false,
      },
      handleScale: {
        mouseWheel: false,
        pinch: false,
        axisPressedMouseMove: false,
        axisDoubleClickReset: false,
      },
    });

    const areaSeries = chart.addAreaSeries({
      topColor: chartTheme.colors.primarySoft,
      bottomColor: chartTheme.colors.primaryFaint,
      lineColor: chartTheme.colors.primary,
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        // The underlying equity value is ALWAYS USD/USDT — broker and Binance
        // accounts are USD-denominated. Format as "$" regardless of UI locale.
        // Previously the 'id' locale prefixed "Rp" onto the raw USD number with
        // NO FX conversion, mislabeling the currency and understating the figure
        // ~16,500x on customer-facing track-record charts. (P1-DI-1)
        formatter: (p: number) => '$' + p.toLocaleString('en-US'),
      },
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

    // ResizeObserver tracks parent-container width changes (sidebar toggle, grid resize)
    // — supplements window.resize which only fires on viewport changes.
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && chartContainerRef.current) {
      ro = new ResizeObserver(() => handleResize());
      ro.observe(chartContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      ro?.disconnect();
      chart.remove();
    };
  }, [data, height, isEmpty, locale, resolvedTheme]);

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
      {isEmpty ? (
        <ChartEmptyState height={height} locale={locale} />
      ) : (
        <div
          ref={chartContainerRef}
          className="w-full overflow-hidden touch-none select-none"
          style={{ minHeight: height }}
        />
      )}
    </div>
  );
}
