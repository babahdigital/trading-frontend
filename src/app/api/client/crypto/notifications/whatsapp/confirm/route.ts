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
 * preferences record. Real Fonnte OTP is now live.
 */
export async function POST(request: NextRequest) {
  try {
  const gate = await requireCryptoEligible(request, { allowPaused: true });
  if (!gate.ok) return gate.response;
  const tenantId = gate.subscription.cryptoTenantId;
  if (!tenantId) {
    return NextResponse.json({ code: 'service_unavailable', error: 'no_crypto_tenant' }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'validation_error', error: parsed.error.errors[0]?.message ?? 'invalid_payload' }, { status: 400 });
  }

  const result = await confirmCryptoWhatsappOtp(tenantId, gate.userId, parsed.data.code);
  if (!result.ok) {
    log.warn(`crypto OTP confirm failed (status=${result.status}): ${result.error}`);
    return NextResponse.json({ code: 'upstream_error', error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ code: 'internal_error', error: message }, { status: 500 });
  }
}
