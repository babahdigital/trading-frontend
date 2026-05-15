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

  // Institutional — calibrated 2026-05-15 berdasarkan market research:
  // - QuantConnect institutional: $20-150K/year
  // - TradeStation API: $5-25K/year
  // - MetaQuotes MT5 server: $5-100K/year
  // - Indonesian B2B SaaS finance enterprise: Rp 100-500 juta/tahun
  //
  // Sweet spot rasional license/AUM ratio: 5-12% (B2B SaaS finance standard).
  // AUM minimum $200K = Rp 3,2 miliar — entry point realistic untuk klien
  // family office / hedge fund kecil / prop firm yang serius berinvestasi
  // di infrastruktur trading dedicated. Di bawah ini, klien dilayani oleh
  // produk reguler (Robot Meta Tier 3 All-In Rp 4,9jt/bulan).
  //
  // Versi sebelumnya ($250K AUM + $75-110K license = 30-44% ratio) tidak
  // masuk akal — klien tidak akan beli software senilai 1/3 modalnya.
  institutional_aum_min: { usd: 200_000, idr: 3_200_000_000 },
  institutional_license_low: { usd: 15_000, idr: 250_000_000 },
  institutional_license_high: { usd: 25_000, idr: 400_000_000 },
  institutional_setup_low: { usd: 5_000, idr: 75_000_000 },
  institutional_setup_high: { usd: 10_000, idr: 150_000_000 },
  institutional_support_monthly: { usd: 750, idr: 12_000_000 },
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

/**
 * Auto-convert USD ke locale dengan psychological rounding.
 * Untuk pricing surface yang tidak butuh entry di PRICE_TABLE (e.g. Developer
 * API marketplace tier prices, dimana audience technical sehingga rounding
 * presisi tidak critical).
 *
 * USD → IDR pakai exchange rate konstanta (~16.500 per 2026-05) lalu
 * di-round ke psychological brackets: ratusan ribu / juta / puluhan juta.
 */
const USD_TO_IDR_RATE = 16_500;

export function formatUsdAuto(usd: number, locale: Locale, period?: 'mo' | 'yr' | 'setup'): string {
  if (usd === 0) return locale === 'id' ? 'Gratis' : '$0';

  if (locale === 'id') {
    const idr = roundIdrPsychological(usd * USD_TO_IDR_RATE);
    return appendPeriodId(formatIdrCompact(idr), period);
  }

  const usdStr = usd >= 1_000 ? `$${usd.toLocaleString('en-US')}` : `$${usd}`;
  return appendPeriodEn(usdStr, period);
}

function roundIdrPsychological(idr: number): number {
  if (idr < 1_000_000) return Math.round(idr / 50_000) * 50_000; // round to 50k
  if (idr < 10_000_000) return Math.round(idr / 100_000) * 100_000; // round to 100k
  if (idr < 100_000_000) return Math.round(idr / 1_000_000) * 1_000_000; // round to 1M
  if (idr < 1_000_000_000) return Math.round(idr / 10_000_000) * 10_000_000; // round to 10M
  return Math.round(idr / 100_000_000) * 100_000_000; // round to 100M for billions
}

/** Range "$X-$Y" auto-converted. Used for AI Explainability "$99-$299/mo" style. */
export function formatUsdRangeAuto(
  lowUsd: number,
  highUsd: number,
  locale: Locale,
  period?: 'mo' | 'yr' | 'setup',
): string {
  if (locale === 'id') {
    const low = formatIdrCompact(roundIdrPsychological(lowUsd * USD_TO_IDR_RATE));
    const high = formatIdrCompact(roundIdrPsychological(highUsd * USD_TO_IDR_RATE));
    return appendPeriodId(`${stripCurrencyPrefix(low, 'id')}–${high}`, period);
  }
  return appendPeriodEn(`$${lowUsd}–$${highUsd}`, period);
}
