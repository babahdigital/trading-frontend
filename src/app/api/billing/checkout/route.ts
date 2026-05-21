import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createMidtransTransaction } from '@/lib/payment/midtrans';
import { createXenditInvoice } from '@/lib/payment/xendit';
import { randomUUID } from 'crypto';
import { resolveIdempotencyKey } from '@/lib/api/idempotency';
import { detectRequestLocale, type AppLocale } from '@/lib/i18n/server-locale';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Canonical pricing per audit 2026-04-26 + recalibration 2026-05-15 + 2026-05-20.
// IDR rate USD→IDR ~16,500 (kalau forex move significant, revisit).
// SIGNAL_BASIC = legacy alias untuk SIGNAL_STARTER, same price ($39).
//
// 2026-05-20: align dengan lib/pricing-format.ts dan landing pricing card.
// Sebelumnya SIGNAL_STARTER IDR 315k = $19 (drift dari $39 canonical).
//
// `description` stored ID-canonical; locale swap on render via
// Tier slug mapping: checkout API uses uppercase canonical (CRYPTO_STARTER),
// PricingTier DB uses lowercase kebab (crypto-starter). Map ke DB lookup.
const TIER_SLUG_MAP: Record<string, string> = {
  SIGNAL_STARTER: 'signal-starter',
  SIGNAL_BASIC: 'signal-starter',  // legacy alias
  SIGNAL_PRO: 'signal-pro',
  SIGNAL_VIP: 'signal-vip',
  CRYPTO_STARTER: 'crypto-starter',
  CRYPTO_ACTIVE: 'crypto-active',
  CRYPTO_PRO: 'crypto-pro',
  CRYPTO_HNWI: 'crypto-hnwi',
  CRYPTO_BASIC: 'crypto-starter',  // legacy alias
  VPS_STANDARD: 'vps-license-only',
  VPS_PREMIUM: 'vps-hybrid',
  VPS_DEDICATED: 'vps-turnkey',
  // FREE/DEMO tidak punya entry — handled langsung di POST handler
};

/** Lookup pricing dari DB (CMS centralization 2026-05-21). PricingTier
 *  table = single source of truth, edit via /admin/cms/pricing language
 *  langsung reflect ke checkout + landing + pricing page. Fallback empty
 *  kalau slug tidak found (legacy compat). */
async function resolveTierPricing(tier: string): Promise<{ amountIdr: number; description: string } | null> {
  if (tier === 'FREE' || tier === 'DEMO') {
    return { amountIdr: 0, description: 'Free tier — checkout tidak diperlukan' };
  }
  const slug = TIER_SLUG_MAP[tier];
  if (!slug) return null;
  const tierRow = await prisma.pricingTier.findUnique({
    where: { slug },
    select: { name: true, priceIdr: true, subtitle: true },
  });
  if (!tierRow || tierRow.priceIdr == null) return null;
  return {
    amountIdr: tierRow.priceIdr,
    description: tierRow.subtitle ? `${tierRow.name} — ${tierRow.subtitle}` : `${tierRow.name} — 1 Bulan`,
  };
}

function localizeDescription(text: string, locale: AppLocale): string {
  if (locale !== 'en') return text;
  return text
    .replace(/\b1 Bulan flat\b/g, '1 Month flat')
    .replace(/\b1 Bulan\b/g, '1 Month')
    .replace(/\bSetup\b/g, 'Setup')
    .replace(/\(gratis\)/g, '(free)')
    .replace(/checkout tidak diperlukan/g, 'checkout not required');
}

type PaymentProvider = 'midtrans' | 'xendit';

// Returns { code, error } shape. Code is locale-agnostic for frontend i18n
// lookup; error string is English fallback.
function errorResponse(code: string, message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ code, error: message, ...extra }, { status });
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return errorResponse('unauthorized', 'Unauthorized', 401);

  const locale = detectRequestLocale(req);
  const { key: idempotencyKey, clientSupplied } = resolveIdempotencyKey(req.headers, 'checkout');

  const body = await req.json();
  // Default provider: Xendit (2026-05-21 — Pak Abdullah direction).
  // Multi-currency display di invoice page (USD + IDR), API + dokumentasi
  // lebih clean, dan forex backend juga akan migrate ke Xendit eventually.
  // Midtrans tetap available kalau customer prefer atau Xendit down.
  const { tier, provider = 'xendit', promo: promoSlug } = body as {
    tier: string;
    provider?: PaymentProvider;
    promo?: string;  // optional promo slug (saat customer datang dari popup)
  };
  // CMS centralization 2026-05-21: resolve pricing dari PricingTier DB
  // bukan hardcoded TIER_PRICES. Admin edit /admin/cms/pricing → checkout
  // langsung update tanpa redeploy.
  const pricing = await resolveTierPricing(tier);
  if (!pricing) return errorResponse('invalid_tier', 'Invalid tier', 400);
  if (pricing.amountIdr === 0) {
    return errorResponse('free_tier', 'Free tier does not require checkout. Activate directly via /demo signup.', 400);
  }

  if (provider !== 'midtrans' && provider !== 'xendit') {
    return errorResponse('invalid_provider', 'Invalid payment provider. Use "midtrans" or "xendit"', 400);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return errorResponse('user_not_found', 'User not found', 404);

  // ─── Resolve discount dari Promotion active ─────────────────────────
  // Logic: kalau promoSlug provided → lookup; ELSE pick first active promo
  // yang applicableTiers includes current tier (atau empty = all-tiers).
  // Discount applied ke amountIdr dengan rounding ke psychological IDR.
  const tierSlug = tier.toLowerCase().replace(/_/g, '-');
  let appliedPromo: { id: string; slug: string; discountPercent?: number; discountFixedIdr?: number; discountValue: number; discountType: string } | null = null;
  let discountedAmount = pricing.amountIdr;

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

  for (const p of candidatePromos) {
    const tiers = Array.isArray(p.applicableTiers) ? (p.applicableTiers as string[]) : [];
    const eligible = tiers.length === 0 || tiers.includes(tierSlug);
    const underQuota = p.maxUsage === 0 || p.currentUsage < p.maxUsage;
    if (eligible && underQuota) {
      const value = Number(p.discountValue);
      const calcDiscount = p.discountType === 'PERCENT'
        ? Math.round((pricing.amountIdr * value) / 100)
        : Math.min(value, pricing.amountIdr);
      // Round ke 1000 ke bawah (psychological IDR display)
      discountedAmount = Math.max(0, Math.floor((pricing.amountIdr - calcDiscount) / 1000) * 1000);
      appliedPromo = {
        id: p.id,
        slug: p.slug,
        discountValue: value,
        discountType: p.discountType,
        ...(p.discountType === 'PERCENT' ? { discountPercent: value } : { discountFixedIdr: value }),
      };
      // Increment usage counter (best-effort, race-safe via atomic update)
      await prisma.promotion.update({
        where: { id: p.id },
        data: { currentUsage: { increment: 1 } },
      }).catch(() => undefined);
      break; // apply first eligible only
    }
  }

  const finalAmount = discountedAmount;
  const baseDescription = appliedPromo
    ? `${pricing.description} (diskon ${appliedPromo.discountValue}${appliedPromo.discountType === 'PERCENT' ? '%' : ' IDR'})`
    : pricing.description;
  const localizedDescription = localizeDescription(baseDescription, locale);

  // Idempotency: if this key already produced an invoice, return existing (no duplicate charge).
  const existing = await prisma.invoice.findFirst({
    where: { userId, metadata: { path: ['idempotencyKey'], equals: idempotencyKey } },
  });
  if (existing) {
    const meta = (existing.metadata ?? {}) as Record<string, unknown>;
    return NextResponse.json({
      orderId: existing.id,
      provider: meta.provider ?? provider,
      replay: true,
      snapToken: meta.snapToken ?? null,
      redirectUrl: meta.redirectUrl ?? null,
      invoiceUrl: meta.invoiceUrl ?? null,
    });
  }

  const orderId = `ORD-${randomUUID().slice(0, 8).toUpperCase()}`;
  const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.invoice.create({
    data: {
      id: orderId,
      userId,
      number: orderId,
      amountUsd: finalAmount / 16000,
      status: 'DUE',
      dueAt,
      description: localizedDescription,
      subscriptionId: null,
      metadata: {
        tier, amountIdr: finalAmount, originalAmountIdr: pricing.amountIdr,
        provider, idempotencyKey, clientSupplied,
        promoApplied: appliedPromo ? { id: appliedPromo.id, slug: appliedPromo.slug, discountValue: appliedPromo.discountValue, discountType: appliedPromo.discountType } : null,
      },
    },
  });

  if (provider === 'xendit') {
    const invoice = await createXenditInvoice({
      externalId: orderId,
      amountIdr: finalAmount,
      customerName: user.name || user.email,
      customerEmail: user.email,
      description: localizedDescription,
    });

    await prisma.invoice.update({
      where: { id: orderId },
      data: {
        metadata: {
          tier, amountIdr: finalAmount, originalAmountIdr: pricing.amountIdr,
          provider, idempotencyKey, clientSupplied,
          invoiceUrl: invoice.invoiceUrl, invoiceId: invoice.invoiceId,
          promoApplied: appliedPromo,
        },
      },
    });

    return NextResponse.json({
      orderId,
      provider: 'xendit',
      invoiceUrl: invoice.invoiceUrl,
      invoiceId: invoice.invoiceId,
      amountIdr: finalAmount,
      originalAmountIdr: pricing.amountIdr,
      discount: appliedPromo,
    });
  }

  // Default: Midtrans
  const transaction = await createMidtransTransaction({
    orderId,
    amountIdr: finalAmount,
    customerName: user.name || user.email,
    customerEmail: user.email,
    itemDescription: localizedDescription,
  });

  await prisma.invoice.update({
    where: { id: orderId },
    data: {
      metadata: {
        tier, amountIdr: finalAmount, originalAmountIdr: pricing.amountIdr,
        provider, idempotencyKey, clientSupplied,
        snapToken: transaction.token, redirectUrl: transaction.redirectUrl,
        promoApplied: appliedPromo,
      },
    },
  });

  return NextResponse.json({
    orderId,
    provider: 'midtrans',
    snapToken: transaction.token,
    redirectUrl: transaction.redirectUrl,
    amountIdr: finalAmount,
    originalAmountIdr: pricing.amountIdr,
    discount: appliedPromo,
  });
}
