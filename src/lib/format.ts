// src/lib/format.ts — Number formatting utilities

export function formatPercent(value: number, opts: { sign?: boolean; decimals?: number } = {}) {
  const { sign = true, decimals = 1 } = opts;
  const formatted = value.toFixed(decimals);
  if (sign && value > 0) return `+${formatted}%`;
  return `${formatted}%`;
}

export function formatCurrency(value: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCount(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatRatio(value: number, decimals: number = 2) {
  return value.toFixed(decimals);
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
