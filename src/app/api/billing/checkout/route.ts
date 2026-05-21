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
// localizeDescription() so EN payment-gateway page shows "1 Month" instead
// of "1 Bulan".
const TIER_PRICES: Record<string, { amountIdr: number; description: string }> = {
  // Forex Signal (canonical $39 / $79 / $299 — match lib/pricing-format.ts)
  SIGNAL_STARTER: { amountIdr: 600_000, description: 'Signal Starter — 1 Bulan' },
  SIGNAL_BASIC: { amountIdr: 600_000, description: 'Signal Basic (legacy alias Starter) — 1 Bulan' },
  SIGNAL_PRO: { amountIdr: 1_290_000, description: 'Signal Pro — 1 Bulan' },
  SIGNAL_VIP: { amountIdr: 4_900_000, description: 'Signal VIP — 1 Bulan' },
  // Crypto Bot rc29 5-tier (per src/lib/pricing-format.ts PRICE_TABLE)
  // free_demo = $0 (skip checkout); starter/active/pro/hnwi = paid tiers
  CRYPTO_STARTER: { amountIdr: 149_000, description: 'Crypto Starter — 1 Bulan flat' }, // $9/mo
  CRYPTO_ACTIVE: { amountIdr: 299_000, description: 'Crypto Active — 1 Bulan flat' },   // $19/mo
  CRYPTO_PRO: { amountIdr: 799_000, description: 'Crypto Pro — 1 Bulan flat' },          // $49/mo
  CRYPTO_HNWI: { amountIdr: 3_290_000, description: 'Crypto HNWI — 1 Bulan flat' },      // $199/mo
  // Legacy alias (pre-rc29) — grandfathered to STARTER pricing
  CRYPTO_BASIC: { amountIdr: 149_000, description: 'Crypto Basic (legacy alias Starter) — 1 Bulan flat' },
  // Software License (License Only / Hybrid / Full Turnkey setup)
  VPS_STANDARD: { amountIdr: 5_000_000, description: 'Software License — License Only Setup' },
  VPS_PREMIUM: { amountIdr: 12_000_000, description: 'Software License — Hybrid Setup' },
  VPS_DEDICATED: { amountIdr: 25_000_000, description: 'Software License — Full Turnkey Setup' },
  // Free + Demo (gratis — tidak boleh masuk checkout, return 400 via free_tier code)
  FREE: { amountIdr: 0, description: 'Free tier — checkout tidak diperlukan' },
  DEMO: { amountIdr: 0, description: 'Demo (gratis) — checkout tidak diperlukan' },
};

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
  const { tier, provider = 'midtrans' } = body as { tier: string; provider?: PaymentProvider };
  const pricing = TIER_PRICES[tier];
  if (!pricing) return errorResponse('invalid_tier', 'Invalid tier', 400);
  if (pricing.amountIdr === 0) {
    return errorResponse('free_tier', 'Free tier does not require checkout. Activate directly via /demo signup.', 400);
  }

  if (provider !== 'midtrans' && provider !== 'xendit') {
    return errorResponse('invalid_provider', 'Invalid payment provider. Use "midtrans" or "xendit"', 400);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return errorResponse('user_not_found', 'User not found', 404);

  const localizedDescription = localizeDescription(pricing.description, locale);

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
      amountUsd: pricing.amountIdr / 16000,
      status: 'DUE',
      dueAt,
      description: localizedDescription,
      subscriptionId: null,
      metadata: { tier, amountIdr: pricing.amountIdr, provider, idempotencyKey, clientSupplied },
    },
  });

  if (provider === 'xendit') {
    const invoice = await createXenditInvoice({
      externalId: orderId,
      amountIdr: pricing.amountIdr,
      customerName: user.name || user.email,
      customerEmail: user.email,
      description: localizedDescription,
    });

    await prisma.invoice.update({
      where: { id: orderId },
      data: { metadata: { tier, amountIdr: pricing.amountIdr, provider, idempotencyKey, clientSupplied, invoiceUrl: invoice.invoiceUrl, invoiceId: invoice.invoiceId } },
    });

    return NextResponse.json({
      orderId,
      provider: 'xendit',
      invoiceUrl: invoice.invoiceUrl,
      invoiceId: invoice.invoiceId,
    });
  }

  // Default: Midtrans
  const transaction = await createMidtransTransaction({
    orderId,
    amountIdr: pricing.amountIdr,
    customerName: user.name || user.email,
    customerEmail: user.email,
    itemDescription: localizedDescription,
  });

  await prisma.invoice.update({
    where: { id: orderId },
    data: { metadata: { tier, amountIdr: pricing.amountIdr, provider, idempotencyKey, clientSupplied, snapToken: transaction.token, redirectUrl: transaction.redirectUrl } },
  });

  return NextResponse.json({
    orderId,
    provider: 'midtrans',
    snapToken: transaction.token,
    redirectUrl: transaction.redirectUrl,
  });
}
