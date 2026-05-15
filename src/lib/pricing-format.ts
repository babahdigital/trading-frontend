/**
 * Locale-aware pricing format — IDR untuk locale 'id', USD untuk locale 'en'.
 *
 * Conversion table dirawat manual (per 2026-05 USD/IDR ≈ Rp 16.500),
 * dibulatkan ke psychological price point per masing-masing currency
 * supaya nominal terasa natural di kedua audience (bukan straight conversion
 * yang ujungnya angka aneh seperti "Rp 1.303.500").
 *
 * Single source of truth — semua pricing surface (register pages, pricing
 * matrix, institutional page) pulls dari sini supaya konsisten dan mudah
 * di-sync saat exchange rate bergeser.
 */
export type Locale = 'id' | 'en';

type PriceEntry = { usd: number; idr: number };

export const PRICE_TABLE = {
  // Signal tiers
  signal_starter: { usd: 19, idr: 299_000 },
  signal_pro: { usd: 79, idr: 1_290_000 },
  signal_vip: { usd: 299, idr: 4_900_000 },

  // Crypto tiers
  crypto_basic: { usd: 49, idr: 799_000 },
  crypto_pro: { usd: 199, idr: 3_290_000 },
  crypto_hnwi: { usd: 499, idr: 8_200_000 },

  // VPS License
  vps_standard_setup: { usd: 3_000, idr: 49_500_000 },
  vps_standard_monthly: { usd: 150, idr: 2_490_000 },
  vps_premium_setup: { usd: 7_500, idr: 123_500_000 },
  vps_premium_monthly: { usd: 300, idr: 4_950_000 },
  vps_dedicated_monthly: { usd: 1_499, idr: 24_700_000 },

  // Institutional
  institutional_aum_min: { usd: 250_000, idr: 4_125_000_000 },
  institutional_license_low: { usd: 75_000, idr: 1_200_000_000 },
  institutional_license_high: { usd: 110_000, idr: 1_800_000_000 },
  institutional_setup_low: { usd: 12_000, idr: 200_000_000 },
  institutional_setup_high: { usd: 25_000, idr: 400_000_000 },
  institutional_support_monthly: { usd: 1_500, idr: 25_000_000 },
} as const satisfies Record<string, PriceEntry>;

export type PriceKey = keyof typeof PRICE_TABLE;

type FormatOpts = {
  /** Period suffix — 'mo' = /bulan, 'yr' = /tahun, 'setup' = setup one-time, undefined = no suffix */
  period?: 'mo' | 'yr' | 'setup';
  /** Compact format (Rp 4 miliar / USD 250K) instead of full (Rp 4.125.000.000 / USD 250,000) */
  compact?: boolean;
};

/** Format harga sesuai locale dengan optional period suffix. */
export function formatPrice(key: PriceKey, locale: Locale, opts: FormatOpts = {}): string {
  const entry = PRICE_TABLE[key];
  const { period, compact } = opts;

  if (locale === 'id') {
    const idrStr = compact ? formatIdrCompact(entry.idr) : `Rp ${entry.idr.toLocaleString('id-ID')}`;
    return appendPeriodId(idrStr, period);
  }

  const usdStr = compact ? formatUsdCompact(entry.usd) : `$${entry.usd.toLocaleString('en-US')}`;
  return appendPeriodEn(usdStr, period);
}

function formatIdrCompact(idr: number): string {
  if (idr >= 1_000_000_000) {
    const billions = idr / 1_000_000_000;
    return `Rp ${billions % 1 === 0 ? billions : billions.toFixed(1)} miliar`;
  }
  if (idr >= 1_000_000) {
    const millions = idr / 1_000_000;
    return `Rp ${millions % 1 === 0 ? millions : millions.toFixed(1)} juta`;
  }
  if (idr >= 1_000) {
    const thousands = idr / 1_000;
    return `Rp ${thousands % 1 === 0 ? thousands : thousands.toFixed(0)}rb`;
  }
  return `Rp ${idr}`;
}

function formatUsdCompact(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) {
    const thousands = usd / 1_000;
    return `$${thousands % 1 === 0 ? thousands : thousands.toFixed(1)}K`;
  }
  return `$${usd}`;
}

function appendPeriodId(price: string, period: FormatOpts['period']): string {
  if (period === 'mo') return `${price}/bulan`;
  if (period === 'yr') return `${price}/tahun`;
  if (period === 'setup') return `${price} setup`;
  return price;
}

function appendPeriodEn(price: string, period: FormatOpts['period']): string {
  if (period === 'mo') return `${price}/mo`;
  if (period === 'yr') return `${price}/yr`;
  if (period === 'setup') return `${price} setup`;
  return price;
}

/** Range format — useful for institutional pricing tiers (low-high). */
export function formatPriceRange(
  lowKey: PriceKey,
  highKey: PriceKey,
  locale: Locale,
  opts: FormatOpts = {}
): string {
  const lowEntry = PRICE_TABLE[lowKey];
  const highEntry = PRICE_TABLE[highKey];
  const { period, compact = true } = opts;

  if (locale === 'id') {
    const low = compact ? formatIdrCompact(lowEntry.idr) : `Rp ${lowEntry.idr.toLocaleString('id-ID')}`;
    const high = compact ? formatIdrCompact(highEntry.idr) : `Rp ${highEntry.idr.toLocaleString('id-ID')}`;
    const range = `${stripCurrencyPrefix(low, 'id')}–${high}`;
    return appendPeriodId(range, period);
  }

  const low = compact ? formatUsdCompact(lowEntry.usd) : `$${lowEntry.usd.toLocaleString('en-US')}`;
  const high = compact ? formatUsdCompact(highEntry.usd) : `$${highEntry.usd.toLocaleString('en-US')}`;
  const range = `${stripCurrencyPrefix(low, 'en')}–${high}`;
  return appendPeriodEn(range, period);
}

function stripCurrencyPrefix(s: string, locale: Locale): string {
  return locale === 'id' ? s.replace(/^Rp\s/, '') : s.replace(/^\$/, '');
}
