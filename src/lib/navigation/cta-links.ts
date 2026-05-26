/**
 * CTA Link Registry — SINGLE SOURCE OF TRUTH for all call-to-action destinations.
 *
 * All components that render CTA buttons/links should import from here instead
 * of hardcoding URL strings. When route structure changes, update HERE ONLY.
 *
 * Usage:
 *   import { CTA } from '@/lib/navigation/cta-links';
 *   <Link href={CTA.registerCrypto()}> → '/register?service=crypto'
 *   <Link href={CTA.checkoutTier('CRYPTO_PRO')}> → '/checkout?tier=CRYPTO_PRO&provider=xendit'
 */

// ─── Registration ───

export function registerSignal() { return '/register?service=signal'; }
export function registerCrypto(tier?: string) {
  return tier ? `/register?service=crypto&tier=${tier}` : '/register?service=crypto';
}
export function registerVps() { return '/register?service=vps'; }
export function registerInstitutional() { return '/register?service=institutional'; }
export function registerFree() { return '/register?service=free'; }

// ─── Checkout ───

export function checkoutTier(tier: string, provider = 'xendit') {
  return `/checkout?tier=${tier}&provider=${provider}`;
}

// ─── Contact ───

export function contactSales() { return '/contact'; }
export function contactSubject(subject: string) { return `/contact?subject=${subject}`; }
export function contactCryptoHnwi() { return '/contact?subject=crypto-hnwi'; }
export function contactDedicatedVps() { return '/contact?subject=dedicated-vps'; }
export function contactInstitutional() { return '/contact?subject=institutional'; }
export function contactBeta() { return '/contact?subject=beta-founding-member'; }

// ─── Product Pages ───

export function demo(product?: string) {
  return product ? `/demo?product=${product}` : '/demo';
}
export function pricing() { return '/pricing'; }
export function performance() { return '/performance'; }

// ─── Convenience namespace ───

export const CTA = {
  registerSignal,
  registerCrypto,
  registerVps,
  registerInstitutional,
  registerFree,
  checkoutTier,
  contactSales,
  contactSubject,
  contactCryptoHnwi,
  contactDedicatedVps,
  contactInstitutional,
  contactBeta,
  demo,
  pricing,
  performance,
} as const;
