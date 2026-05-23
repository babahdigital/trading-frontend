/**
 * Self-serve checkout entry — `/checkout?tier=CRYPTO_PRO[&promo=slug]`
 *
 * Inline Stripe-like checkout (2026-05-22):
 *   1. Customer click "Subscribe" → /checkout?tier=...
 *   2. InlineCheckout fetches /api/billing/preview untuk price + promo
 *   3. Customer pick payment method (locale-aware: EN=Card only, ID=full)
 *   4. POST /api/billing/checkout dengan paymentMethod → single-method
 *      Xendit invoice → redirect ke gateway hosted form spesifik
 *   5. Webhook → activate subscription → /portal/billing/success
 */
import dynamic from 'next/dynamic';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

const InlineCheckout = dynamic(
  () => import('@/components/checkout/inline-checkout').then((mod) => mod.InlineCheckout),
  {
    loading: () => <div className="min-h-[400px] animate-pulse bg-muted/20 rounded-lg" />,
  },
);

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const VALID_TIERS = new Set([
  'SIGNAL_STARTER', 'SIGNAL_BASIC', 'SIGNAL_PRO', 'SIGNAL_VIP',
  'CRYPTO_STARTER', 'CRYPTO_ACTIVE', 'CRYPTO_PRO', 'CRYPTO_HNWI', 'CRYPTO_BASIC',
  'VPS_STANDARD', 'VPS_PREMIUM', 'VPS_DEDICATED',
]);

const SERVICE_FROM_TIER: Record<string, 'signal' | 'crypto' | 'vps'> = {
  SIGNAL_STARTER: 'signal', SIGNAL_BASIC: 'signal', SIGNAL_PRO: 'signal', SIGNAL_VIP: 'signal',
  CRYPTO_STARTER: 'crypto', CRYPTO_ACTIVE: 'crypto', CRYPTO_PRO: 'crypto', CRYPTO_HNWI: 'crypto', CRYPTO_BASIC: 'crypto',
  VPS_STANDARD: 'vps', VPS_PREMIUM: 'vps', VPS_DEDICATED: 'vps',
};

export default async function CheckoutPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const sp = await searchParams;

  const tier = typeof sp.tier === 'string' ? sp.tier.toUpperCase() : '';
  const promoSlug = typeof sp.promo === 'string' ? sp.promo : undefined;

  if (!VALID_TIERS.has(tier)) {
    redirect(`/${locale}/pricing`);
  }

  const service = SERVICE_FROM_TIER[tier] ?? 'crypto';

  return (
    <div className="min-h-screen flex items-start justify-center px-4 py-10 sm:py-14 bg-background">
      <InlineCheckout
        tier={tier}
        service={service}
        locale={locale}
        promoSlug={promoSlug}
      />
    </div>
  );
}
