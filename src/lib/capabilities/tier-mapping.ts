/**
 * Capabilities tier mapping.
 *
 * Backend `trading-forex` capability gating uses 5-tier ladder:
 * `beta < starter < pro < vip < dedicated`.
 *
 * Frontend uses canonical SubscriptionTier values per audit 2026-04-26:
 * `DEMO`, `SIGNAL_STARTER`, `SIGNAL_BASIC` (legacy alias), `SIGNAL_PRO`, `SIGNAL_VIP`.
 * Plus VPS-related (VPS_*) tiers map to `dedicated`.
 *
 * Source of truth — capabilities catalog tier rank:
 * - beta:      $0 (30d trial / DEMO)
 * - starter:   $19/mo Signal Starter
 * - pro:       $79/mo Signal Pro
 * - vip:       $299/mo Signal VIP
 * - dedicated: $999 setup + $199/mo (Dedicated VPS)
 */

export type CapabilityTier = 'beta' | 'starter' | 'pro' | 'vip' | 'dedicated';

export const CAPABILITY_TIER_ORDER: readonly CapabilityTier[] = [
  'beta',
  'starter',
  'pro',
  'vip',
  'dedicated',
] as const;

const SUBSCRIPTION_TO_CAPABILITY: Record<string, CapabilityTier> = {
  // Demo / free
  DEMO: 'beta',
  // Forex Signal canonical
  SIGNAL_STARTER: 'starter',
  SIGNAL_BASIC: 'starter', // legacy alias
  SIGNAL_PRO: 'pro',
  SIGNAL_VIP: 'vip',
  // VPS = dedicated capability tier
  VPS_STANDARD: 'dedicated',
  VPS_PREMIUM: 'dedicated',
  VPS_DEDICATED: 'dedicated',
  // Crypto Bot — separate product, but for capability-overlap (signals/indicators)
  // map by USD price equivalent
  CRYPTO_BASIC: 'pro',
  CRYPTO_PRO: 'vip',
  CRYPTO_HNWI: 'dedicated',
};

const LICENSE_TO_CAPABILITY: Record<string, CapabilityTier> = {
  VPS_INSTALLATION: 'dedicated',
  SIGNAL_SUBSCRIBER: 'pro',
  PAMM_SUBSCRIBER: 'pro', // legacy
};

/**
 * Resolve capability tier from a subscription tier string OR license type.
 * Returns 'beta' as conservative fallback for unknown tiers.
 */
export function toCapabilityTier(
  subscriptionTier: string | null | undefined,
  licenseType?: string | null,
): CapabilityTier {
  if (subscriptionTier) {
    const upper = subscriptionTier.toUpperCase();
    const mapped = SUBSCRIPTION_TO_CAPABILITY[upper];
    if (mapped) return mapped;
  }
  if (licenseType) {
    const upper = licenseType.toUpperCase();
    const mapped = LICENSE_TO_CAPABILITY[upper];
    if (mapped) return mapped;
  }
  return 'beta';
}

/** Numeric rank for tier comparison. */
export function tierRank(tier: CapabilityTier): number {
  return CAPABILITY_TIER_ORDER.indexOf(tier);
}

/** True if `currentTier` includes everything in `requiredTier` and below. */
export function tierIncludes(currentTier: CapabilityTier, requiredTier: CapabilityTier): boolean {
  return tierRank(currentTier) >= tierRank(requiredTier);
}

/** Pretty label per UI surface (institutional-grade). */
export function tierLabel(tier: CapabilityTier, locale: 'id' | 'en' = 'id'): string {
  const labels: Record<CapabilityTier, { id: string; en: string }> = {
    beta: { id: 'Beta (Gratis 30 hari)', en: 'Beta (30-day free)' },
    starter: { id: 'Signal Starter', en: 'Signal Starter' },
    pro: { id: 'Signal Pro', en: 'Signal Pro' },
    vip: { id: 'Signal VIP', en: 'Signal VIP' },
    dedicated: { id: 'Dedicated', en: 'Dedicated' },
  };
  return labels[tier][locale];
}
