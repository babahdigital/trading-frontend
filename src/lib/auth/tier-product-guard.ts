/**
 * Tier × Product access control per BABAHALGO_INTEGRATION.md §2.3.
 *
 * Maps subscription tiers to product entitlements. Used as a guard in
 * adapter routes (`/api/client/*`) and component renderers to prevent
 * lower-tier customers from accessing higher-tier features.
 *
 * Tier ordering: free < starter < pro < vip < dedicated.
 */

export type TierName = 'FREE' | 'STARTER' | 'PRO' | 'VIP' | 'DEDICATED' | 'PAMM_BASIC' | 'PAMM_PRO' | 'SIGNAL_BASIC' | 'SIGNAL_VIP';

export type ProductName = 'signal' | 'copy' | 'dedicated' | 'news_api' | 'ai_advisor' | 'pair_brief';

const TIER_ORDER: TierName[] = ['FREE', 'STARTER', 'SIGNAL_BASIC', 'PAMM_BASIC', 'SIGNAL_VIP', 'PAMM_PRO', 'PRO', 'VIP', 'DEDICATED'];

/** Minimum tier required per product. */
const PRODUCT_TIER_RULES: Record<ProductName, TierName> = {
  signal: 'STARTER',
  pair_brief: 'STARTER',
  copy: 'PRO',
  dedicated: 'DEDICATED',
  news_api: 'STARTER',
  ai_advisor: 'VIP',
};

export function tierIndex(tier: string | null | undefined): number {
  if (!tier) return -1;
  const upper = tier.toUpperCase() as TierName;
  return TIER_ORDER.indexOf(upper);
}

/**
 * Is the given tier eligible for the given product?
 * Returns true for unknown tiers/products only when explicitly allowed
 * — defaults to false (deny by default).
 */
export function canAccess(tier: string | null | undefined, product: ProductName): boolean {
  const minTier = PRODUCT_TIER_RULES[product];
  if (!minTier) return false;

  // Special-case Signal subscriptions get signal access regardless of order
  if (product === 'signal' && tier && /^SIGNAL_/i.test(tier)) return true;
  if (product === 'pair_brief' && tier && /^SIGNAL_|^PAMM_/i.test(tier)) return true;

  const userIdx = tierIndex(tier);
  const minIdx = tierIndex(minTier);
  return userIdx >= 0 && minIdx >= 0 && userIdx >= minIdx;
}

/** Resolve the effective tier for a request from headers (set by middleware). */
export function getTierFromRequest(headers: Headers): string | null {
  return headers.get('x-user-tier') ?? headers.get('x-license-type') ?? null;
}

/** Resolve product entitlements for a request. */
export function getProductsFromRequest(headers: Headers): ProductName[] {
  const raw = headers.get('x-user-products');
  if (!raw) return [];
  return raw
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter((p): p is ProductName => Object.keys(PRODUCT_TIER_RULES).includes(p));
}
