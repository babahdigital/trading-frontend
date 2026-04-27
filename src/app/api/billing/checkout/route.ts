import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createMidtransTransaction } from '@/lib/payment/midtrans';
import { createXenditInvoice } from '@/lib/payment/xendit';
import { randomUUID } from 'crypto';
import { resolveIdempotencyKey } from '@/lib/api/idempotency';
import { detectRequestLocale, type AppLocale } from '@/lib/i18n/server-locale';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Canonical pricing per audit 2026-04-26 (MONETIZATION_STRATEGY.md).
// IDR rates pakai estimasi USD→IDR ~16,500 (revisit saat business confirm).
// SIGNAL_BASIC = legacy alias = same price as SIGNAL_STARTER ($19).
//
// `description` stored ID-canonical; locale swap on render via
// localizeDescription() so EN payment-gateway page shows "1 Month" instead
// of "1 Bulan".
const TIER_PRICES: Record<string, { amountIdr: number; description: string }> = {
  // Forex Signal
  SIGNAL_STARTER: { amountIdr: 315_000, description: 'Signal Starter — 1 Bulan' },
  SIGNAL_BASIC: { amountIdr: 315_000, description: 'Signal Basic (legacy alias Starter) — 1 Bulan' },
  SIGNAL_PRO: { amountIdr: 1_300_000, description: 'Signal Pro — 1 Bulan' },
  SIGNAL_VIP: { amountIdr: 4_950_000, description: 'Signal VIP — 1 Bulan' },
  // Crypto Bot
  CRYPTO_BASIC: { amountIdr: 815_000, description: 'Crypto Basic — 1 Bulan + 20% profit share' },
  CRYPTO_PRO: { amountIdr: 3_300_000, description: 'Crypto Pro — 1 Bulan + 15% profit share' },
  CRYPTO_HNWI: { amountIdr: 8_250_000, description: 'Crypto HNWI — 1 Bulan + 10% profit share' },
  // VPS License
  VPS_STANDARD: { amountIdr: 49_500_000, description: 'VPS License — Setup' },
  VPS_PREMIUM: { amountIdr: 124_000_000, description: 'VPS Premium — Setup' },
  VPS_DEDICATED: { amountIdr: 24_750_000, description: 'VPS Dedicated — 1 Bulan' },
  // Demo (gratis — tidak boleh masuk checkout, return 400)
  DEMO: { amountIdr: 0, description: 'Demo (gratis) — checkout tidak diperlukan' },
};

function localizeDescription(text: string, locale: AppLocale): string {
  if (locale !== 'en') return text;
  return text
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
