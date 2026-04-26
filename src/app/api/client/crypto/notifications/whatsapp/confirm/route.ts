export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCryptoEligible } from '@/lib/auth/crypto-eligibility';
import { confirmCryptoWhatsappOtp } from '@/lib/whatsapp/crypto-prefs-proxy';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/client/crypto/notifications/whatsapp/confirm');

const bodySchema = z.object({
  code: z.string().min(1, 'code_required'),
}).strict();

/**
 * POST /api/client/crypto/notifications/whatsapp/confirm
 *
 * Submit OTP code to verify the WhatsApp number bound on the crypto
 * preferences record. Phase 2 backend stub accepts only "000000".
 */
export async function POST(request: NextRequest) {
  const gate = await requireCryptoEligible(request, { allowPaused: true });
  if (!gate.ok) return gate.response;
  const tenantId = gate.subscription.cryptoTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: 'no_crypto_tenant' }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'invalid_payload' }, { status: 400 });
  }

  const result = await confirmCryptoWhatsappOtp(tenantId, gate.userId, parsed.data.code);
  if (!result.ok) {
    log.warn(`crypto OTP confirm failed (status=${result.status}): ${result.error}`);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.result);
}
