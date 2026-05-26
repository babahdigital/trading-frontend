import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createMidtransTransaction } from '@/lib/payment/midtrans';
import { createXenditInvoice, type XenditPaymentMethod } from '@/lib/payment/xendit';
import { idrToUsd } from '@/lib/payment/rates';
import { randomUUID } from 'crypto';
import { resolveIdempotencyKey } from '@/lib/api/idempotency';
import { detectRequestLocale, type AppLocale } from '@/lib/i18n/server-locale';
import { checkRateLimit, rateLimitedResponse, RATE_LIMITS } from '@/lib/api/rate-limiter';

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
import { TIER_SLUG_MAP } from '@/lib/tiers/tier-slug-map';

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

  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? userId;
  const rl = checkRateLimit(ip, RATE_LIMITS.BILLING_CHECKOUT);
  if (!rl.allowed) return rateLimitedResponse(rl);

  const locale = detectRequestLocale(req);
  const { key: idempotencyKey, clientSupplied } = resolveIdempotencyKey(req.headers, 'checkout');

  const body = await req.json();
  // Default provider: Xendit (2026-05-21 — Pak Abdullah direction).
  // Multi-currency display di invoice page (USD + IDR), API + dokumentasi
  // lebih clean, dan forex backend juga akan migrate ke Xendit eventually.
  // Midtrans tetap available kalau customer prefer atau Xendit down.
  const { tier, provider = 'xendit', promo: promoSlug, paymentMethod } = body as {
    tier: string;
    provider?: PaymentProvider;
    promo?: string;  // optional promo slug (saat customer datang dari popup)
    paymentMethod?: XenditPaymentMethod;  // inline checkout single-method selection
  };
  // Inline checkout method whitelist (defense-in-depth — even though typed,
  // body is user-provided JSON so we revalidate against canonical set).
  const VALID_METHODS = new Set<XenditPaymentMethod>([
    'CREDIT_CARD', 'QRIS', 'BCA', 'BNI', 'BSI', 'BRI', 'MANDIRI', 'PERMATA',
    'OVO', 'DANA', 'SHOPEEPAY', 'LINKAJA', 'ALFAMART', 'INDOMARET',
  ]);
  if (paymentMethod && !VALID_METHODS.has(paymentMethod)) {
    return errorResponse('invalid_payment_method', 'Invalid payment method', 400);
  }
  // Non-ID locale: enforce card-only (Stripe-like — international customers
  // only see Card on our domain, and server re-asserts gate so a tampered
  // client body can't trigger non-card method server-side).
  if (locale === 'en' && paymentMethod && paymentMethod !== 'CREDIT_CARD') {
    return errorResponse('payment_method_locale_mismatch', 'Selected payment method not available for your region', 400);
  }
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

  // Email verification gate (Pak Abdullah audit 2026-05-22: zero-touch
  // automatic enforcement). Block paid checkout kalau email belum verified
  // — prevent fraud + ensure invoice email actually reaches customer.
  // Grace 7 hari setelah registration (createdAt) supaya new user bisa
  // immediately checkout walau email belum verified, dengan auto-expire.
  if (!user.emailVerifiedAt) {
    const ACCOUNT_AGE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
    const accountAgeMs = Date.now() - new Date(user.createdAt).getTime();
    if (accountAgeMs > ACCOUNT_AGE_GRACE_MS) {
      return errorResponse(
        'email_unverified',
        'Email belum terverifikasi. Cek inbox untuk link verifikasi atau request ulang via /portal/account.',
        403,
        { gracePeriodExpired: true, accountAgeDays: Math.floor(accountAgeMs / (24 * 60 * 60 * 1000)) },
      );
    }
  }

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
      discountedAmount = Math.max(0, Math.floor((pricing.amountIdr - calcDiscount) / 1000) * 1000);
      appliedPromo = {
        id: p.id,
        slug: p.slug,
        discountValue: value,
        discountType: p.discountType,
        ...(p.discountType === 'PERCENT' ? { discountPercent: value } : { discountFixedIdr: value }),
      };
      // Usage increment DEFERRED to webhook on PAID — prevents inflation
      // from abandoned/failed checkouts and concurrent race conditions.
      break;
    }
  }

  const finalAmount = discountedAmount;
  const baseDescription = appliedPromo
    ? `${pricing.description} (diskon ${appliedPromo.discountValue}${appliedPromo.discountType === 'PERCENT' ? '%' : ' IDR'})`
    : pricing.description;
  const localizedDescription = localizeDescription(baseDescription, locale);

  // Idempotency: if this key already produced a non-DRAFT invoice, return existing (no duplicate charge).
  // DRAFT invoices are orphans from a previous provider failure — skip them so the user can retry.
  const existing = await prisma.invoice.findFirst({
    where: { userId, status: { not: 'DRAFT' }, metadata: { path: ['idempotencyKey'], equals: idempotencyKey } },
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

  // Create as DRAFT — only promote to DUE after provider API succeeds.
  // If provider call fails, the cleanup deletes the orphan. If the server
  // crashes between create and provider call, the DRAFT invoice is skipped
  // by the idempotency check so the user can safely retry.
  await prisma.invoice.create({
    data: {
      id: orderId,
      userId,
      number: orderId,
      amountUsd: idrToUsd(finalAmount),
      status: 'DRAFT',
      dueAt,
      description: localizedDescription,
      subscriptionId: null,
      metadata: {
        tier, amountIdr: finalAmount, originalAmountIdr: pricing.amountIdr,
        provider, idempotencyKey, clientSupplied, locale,
        promoApplied: appliedPromo ? { id: appliedPromo.id, slug: appliedPromo.slug, discountValue: appliedPromo.discountValue, discountType: appliedPromo.discountType } : null,
      },
    },
  });

  if (provider === 'xendit') {
    let invoice;
    try {
      invoice = await createXenditInvoice({
        externalId: orderId,
        amountIdr: finalAmount,
        customerName: user.name || user.email,
        customerEmail: user.email,
        description: localizedDescription,
        // Locale-aware payment channel: EN=CC only (international),
        // ID=full Indonesian channels. Sebelumnya semua ditampilkan ke
        // semua customer — international customer bingung lihat OVO/Dana.
        locale,
        // Inline checkout (2026-05-22): user picks method on our domain,
        // we pin Xendit ke single method → gateway page langsung render
        // form spesifik (Stripe-like single-method UX).
        paymentMethod,
      });
    } catch (err) {
      // Cleanup orphan invoice supaya idempotency key tidak ke-stuck dengan
      // invoice tanpa provider data. User bisa retry tanpa idempotency conflict.
      await prisma.invoice.delete({ where: { id: orderId } }).catch(() => undefined);
      const msg = err instanceof Error ? err.message : String(err);
      return errorResponse('payment_provider_unavailable', `Payment provider temporarily unavailable. Please retry. (${msg.slice(0, 120)})`, 503);
    }

    await prisma.invoice.update({
      where: { id: orderId },
      data: {
        status: 'DUE',
        metadata: {
          tier, amountIdr: finalAmount, originalAmountIdr: pricing.amountIdr,
          provider, idempotencyKey, clientSupplied,
          invoiceUrl: invoice.invoiceUrl, invoiceId: invoice.invoiceId,
          promoApplied: appliedPromo,
          paymentMethod: paymentMethod ?? null,
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
  let transaction;
  try {
    transaction = await createMidtransTransaction({
      orderId,
      amountIdr: finalAmount,
      customerName: user.name || user.email,
      customerEmail: user.email,
      itemDescription: localizedDescription,
    });
  } catch (err) {
    await prisma.invoice.delete({ where: { id: orderId } }).catch(() => undefined);
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse('payment_provider_unavailable', `Payment provider temporarily unavailable. Please retry. (${msg.slice(0, 120)})`, 503);
  }

  await prisma.invoice.update({
    where: { id: orderId },
    data: {
      status: 'DUE',
      metadata: {
        tier, amountIdr: finalAmount, originalAmountIdr: pricing.amountIdr,
        provider, idempotencyKey, clientSupplied, locale,
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
