/**
 * Centralized tier slug mapping — SINGLE SOURCE OF TRUTH.
 *
 * Checkout, charge, preview, and register APIs all use uppercase canonical
 * tier names (CRYPTO_STARTER), while PricingTier DB uses lowercase kebab
 * (crypto-starter). This map bridges the two.
 *
 * Update HERE when tiers are added/renamed — all billing routes follow.
 */

export const TIER_SLUG_MAP: Record<string, string> = {
  // Signal (Forex MT5)
  SIGNAL_STARTER: 'signal-starter',
  SIGNAL_BASIC: 'signal-starter',
  SIGNAL_PRO: 'signal-pro',
  SIGNAL_VIP: 'signal-vip',

  // Crypto (Binance USDT-M Futures)
  CRYPTO_STARTER: 'crypto-starter',
  CRYPTO_ACTIVE: 'crypto-active',
  CRYPTO_PRO: 'crypto-pro',
  CRYPTO_HNWI: 'crypto-hnwi',
  CRYPTO_BASIC: 'crypto-starter',

  // VPS License
  VPS_STANDARD: 'vps-license-only',
  VPS_PREMIUM: 'vps-hybrid',
  VPS_DEDICATED: 'vps-turnkey',
};

export function resolveTierSlug(tier: string): string | undefined {
  return TIER_SLUG_MAP[tier];
}
