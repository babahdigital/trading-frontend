/**
 * Pricing DB overlay — fetch PricingTier rows + build Map<PriceKey, {usd, idr}>
 * untuk override hardcoded PRICE_TABLE di lib/pricing-format.ts.
 *
 * CMS centralization 2026-05-21 (Pak Abdullah directive): admin edit
 * /admin/cms/pricing → PricingTier.priceIdr update → semua pricing surface
 * (pricing page, landing, checkout) refresh ke price baru tanpa redeploy.
 *
 * Mapping PricingTier.slug → PriceKey:
 *   crypto-demo    → crypto_demo
 *   crypto-starter → crypto_starter
 *   ... (slug dash separator → priceKey underscore)
 *
 * Plus aliases (legacy keys):
 *   vps-license-only → vps_license_only_setup
 *   vps-hybrid       → vps_hybrid_setup
 *   vps-turnkey      → vps_turnkey_setup
 *   signal-starter   → signal_starter (+ signal_basic legacy alias)
 *
 * Cache: per-request memoization (server components share map per render).
 */
import { prisma } from '@/lib/db/prisma';
import { PRICE_TABLE, type PriceKey, type PriceOverrides } from '@/lib/pricing-format';

// PricingTier.slug → PriceKey mapping. Map ke key set yang ada di PRICE_TABLE
// (semua valid PriceKey). Slug yang tidak punya match akan di-skip.
const SLUG_TO_PRICE_KEY: Record<string, PriceKey[]> = {
  // Crypto rc29
  'crypto-demo':    ['crypto_demo'],
  'crypto-starter': ['crypto_starter'],
  'crypto-active':  ['crypto_active'],
  'crypto-pro':     ['crypto_pro', 'crypto_basic'],   // basic = legacy alias starter
  'crypto-hnwi':    ['crypto_hnwi'],
  // Signal 3-tier
  'signal-starter': ['signal_starter'],
  'signal-pro':     ['signal_pro'],
  'signal-vip':     ['signal_vip'],
  // VPS — DB stores setup price, monthly di metadata. Override setup keys only.
  'vps-license-only': ['vps_license_only_setup', 'vps_standard_setup'],
  'vps-hybrid':       ['vps_hybrid_setup', 'vps_premium_setup'],
  'vps-turnkey':      ['vps_turnkey_setup'],
};

/** Fetch DB overrides untuk semua tier yang isVisible. Returns Map siap pass
 *  ke formatPrice. Per-request cache via Next data cache (60s revalidate). */
export async function getPricingOverrides(): Promise<PriceOverrides> {
  try {
    const rows = await prisma.pricingTier.findMany({
      where: { isVisible: true },
      select: { slug: true, priceIdr: true, priceUsd: true },
    });

    const overrides: PriceOverrides = {};
    for (const row of rows) {
      if (row.priceIdr == null || row.priceUsd == null) continue;
      const priceKeys = SLUG_TO_PRICE_KEY[row.slug];
      if (!priceKeys) continue;
      for (const key of priceKeys) {
        // Only override kalau key valid di PRICE_TABLE (type-safety)
        if (key in PRICE_TABLE) {
          overrides[key] = { usd: row.priceUsd, idr: row.priceIdr };
        }
      }
    }
    return overrides;
  } catch {
    // Fail-soft — kalau DB tidak reachable, return empty (use PRICE_TABLE fallback)
    return {};
  }
}
