export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { createLogger } from '@/lib/logger';
import { hashOtp, OTP_CONSTANTS } from '@/lib/whatsapp/otp';
import { updateWhatsappConfig } from '@/lib/whatsapp/backend-proxy';
import type { WhatsappConfigPatch } from '@/lib/whatsapp/types';

const log = createLogger('api/client/whatsapp/verify/confirm');

const bodySchema = z.object({
  product: z.enum(['forex', 'crypto']),
  verificationId: z.string().min(1),
  otp: z.string().regex(/^\d{6}$/, 'invalid_otp_format'),
  routingTarget: z.enum(['alerts', 'ops', 'digest']),
}).strict();

/**
 * POST /api/client/whatsapp/verify/confirm
 *
 * Validates an OTP, marks the verification row consumed, then PATCHes
 * the corresponding backend WA config to set the verified target.
 *
 * Why we mutate config here: keeps the FE workflow atomic — user finishes
 * verification and the number is bound, no extra "save" click needed.
 */
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'invalid_payload' }, { status: 400 });
  }

  const { product, verificationId, otp, routingTarget } = parsed.data;

  const verification = await prisma.whatsappVerification.findUnique({
    where: { id: verificationId },
  });

  if (!verification || verification.userId !== userId || verification.product !== product) {
    return NextResponse.json({ error: 'verification_not_found' }, { status: 404 });
  }

  if (verification.consumedAt) {
    return NextResponse.json({ error: 'verification_already_used' }, { status: 410 });
  }

  if (verification.expiresAt < new Date()) {
    return NextResponse.json({ error: 'verification_expired' }, { status: 410 });
  }

  if (verification.attempts >= OTP_CONSTANTS.MAX_ATTEMPTS) {
    return NextResponse.json({ error: 'verification_too_many_attempts' }, { status: 429 });
  }

  const expectedHash = hashOtp(otp);
  if (expectedHash !== verification.otpHash) {
    await prisma.whatsappVerification.update({
      where: { id: verification.id },
      data: { attempts: { increment: 1 } },
    });
    return NextResponse.json({ error: 'invalid_otp' }, { status: 400 });
  }

  // Mark consumed, then PATCH backend config to bind the verified target.
  await prisma.whatsappVerification.update({
    where: { id: verification.id },
    data: { consumedAt: new Date() },
  });

  const patch: WhatsappConfigPatch = { enabled: true };
  if (routingTarget === 'alerts') patch.alertsTarget = verification.e164;
  if (routingTarget === 'ops') patch.opsTarget = verification.e164;
  if (routingTarget === 'digest') patch.digestTarget = verification.e164;

  const update = await updateWhatsappConfig(product, userId, patch);
  if (!update.ok) {
    log.warn(`config update after OTP confirm failed: ${update.error}`);
    return NextResponse.json({
      verified: true,
      config: null,
      error: update.error,
    }, { status: update.status });
  }

  return NextResponse.json({ verified: true, config: update.config });
}
