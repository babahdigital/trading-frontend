/**
 * Admin proxy: POST /api/admin/tenants/provision — create new crypto tenant.
 *
 * Backend rc38.1 (rate-limited 5/min). Used saat admin manually provision
 * crypto tenant untuk customer baru (alternative ke automatic activation
 * setelah subscription payment success).
 *
 * Workflow normal:
 *   1. Customer subscribe crypto tier via /pricing → invoice paid → activateSubscription()
 *   2. Backend webhook chain → /api/admin/tenants/provision creates Binance-side tenant
 *   3. Admin atau system → /api/admin/tenants/{id}/activate
 *
 * Manual path (this endpoint): admin operator creates tenant directly via
 * /admin/customers untuk customer yang sub via wire transfer / out-of-band.
 *
 * Scope: ADMIN.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { proxyToCryptoBackend, cryptoBackendConfigured } from '@/lib/proxy/crypto-client';
import { requireAdmin } from '@/lib/auth/require-admin';
import { prisma } from '@/lib/db/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/crypto/tenants/provision');

const ProvisionBody = z.object({
  /** FE user yang akan di-link ke tenant baru (User.id) */
  userId: z.string().min(1).max(64),
  /** Crypto tier untuk tenant (e.g. CRYPTO_STARTER, CRYPTO_ACTIVE, CRYPTO_PRO, CRYPTO_HNWI) */
  tier: z.enum(['CRYPTO_STARTER', 'CRYPTO_ACTIVE', 'CRYPTO_PRO', 'CRYPTO_HNWI']).optional(),
  /** Optional metadata untuk backend (notif_lang, max_leverage override, dll) */
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  const guard = requireAdmin(request);
  if (guard) return guard;

  const reviewerId = request.headers.get('x-user-id');
  if (!reviewerId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: z.infer<typeof ProvisionBody>;
  try {
    body = ProvisionBody.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid_body', details: err instanceof Error ? err.message : 'parse error' },
      { status: 400 },
    );
  }

  if (!cryptoBackendConfigured()) {
    return NextResponse.json(
      { error: 'crypto_backend_not_configured', message: 'CRYPTO_BACKEND_URL / token belum di-set di env' },
      { status: 503 },
    );
  }

  // Validate target user exists + tidak punya cryptoTenantId existing
  const targetUser = await prisma.user.findUnique({
    where: { id: body.userId },
    select: { id: true, email: true },
  });
  if (!targetUser) {
    return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
  }

  const existingSub = await prisma.cryptoBotSubscription.findUnique({
    where: { userId: body.userId },
    select: { cryptoTenantId: true },
  });
  if (existingSub?.cryptoTenantId) {
    return NextResponse.json(
      { error: 'tenant_already_exists', cryptoTenantId: existingSub.cryptoTenantId },
      { status: 409 },
    );
  }

  try {
    const res = await proxyToCryptoBackend({
      scope: 'admin',
      path: '/api/admin/tenants/provision',
      method: 'POST',
      body: {
        babahalgo_user_id: body.userId,
        email: targetUser.email,
        tier: body.tier,
        metadata: body.metadata,
      },
      forwardUserId: reviewerId,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      log.warn(`Provision backend HTTP ${res.status}: ${text.slice(0, 200)}`);
      return NextResponse.json(
        { error: 'backend_failed', status: res.status, details: text.slice(0, 500) },
        { status: res.status },
      );
    }

    const data = await res.json();
    const cryptoTenantId = String(data.tenant_id ?? data.id ?? '');

    // Persist mapping ke local FE — useful supaya audit subsequent operations
    if (cryptoTenantId) {
      await prisma.cryptoBotSubscription.upsert({
        where: { userId: body.userId },
        create: {
          userId: body.userId,
          tier: (body.tier ?? 'CRYPTO_STARTER') as 'CRYPTO_STARTER' | 'CRYPTO_ACTIVE' | 'CRYPTO_PRO' | 'CRYPTO_HNWI',
          status: 'PENDING',
          cryptoTenantId,
          monthlyFeeUsd: 0,
          profitSharePct: 0,
        },
        update: { cryptoTenantId },
      });
      log.info(`Tenant provisioned user=${body.userId} tenant=${cryptoTenantId} tier=${body.tier ?? 'CRYPTO_STARTER'} by=${reviewerId}`);
    }

    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    log.warn(`Provision error: ${message}`);
    return NextResponse.json({ error: 'proxy_error', message }, { status: 500 });
  }
}
