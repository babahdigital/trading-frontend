/**
 * Chart theme — single source of truth for TradingView Lightweight Charts.
 *
 * Lightweight Charts cannot read CSS custom properties or hsl() — it only
 * accepts concrete hex/rgba strings at construction time. So the chart's
 * colors live here as named constants (mirroring the brand tokens in
 * globals.css) instead of being hardcoded inline in every chart component.
 * Edit the palette once here and every chart re-skins consistently.
 *
 * Values mirror: --brand-midnight (#0B1220), --brand-paper (#FAFAF7),
 * --data-positive / --data-negative semantics.
 */

export interface ChartTheme {
  layout: { background: { color: string }; textColor: string };
  grid: { vertLines: { color: string }; horzLines: { color: string } };
  borderColor: string;
  candles: {
    upColor: string;
    downColor: string;
    borderUpColor: string;
    borderDownColor: string;
    wickUpColor: string;
    wickDownColor: string;
  };
}

const CANDLES = {
  upColor: '#22c55e',
  downColor: '#ef4444',
  borderUpColor: '#22c55e',
  borderDownColor: '#ef4444',
  wickUpColor: '#16a34a',
  wickDownColor: '#dc2626',
} as const;

/** Resolve the chart palette for the active theme. */
export function getChartTheme(darkMode: boolean): ChartTheme {
  return {
    layout: {
      background: { color: darkMode ? '#0B1220' : '#FAFAF7' },
      textColor: darkMode ? '#E2E8F0' : '#1e293b',
    },
    grid: {
      vertLines: { color: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)' },
      horzLines: { color: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)' },
    },
    borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    candles: { ...CANDLES },
  };
}
