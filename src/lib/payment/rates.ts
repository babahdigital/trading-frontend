/**
 * USD/IDR conversion rate — single source of truth.
 *
 * Pak Abdullah audit 2026-05-22: sebelumnya hardcoded inconsistent across
 * codebase (checkout/route.ts pakai 16000, promo-strategist pakai 16500,
 * pricing display pakai 16500). Display lebih tepat = 16500 (current
 * market rate per BI 2026-Q2). USD displayed dihitung dari IDR truth
 * (priceIdr dari PricingTier DB).
 *
 * Future: kalau forex move >5%, revisit. Atau hook ke USDIDR ticker
 * live rate (kita sudah punya di /api/public/ticker).
 */
export const USD_IDR_RATE = 16_500;

/** Convert IDR amount → USD display value, rounded ke 2 decimals. */
export function idrToUsd(amountIdr: number): number {
  return Math.round((amountIdr / USD_IDR_RATE) * 100) / 100;
}
