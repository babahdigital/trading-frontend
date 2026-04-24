'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, type IChartApi, type ISeriesApi, type Time } from 'lightweight-charts';
import { AlertTriangle, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface OHLCBar {
  time: number; // Unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export type PriceChartTimeframe = 'M1' | 'M5' | 'M15' | 'M30' | 'H1' | 'H4' | 'D1';

export interface PriceChartProps {
  symbol: string;
  timeframe?: PriceChartTimeframe;
  /** Max bars to fetch (default 200) */
  limit?: number;
  /** Height in px (default 420) */
  height?: number;
  /** Theme tokens matching Midnight palette */
  darkMode?: boolean;
  className?: string;
}

/**
 * PriceChart via TradingView lightweight-charts per FRONTEND_DEVELOPMENT_GUIDE §5.2.
 *
 * - Fetches OHLC bars from /api/client/bars proxy (which falls back to
 *   empty if VPS1 market-data endpoint unavailable).
 * - Renders candlestick series. Re-initialises on symbol/timeframe change.
 * - Cleans up chart on unmount (no memory leaks).
 *
 * Consumers (e.g. /portal/market, /portal/pair-briefs) compose with
 * <SymbolSelector /> to form the primary trading analysis surface.
 */
export function PriceChart({
  symbol,
  timeframe = 'H1',
  limit = 200,
  height = 420,
  darkMode = true,
  className,
}: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [barsCount, setBarsCount] = useState(0);
  const [source, setSource] = useState<'backend' | 'empty'>('empty');

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { color: darkMode ? '#0B1220' : '#FAFAF7' },
        textColor: darkMode ? '#E2E8F0' : '#1e293b',
      },
      grid: {
        vertLines: { color: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)' },
        horzLines: { color: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
      },
      rightPriceScale: {
        borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
      },
      crosshair: { mode: 1 },
      autoSize: true,
    });

    const series = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#16a34a',
      wickDownColor: '#dc2626',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [darkMode, height]);

  useEffect(() => {
    if (!seriesRef.current) return;
    const ac = new AbortController();
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams({ symbol, timeframe, limit: String(limit) });
    fetch(`/api/client/bars?${qs}`, { signal: ac.signal, credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((body: { source: 'backend' | 'empty'; bars: OHLCBar[] }) => {
        if (seriesRef.current) {
          seriesRef.current.setData(
            body.bars.map((b) => ({
              time: b.time as Time,
              open: b.open,
              high: b.high,
              low: b.low,
              close: b.close,
            })),
          );
          chartRef.current?.timeScale().fitContent();
        }
        setBarsCount(body.bars.length);
        setSource(body.source);
      })
      .catch((err) => {
        if ((err as { name?: string }).name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'unknown');
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, [symbol, timeframe, limit]);

  return (
    <div className={cn('relative rounded-md border border-border overflow-hidden', className)}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-background/50">
        <div className="flex items-center gap-2 text-sm">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="font-mono font-semibold">{symbol}</span>
          <span className="text-xs text-muted-foreground">{timeframe}</span>
        </div>
        <div className="text-[10px] font-mono text-muted-foreground">
          {loading ? 'loading…' : `${barsCount} bars · ${source}`}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 text-xs text-red-400 bg-red-500/5 border-b border-red-500/20">
          <AlertTriangle className="h-3 w-3" />
          Gagal memuat chart: {error}
        </div>
      )}

      {source === 'empty' && !loading && !error && barsCount === 0 && (
        <div className="p-6 text-center text-sm text-muted-foreground">
          Tidak ada data OHLC dari backend. price_ingest_loop belum aktif atau symbol tidak tersedia.
        </div>
      )}

      <div ref={containerRef} style={{ height }} />
    </div>
  );
}
