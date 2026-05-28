// src/lib/charts/theme.ts
// Centralized chart theme — used by all chart components

export const chartTheme = {
  colors: {
    primary: '#F5B547',
    primarySoft: 'rgba(245, 181, 71, 0.4)',
    primaryGlow: 'rgba(245, 181, 71, 0.08)',
    primaryFaint: 'rgba(245, 181, 71, 0.02)',
    secondary: '#4A7FBF',
    positive: '#2E9A6B',
    negative: '#C4423A',
    neutral: '#8A93A6',
    text: 'rgba(245, 245, 247, 0.65)',
    textStrong: 'rgba(245, 245, 247, 0.9)',
    grid: 'rgba(255, 255, 255, 0.04)',
    gridStrong: 'rgba(255, 255, 255, 0.08)',
    axis: 'rgba(255, 255, 255, 0.12)',
    background: 'transparent',
    tooltipBg: '#0F1828',
    tooltipBorder: 'rgba(255, 255, 255, 0.08)',
  },
  fonts: {
    body: 'Inter Tight, system-ui, sans-serif',
    mono: 'JetBrains Mono, monospace',
  },
  series: [
    '#F5B547', // Amber (primary)
    '#4A7FBF', // Steel blue
    '#2E9A6B', // Green
    '#B5651F', // Bronze
    '#7A4FBC', // Aubergine
    '#C84A6F', // Rose
    '#4A9BA8', // Teal
    '#8B92A4', // Slate
  ],
} as const;

// Theme-aware axis/grid/text colors for lightweight-charts (which bakes colors
// at creation and can't use CSS vars). The static chartTheme.colors above are
// dark-only — on light mode the white text/grid were illegible. (P2-A11Y-1)
// `crosshair` is centralized here too (was duplicated as a literal). (P3-DESIGN-4)
export const chartAxisColors = {
  dark: {
    text: 'rgba(245, 245, 247, 0.65)',
    grid: 'rgba(255, 255, 255, 0.04)',
    gridStrong: 'rgba(255, 255, 255, 0.08)',
    axis: 'rgba(255, 255, 255, 0.12)',
    crosshair: 'rgba(245, 181, 71, 0.5)',
  },
  light: {
    text: 'rgba(11, 18, 32, 0.55)',
    grid: 'rgba(11, 18, 32, 0.05)',
    gridStrong: 'rgba(11, 18, 32, 0.09)',
    axis: 'rgba(11, 18, 32, 0.15)',
    crosshair: 'rgba(200, 144, 46, 0.55)',
  },
} as const;

export function getChartAxisColors(isDark: boolean) {
  return isDark ? chartAxisColors.dark : chartAxisColors.light;
}

// Lightweight Charts config preset
export const lightweightChartOptions = {
  layout: {
    background: { type: 'solid' as const, color: 'transparent' },
    textColor: chartTheme.colors.text,
    fontFamily: chartTheme.fonts.mono,
    fontSize: 11,
  },
  grid: {
    vertLines: { color: chartTheme.colors.grid },
    horzLines: { color: chartTheme.colors.gridStrong },
  },
  rightPriceScale: {
    borderColor: chartTheme.colors.axis,
    scaleMargins: { top: 0.1, bottom: 0.1 },
  },
  timeScale: {
    borderColor: chartTheme.colors.axis,
    timeVisible: false,
  },
  crosshair: {
    mode: 1, // Magnet
    vertLine: {
      color: 'rgba(245, 181, 71, 0.5)',
      width: 1 as 1,
      style: 0 as 0,
    },
    horzLine: {
      visible: false,
    },
  },
};

// Area series preset (equity curve)
export const equityAreaSeriesOptions = {
  topColor: chartTheme.colors.primarySoft,
  bottomColor: chartTheme.colors.primaryFaint,
  lineColor: chartTheme.colors.primary,
  lineWidth: 2 as 2,
};

// Recharts tooltip styling
export const rechartsTooltipStyle = {
  contentStyle: {
    background: chartTheme.colors.tooltipBg,
    border: `1px solid ${chartTheme.colors.tooltipBorder}`,
    borderRadius: 8,
    padding: '12px 16px',
    fontFamily: chartTheme.fonts.mono,
    fontSize: 12,
  },
  labelStyle: {
    color: chartTheme.colors.textStrong,
    marginBottom: 4,
  },
};
