/**
 * Inline charge — Xendit Payment Methods API v2 entrypoint.
 *
 * Pak Abdullah audit 2026-05-22: upgrade dari Invoice API redirect ke
 * truly inline UX. Customer pilih method di domain kita, hit endpoint
 * ini, terima qr_string/account_number/charge_id, render di domain kita
 * tanpa pernah ke checkout-staging.xendit.co.
 *
 * Method routing:
 *   - QRIS: server create qr_codes → return qrString + chargeId
 *   - VA   (BCA/BNI/dll): create callback_virtual_accounts → return
 *           accountNumber + bankCode + chargeId
 *   - CREDIT_CARD: client tokenize via Xendit.js → body.tokenId →
 *           create credit_card_charges → return status (+ 3DS actionUrl
 *           kalau REQUIRES_ACTION)
 *
 * Webhook menangkap status update → activate subscription + generate PDF.
 * FE poll /api/billing/poll-status untuk live status update di UI.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import {
  createXenditCharge,
  type XenditPaymentMethod,
  type XenditPaymentInstrument,
} from '@/lib/payment/xendit';
import { idrToUsd } from '@/lib/payment/rates';
import { randomUUID } from 'crypto';
import { resolveIdempotencyKey } from '@/lib/api/idempotency';
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

const VALID_METHODS = new Set<XenditPaymentMethod>([
  'CREDIT_CARD', 'QRIS', 'BCA', 'BNI', 'BSI', 'BRI', 'MANDIRI', 'PERMATA',
]);

const VA_METHODS = new Set<XenditPaymentMethod>(['BCA', 'BNI', 'BSI', 'BRI', 'MANDIRI', 'PERMATA']);

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ code, error: message }, { status });
}

function localizeDescription(text: string, locale: AppLocale): string {
  if (locale !== 'en') return text;
  return text
    .replace(/\b1 Bulan flat\b/g, '1 Month flat')
    .replace(/\b1 Bulan\b/g, '1 Month');
}

async function resolveTierPricing(tier: string): Promise<{ amountIdr: number; description: string } | null> {
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

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return errorResponse('unauthorized', 'Unauthorized', 401);

  const locale = detectRequestLocale(req);
  const { key: idempotencyKey, clientSupplied } = resolveIdempotencyKey(req.headers, 'charge');

  const body = await req.json();
  const {
    tier,
    paymentMethod,
    tokenId,
    authenticationId,
    promo: promoSlug,
  } = body as {
    tier: string;
    paymentMethod: XenditPaymentMethod;
    tokenId?: string;
    authenticationId?: string;
    promo?: string;
  };

  if (!paymentMethod || !VALID_METHODS.has(paymentMethod)) {
    return errorResponse('invalid_payment_method', 'Invalid payment method', 400);
  }
  // Non-ID gate
  if (locale === 'en' && paymentMethod !== 'CREDIT_CARD') {
    return errorResponse('payment_method_locale_mismatch', 'Selected payment method not available for your region', 400);
  }
  // Card requires tokenId from Xendit.js client tokenization
  if (paymentMethod === 'CREDIT_CARD' && !tokenId) {
    return errorResponse('missing_card_token', 'Card token required (tokenize via Xendit.js first)', 400);
  }

  const pricing = await resolveTierPricing(tier);
  if (!pricing) return errorResponse('invalid_tier', 'Invalid tier', 400);
  if (pricing.amountIdr === 0) {
    return errorResponse('free_tier', 'Free tier does not require checkout', 400);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return errorResponse('user_not_found', 'User not found', 404);

  // Email verification gate (sama logic dengan /api/billing/checkout)
  if (!user.emailVerifiedAt) {
    const ACCOUNT_AGE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
    const accountAgeMs = Date.now() - new Date(user.createdAt).getTime();
    if (accountAgeMs > ACCOUNT_AGE_GRACE_MS) {
      return errorResponse('email_unverified', 'Email belum terverifikasi', 403);
    }
  }

  // ── Resolve promo discount ────────────────────────────────────────
  const tierSlug = tier.toLowerCase().replace(/_/g, '-');
  let appliedPromo: {
    id: string; slug: string; discountValue: number; discountType: string;
  } | null = null;
  let finalAmount = pricing.amountIdr;
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
    if (!eligible || !underQuota) continue;
    const value = Number(p.discountValue);
    const calcDiscount = p.discountType === 'PERCENT'
      ? Math.round((pricing.amountIdr * value) / 100)
      : Math.min(value, pricing.amountIdr);
    finalAmount = Math.max(0, Math.floor((pricing.amountIdr - calcDiscount) / 1000) * 1000);
    appliedPromo = {
      id: p.id, slug: p.slug, discountValue: value, discountType: p.discountType,
    };
    await prisma.promotion.update({
      where: { id: p.id }, data: { currentUsage: { increment: 1 } },
    }).catch(() => undefined);
    break;
  }

  const localizedDescription = localizeDescription(
    appliedPromo
      ? `${pricing.description} (diskon ${appliedPromo.discountValue}${appliedPromo.discountType === 'PERCENT' ? '%' : ' IDR'})`
      : pricing.description,
    locale,
  );

  // Idempotency replay
  const existing = await prisma.invoice.findFirst({
    where: { userId, metadata: { path: ['idempotencyKey'], equals: idempotencyKey } },
  });
  if (existing) {
    const meta = (existing.metadata ?? {}) as Record<string, unknown>;
    return NextResponse.json({
      orderId: existing.id,
      replay: true,
      instrument: meta.instrument ?? null,
    });
  }

  const orderId = `ORD-${randomUUID().slice(0, 8).toUpperCase()}`;
  const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.invoice.create({
    data: {
      id: orderId,
      userId,
      number: orderId,
      amountUsd: idrToUsd(finalAmount),
      status: 'DUE',
      dueAt,
      description: localizedDescription,
      subscriptionId: null,
      metadata: {
        tier, amountIdr: finalAmount, originalAmountIdr: pricing.amountIdr,
        provider: 'xendit', paymentMethod, idempotencyKey, clientSupplied, locale,
        promoApplied: appliedPromo ? {
          id: appliedPromo.id, slug: appliedPromo.slug,
          discountValue: appliedPromo.discountValue, discountType: appliedPromo.discountType,
        } : null,
      },
    },
  });

  // ── Create Xendit charge ──────────────────────────────────────────
  let instrument: XenditPaymentInstrument;
  try {
    if (paymentMethod === 'CREDIT_CARD') {
      instrument = await createXenditCharge({
        method: 'CREDIT_CARD',
        externalId: orderId,
        amountIdr: finalAmount,
        customerName: user.name || user.email,
        customerEmail: user.email,
        description: localizedDescription,
        tokenId: tokenId!,
        authenticationId,
      });
    } else if (paymentMethod === 'QRIS') {
      instrument = await createXenditCharge({
        method: 'QRIS',
        externalId: orderId,
        amountIdr: finalAmount,
        customerName: user.name || user.email,
        customerEmail: user.email,
        description: localizedDescription,
      });
    } else if (VA_METHODS.has(paymentMethod)) {
      instrument = await createXenditCharge({
        method: paymentMethod as 'BCA' | 'BNI' | 'BSI' | 'BRI' | 'MANDIRI' | 'PERMATA',
        externalId: orderId,
        amountIdr: finalAmount,
        customerName: user.name || user.email,
        customerEmail: user.email,
        description: localizedDescription,
      });
    } else {
      // Unreachable per VALID_METHODS gate above
      throw new Error('Unsupported payment method');
    }
  } catch (err) {
    // Cleanup orphan invoice supaya idempotency key tidak ke-stuck
    await prisma.invoice.delete({ where: { id: orderId } }).catch(() => undefined);
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse('payment_provider_unavailable', `Payment provider unavailable: ${msg.slice(0, 120)}`, 503);
  }

  // Persist instrument result ke metadata supaya pending page bisa
  // re-display QR/VA tanpa request ulang ke Xendit.
  const meta = await prisma.invoice.findUnique({
    where: { id: orderId },
    select: { metadata: true },
  });
  const existingMeta = (meta?.metadata ?? {}) as Record<string, unknown>;
  await prisma.invoice.update({
    where: { id: orderId },
    data: {
      metadata: {
        ...existingMeta,
        instrument: {
          id: instrument.id,
          method: instrument.method,
          status: instrument.status,
          qrString: instrument.qrString ?? null,
          accountNumber: instrument.accountNumber ?? null,
          bankCode: instrument.bankCode ?? null,
          actionUrl: instrument.actionUrl ?? null,
          expiresAt: instrument.expiresAt ?? null,
        },
      },
    },
  });

  return NextResponse.json({
    orderId,
    instrument: {
      id: instrument.id,
      method: instrument.method,
      status: instrument.status,
      qrString: instrument.qrString,
      accountNumber: instrument.accountNumber,
      bankCode: instrument.bankCode,
      actionUrl: instrument.actionUrl,
      expiresAt: instrument.expiresAt,
      amountIdr: finalAmount,
    },
    discount: appliedPromo,
  });
}
