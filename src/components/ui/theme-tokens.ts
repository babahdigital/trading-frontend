/**
 * Runtime helper to read live HSL tokens from CSS variables.
 *
 * Charts and complex SVG canvases that cannot use Tailwind tokens directly
 * call `useThemeTokens()` to grab the currently-active values. The hook
 * subscribes to <html class="dark"> changes via MutationObserver so charts
 * re-render when the user toggles theme.
 */

'use client';

import { useEffect, useState } from 'react';

export interface ThemeTokens {
  background: string;
  foreground: string;
  card: string;
  border: string;
  muted: string;
  mutedForeground: string;
  primary: string;
  accent: string;
  destructive: string;
  profit: string;
  loss: string;
  warning: string;
  chartGrid: string;
  chartCrosshair: string;
  isDark: boolean;
}

function readHsl(name: string): string {
  if (typeof window === 'undefined') return '0 0% 0%';
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || '0 0% 0%';
}

export function readThemeTokens(): ThemeTokens {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  return {
    background: `hsl(${readHsl('--background')})`,
    foreground: `hsl(${readHsl('--foreground')})`,
    card: `hsl(${readHsl('--card')})`,
    border: `hsl(${readHsl('--border')})`,
    muted: `hsl(${readHsl('--muted')})`,
    mutedForeground: `hsl(${readHsl('--muted-foreground')})`,
    primary: `hsl(${readHsl('--primary')})`,
    accent: `hsl(${readHsl('--accent')})`,
    destructive: `hsl(${readHsl('--destructive')})`,
    profit: `hsl(${readHsl('--profit')})`,
    loss: `hsl(${readHsl('--loss')})`,
    warning: `hsl(${readHsl('--warning')})`,
    chartGrid: `hsl(${readHsl('--chart-grid')})`,
    chartCrosshair: `hsl(${readHsl('--chart-crosshair')})`,
    isDark,
  };
}

export function useThemeTokens(): ThemeTokens {
  const [tokens, setTokens] = useState<ThemeTokens>(() =>
    typeof window === 'undefined'
      ? {
          background: '#0B1220',
          foreground: '#FAFAF7',
          card: '#0F1828',
          border: '#1F2D4A',
          muted: '#16223A',
          mutedForeground: '#8A93A6',
          primary: '#F5B547',
          accent: '#F5B547',
          destructive: '#C4423A',
          profit: '#2E9A6B',
          loss: '#C4423A',
          warning: '#F5B547',
          chartGrid: '#1F2D4A',
          chartCrosshair: '#5C6679',
          isDark: true,
        }
      : readThemeTokens(),
  );

  useEffect(() => {
    setTokens(readThemeTokens());
    const observer = new MutationObserver(() => setTokens(readThemeTokens()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return tokens;
}
