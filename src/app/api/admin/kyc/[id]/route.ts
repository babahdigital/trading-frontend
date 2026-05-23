export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/require-admin';
import { proxyToCryptoBackend, cryptoBackendConfigured } from '@/lib/proxy/crypto-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/kyc');

const ReviewBody = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'ADDITIONAL_INFO_REQUIRED']),
  rejectionReason: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
}).strict();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = requireAdmin(request);
  if (guard) return guard;
  const { id } = await params;
  const kyc = await prisma.userKyc.findUnique({
    where: { id },
    include: { user: { select: { email: true, name: true, createdAt: true } } },
  });
  if (!kyc) return NextResponse.json({ code: 'not_found', error: 'Not found' }, { status: 404 });
  return NextResponse.json({ kyc });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = requireAdmin(request);
  if (guard) return guard;
  const reviewerId = request.headers.get('x-user-id');
  if (!reviewerId) {
    return NextResponse.json({ code: 'forbidden', error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  let body: z.infer<typeof ReviewBody>;
  try {
    body = ReviewBody.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid_body', details: err instanceof Error ? err.message : 'parse error' },
      { status: 400 },
    );
  }

  const existing = await prisma.userKyc.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ code: 'not_found', error: 'Not found' }, { status: 404 });
  if (existing.status === 'APPROVED' && body.decision !== 'APPROVED') {
    return NextResponse.json({ code: 'conflict', error: 'cannot_revert_approval' }, { status: 409 });
  }

  const updated = await prisma.userKyc.update({
    where: { id },
    data: {
      status: body.decision,
      reviewedAt: new Date(),
      reviewedBy: reviewerId,
      rejectionReason: body.decision === 'APPROVED' ? null : (body.rejectionReason ?? existing.rejectionReason),
      notes: body.notes ?? existing.notes,
    },
  });

  // Backend rc37 chain — saat KYC APPROVED, trigger tenant activate di backend
  // crypto supaya tier gate buka (backend tier-based KYC gate require APPROVED
  // status). Fail-soft: kalau backend down atau tidak configured, FE record
  // tetap saved + admin lihat warning di response.
  let backendActivation: { ok: boolean; status?: number; message?: string } | undefined;
  if (body.decision === 'APPROVED') {
    const sub = await prisma.cryptoBotSubscription.findUnique({
      where: { userId: updated.userId },
      select: { cryptoTenantId: true, status: true },
    });
    if (sub?.cryptoTenantId && cryptoBackendConfigured()) {
      try {
        const res = await proxyToCryptoBackend({
          scope: 'admin',
          path: `/api/admin/tenants/${encodeURIComponent(sub.cryptoTenantId)}/activate`,
          method: 'POST',
          forwardUserId: reviewerId,
        });
        backendActivation = { ok: res.ok, status: res.status };
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          backendActivation.message = text.slice(0, 200);
          log.warn(`Tenant activate failed tenant=${sub.cryptoTenantId} status=${res.status}`);
        } else {
          log.info(`Tenant activate OK tenant=${sub.cryptoTenantId} reviewer=${reviewerId}`);
          // Sync local subscription status saat backend confirm activation
          await prisma.cryptoBotSubscription.update({
            where: { userId: updated.userId },
            data: { status: 'ACTIVE', activatedAt: new Date() },
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown';
        backendActivation = { ok: false, message };
        log.warn(`Tenant activate error: ${message}`);
      }
    } else {
      backendActivation = { ok: false, message: sub?.cryptoTenantId ? 'crypto_backend_not_configured' : 'no_crypto_subscription' };
    }
  }

  return NextResponse.json({ ok: true, kyc: updated, backendActivation });
}
