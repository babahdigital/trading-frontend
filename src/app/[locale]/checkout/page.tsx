/**
 * Self-serve checkout entry — `/checkout?tier=CRYPTO_PRO&provider=xendit`
 *
 * Flow:
 *   1. Customer click "Subscribe" di pricing card → /checkout?tier=...
 *   2. Page detect auth state
 *      - Unauth → redirect /register?service=crypto&tier=X&from=checkout
 *      - Auth   → auto-POST /api/billing/checkout + redirect ke gateway
 *   3. Gateway hosted page → customer pay → webhook → activate subscription
 *
 * Server component untuk auth detection + initial render; client component
 * untuk POST + redirect logic.
 */
import { redirect } from 'next/navigation';
import { CheckoutAutoStart } from '@/components/checkout/checkout-auto-start';
import type { Metadata } from 'next';

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
  const providerParam = typeof sp.provider === 'string' ? sp.provider.toLowerCase() : 'xendit';
  const provider: 'midtrans' | 'xendit' = providerParam === 'midtrans' ? 'midtrans' : 'xendit';

  if (!VALID_TIERS.has(tier)) {
    redirect(`/${locale}/pricing`);
  }

  const service = SERVICE_FROM_TIER[tier] ?? 'crypto';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <CheckoutAutoStart
        tier={tier}
        provider={provider}
        service={service}
        locale={locale}
      />
    </div>
  );
}
