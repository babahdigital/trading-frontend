export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireCryptoEligible } from '@/lib/auth/crypto-eligibility';
import { requestCryptoWhatsappOtp } from '@/lib/whatsapp/crypto-prefs-proxy';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/client/crypto/notifications/whatsapp/verify');

/**
 * POST /api/client/crypto/notifications/whatsapp/verify
 *
 * Triggers OTP send via the crypto backend (Phase 2 stub — backend returns
 * placeholder until Fonnte adapter wired). User must already have set
 * `whatsapp_number` via PATCH on the prefs endpoint.
 */
export async function POST(request: NextRequest) {
  const gate = await requireCryptoEligible(request, { allowPaused: true });
  if (!gate.ok) return gate.response;
  const tenantId = gate.subscription.cryptoTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: 'no_crypto_tenant' }, { status: 503 });
  }

  const result = await requestCryptoWhatsappOtp(tenantId, gate.userId);
  if (!result.ok) {
    log.warn(`crypto OTP request failed (status=${result.status}): ${result.error}`);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.result);
}
