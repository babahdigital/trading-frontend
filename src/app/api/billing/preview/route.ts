/**
 * Billing preview — return tier pricing + applied promo WITHOUT creating
 * Invoice row or hitting payment gateway. Powers the inline checkout
 * order-summary block (Stripe-like UX): customer melihat angka + diskon
 * sebelum memilih payment method.
 *
 * Lightweight read-only endpoint. Auth required supaya promo apply
 * konsisten dengan /api/billing/checkout (some promos eligible per-user).
 *
 * NOTE: preview tidak increment Promotion.currentUsage — itu cuma terjadi
 * saat customer benar-benar create invoice via /api/billing/checkout.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { idrToUsd } from '@/lib/payment/rates';
import { detectRequestLocale, type AppLocale } from '@/lib/i18n/server-locale';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TIER_SLUG_MAP: Record<string, string> = {
  SIGNAL_STARTER: 'signal-starter',
  SIGNAL_BASIC: 'signal-starter',
  SIGNAL_PRO: 'signal-pro',
  SIGNAL_VIP: 'signal-vip',
  CRYPTO_STARTER: 'crypto-starter',
  CRYPTO_ACTIVE: 'crypto-active',
  CRYPTO_PRO: 'crypto-pro',
  CRYPTO_HNWI: 'crypto-hnwi',
  CRYPTO_BASIC: 'crypto-starter',
  VPS_STANDARD: 'vps-license-only',
  VPS_PREMIUM: 'vps-hybrid',
  VPS_DEDICATED: 'vps-turnkey',
};

function localizeDescription(text: string, locale: AppLocale): string {
  if (locale !== 'en') return text;
  return text
    .replace(/\b1 Bulan flat\b/g, '1 Month flat')
    .replace(/\b1 Bulan\b/g, '1 Month')
    .replace(/\(gratis\)/g, '(free)');
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ code: 'unauthorized', error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const tier = (url.searchParams.get('tier') ?? '').toUpperCase();
  const promoSlug = url.searchParams.get('promo') ?? undefined;
  const locale = detectRequestLocale(req);

  const slug = TIER_SLUG_MAP[tier];
  if (!slug) {
    return NextResponse.json({ code: 'invalid_tier', error: 'Invalid tier' }, { status: 400 });
  }

  const tierRow = await prisma.pricingTier.findUnique({
    where: { slug },
    select: { name: true, priceIdr: true, subtitle: true },
  });
  if (!tierRow || tierRow.priceIdr == null) {
    return NextResponse.json({ code: 'tier_not_found', error: 'Tier not found' }, { status: 404 });
  }

  const originalAmountIdr = tierRow.priceIdr;
  const description = tierRow.subtitle
    ? `${tierRow.name} — ${tierRow.subtitle}`
    : `${tierRow.name} — 1 Bulan`;

  const now = new Date();
  const candidatePromos = await prisma.promotion.findMany({
    where: {
      status: 'ACTIVE',
      startsAt: { lte: now },
      endsAt: { gte: now },
      ...(promoSlug ? { slug: promoSlug } : {}),
    },
    orderBy: { startsAt: 'desc' },
  });

  const tierKebab = tier.toLowerCase().replace(/_/g, '-');
  let appliedPromo: {
    id: string;
    slug: string;
    discountValue: number;
    discountType: 'PERCENT' | 'FIXED_IDR';
  } | null = null;
  let discountedAmount = originalAmountIdr;

  for (const p of candidatePromos) {
    const tiers = Array.isArray(p.applicableTiers) ? (p.applicableTiers as string[]) : [];
    const eligible = tiers.length === 0 || tiers.includes(tierKebab);
    const underQuota = p.maxUsage === 0 || p.currentUsage < p.maxUsage;
    if (!eligible || !underQuota) continue;
    const value = Number(p.discountValue);
    const calcDiscount = p.discountType === 'PERCENT'
      ? Math.round((originalAmountIdr * value) / 100)
      : Math.min(value, originalAmountIdr);
    discountedAmount = Math.max(0, Math.floor((originalAmountIdr - calcDiscount) / 1000) * 1000);
    appliedPromo = {
      id: p.id,
      slug: p.slug,
      discountValue: value,
      discountType: p.discountType as 'PERCENT' | 'FIXED_IDR',
    };
    break;
  }

  return NextResponse.json({
    tier,
    description: localizeDescription(description, locale),
    originalAmountIdr,
    amountIdr: discountedAmount,
    amountUsd: idrToUsd(discountedAmount),
    discount: appliedPromo,
    locale,
  });
}
