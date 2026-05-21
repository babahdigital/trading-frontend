/**
 * POST /api/portal/demo/activate?service=signal|crypto
 *
 * Auth required (authenticated customer). Activate demo tier untuk user
 * yang sudah login — bypass /register flow yang asumsinya guest signup.
 *
 * Idempotent: kalau user sudah punya demo subscription untuk service yang
 * sama, return existing record (replay-safe). Kalau sudah upgrade ke
 * paid tier, return 409 (tidak makes sense activate demo lagi).
 *
 * Pak Abdullah directive 2026-05-21: customer logged-in click "Coba demo"
 * tidak boleh masuk /register lagi — langsung activate dari portal.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/portal/demo/activate');

const VALID_SERVICES = ['signal', 'crypto'] as const;
type DemoService = (typeof VALID_SERVICES)[number];

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const serviceParam = request.nextUrl.searchParams.get('service')?.toLowerCase();
  if (!serviceParam || !VALID_SERVICES.includes(serviceParam as DemoService)) {
    return NextResponse.json(
      { error: 'invalid_service', message: 'service must be signal or crypto' },
      { status: 400 },
    );
  }
  const service = serviceParam as DemoService;

  // Idempotency check — kalau user sudah punya active subscription paid
  // untuk service ini, reject (demo tidak makes sense)
  if (service === 'signal') {
    const existing = await prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE', tier: { in: ['SIGNAL_STARTER', 'SIGNAL_PRO', 'SIGNAL_VIP'] } },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'already_subscribed', message: 'Anda sudah punya subscription Signal aktif', tier: existing.tier },
        { status: 409 },
      );
    }
    // Kalau sudah punya DEMO sebelumnya → return existing (replay-safe)
    const existingDemo = await prisma.subscription.findFirst({
      where: { userId, tier: 'DEMO', status: 'ACTIVE' },
    });
    if (existingDemo) {
      return NextResponse.json({
        ok: true,
        replay: true,
        subscription: { id: existingDemo.id, tier: existingDemo.tier, expiresAt: existingDemo.expiresAt },
        redirectTo: '/portal',
      });
    }

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 hari demo
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        tier: 'DEMO',
        status: 'ACTIVE',
        startsAt: new Date(),
        expiresAt,
        metadata: { activatedVia: 'portal_demo_activate', service: 'signal' },
      },
    });
    log.info(`Demo signal activated userId=${userId} subId=${subscription.id} expires=${expiresAt.toISOString()}`);
    return NextResponse.json({
      ok: true,
      subscription: { id: subscription.id, tier: subscription.tier, expiresAt },
      redirectTo: '/portal',
    });
  }

  // service === 'crypto' — CryptoBotSubscription model
  const existingCrypto = await prisma.cryptoBotSubscription.findUnique({ where: { userId } });
  if (existingCrypto && existingCrypto.status === 'ACTIVE'
      && existingCrypto.tier !== 'CRYPTO_BASIC') {
    return NextResponse.json(
      { error: 'already_subscribed', message: 'Anda sudah punya subscription crypto aktif', tier: existingCrypto.tier },
      { status: 409 },
    );
  }
  if (existingCrypto) {
    return NextResponse.json({
      ok: true,
      replay: true,
      subscription: { id: existingCrypto.id, tier: existingCrypto.tier, status: existingCrypto.status },
      redirectTo: '/portal/crypto',
    });
  }

  // Create new demo crypto subscription. Backend rc29: tier free_demo,
  // tapi DB enum CryptoSubscriptionTier tidak punya FREE_DEMO. Pakai
  // CRYPTO_BASIC sebagai legacy aliased to free_demo (lowest tier).
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const subscription = await prisma.cryptoBotSubscription.create({
    data: {
      userId,
      tier: 'CRYPTO_BASIC',  // legacy alias untuk free demo (pre-rc29)
      status: 'PENDING',     // pending sampai user connect Binance API
      monthlyFeeUsd: 0,
      profitSharePct: 0,
      expiresAt,
      maxLeverage: 2,
      maxPairs: 1,
    },
  });
  log.info(`Demo crypto activated userId=${userId} subId=${subscription.id} expires=${expiresAt.toISOString()}`);
  return NextResponse.json({
    ok: true,
    subscription: { id: subscription.id, tier: subscription.tier, status: subscription.status },
    redirectTo: '/portal/crypto/connect',
  });
}
