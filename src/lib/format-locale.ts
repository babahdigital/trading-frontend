/**
 * Locale-aware formatters — single source of truth supaya
 * admin/portal/public surface konsisten format date, currency, number.
 *
 * Default locale id-ID (IDN audience), tapi semua fungsi terima override.
 * Pakai Intl native — no dep, SSR-safe, tree-shake friendly.
 */

export type Locale = 'id' | 'en' | string;

const localeMap: Record<string, string> = {
  id: 'id-ID',
  en: 'en-US',
};

function resolve(locale?: Locale): string {
  if (!locale) return 'id-ID';
  return localeMap[locale] || locale;
}

// ─── Date ─────────────────────────────────────────────────────────────────
export function formatDate(
  iso: string | number | Date | null | undefined,
  locale: Locale = 'id',
  opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
): string {
  if (!iso) return '-';
  try {
    const d = iso instanceof Date ? iso : new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat(resolve(locale), opts).format(d);
  } catch {
    return '-';
  }
}

export function formatDateTime(
  iso: string | number | Date | null | undefined,
  locale: Locale = 'id',
): string {
  return formatDate(iso, locale, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatTime(
  iso: string | number | Date | null | undefined,
  locale: Locale = 'id',
): string {
  return formatDate(iso, locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Human-friendly relative time ("2 menit lalu", "kemarin", "3 hari lagi").
 * Hindari dep — pakai Intl.RelativeTimeFormat.
 */
export function formatRelative(
  iso: string | number | Date | null | undefined,
  locale: Locale = 'id',
  base: Date = new Date(),
): string {
  if (!iso) return '-';
  try {
    const d = iso instanceof Date ? iso : new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    const diffMs = d.getTime() - base.getTime();
    const rtf = new Intl.RelativeTimeFormat(resolve(locale), { numeric: 'auto' });
    const abs = Math.abs(diffMs);
    const sec = abs / 1000;
    if (sec < 60) return rtf.format(Math.round(diffMs / 1000), 'second');
    const min = sec / 60;
    if (min < 60) return rtf.format(Math.round(diffMs / 60000), 'minute');
    const hr = min / 60;
    if (hr < 24) return rtf.format(Math.round(diffMs / 3600000), 'hour');
    const day = hr / 24;
    if (day < 30) return rtf.format(Math.round(diffMs / 86400000), 'day');
    const month = day / 30;
    if (month < 12) return rtf.format(Math.round(diffMs / (86400000 * 30)), 'month');
    return rtf.format(Math.round(diffMs / (86400000 * 365)), 'year');
  } catch {
    return '-';
  }
}

// ─── Number / Currency ────────────────────────────────────────────────────
export function formatNumber(
  value: number | null | undefined,
  locale: Locale = 'id',
  opts: Intl.NumberFormatOptions = {},
): string {
  if (value == null || !Number.isFinite(value)) return '-';
  return new Intl.NumberFormat(resolve(locale), opts).format(value);
}

export function formatCount(value: number | null | undefined, locale: Locale = 'id'): string {
  return formatNumber(value, locale, { maximumFractionDigits: 0 });
}

export function formatCurrency(
  value: number | null | undefined,
  currency: string = 'USD',
  locale: Locale = 'id',
  opts: Intl.NumberFormatOptions = {},
): string {
  if (value == null || !Number.isFinite(value)) return '-';
  return new Intl.NumberFormat(resolve(locale), {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...opts,
  }).format(value);
}

export function formatPercent(
  value: number | null | undefined,
  locale: Locale = 'id',
  opts: { sign?: boolean; decimals?: number } = {},
): string {
  if (value == null || !Number.isFinite(value)) return '-';
  const { sign = false, decimals = 1 } = opts;
  const formatted = new Intl.NumberFormat(resolve(locale), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(value));
  if (sign && value > 0) return `+${formatted}%`;
  if (sign && value < 0) return `-${formatted}%`;
  return `${formatted}%`;
}

export function formatBytes(bytes: number | null | undefined, locale: Locale = 'id'): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return '-';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const v = bytes / Math.pow(1024, i);
  return `${formatNumber(v, locale, { maximumFractionDigits: i === 0 ? 0 : 2 })} ${units[i]}`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '-';
  if (seconds < 60) return `${Math.round(seconds)}d`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ${Math.round(seconds % 60)}d`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}h ${h % 24}j`;
}

export function formatUptime(seconds: number | null | undefined): string {
  return formatDuration(seconds);
}
