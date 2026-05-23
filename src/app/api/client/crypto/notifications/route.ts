export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCryptoEligible } from '@/lib/auth/crypto-eligibility';
import {
  fetchCryptoNotificationPrefs,
  updateCryptoNotificationPrefs,
} from '@/lib/whatsapp/crypto-prefs-proxy';
import { isValidWhatsappTarget } from '@/lib/whatsapp/format';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/client/crypto/notifications');

const patchSchema = z
  .object({
    telegramEnabled: z.boolean().optional(),
    whatsappEnabled: z.boolean().optional(),
    whatsappNumber: z
      .string()
      .nullable()
      .refine((v) => v === null || v === '' || isValidWhatsappTarget(v), {
        message: 'invalid_whatsapp_number',
      })
      .optional(),
    eventOptouts: z.record(z.string(), z.boolean()).optional(),
  })
  .strict();

export async function GET(request: NextRequest) {
  try {
  const gate = await requireCryptoEligible(request, { allowPaused: true });
  if (!gate.ok) return gate.response;
  const tenantId = gate.subscription.cryptoTenantId;
  if (!tenantId) {
    return NextResponse.json({ code: 'service_unavailable', error: 'no_crypto_tenant' }, { status: 503 });
  }
  const result = await fetchCryptoNotificationPrefs(tenantId, gate.userId);
  if (!result.ok) {
    log.warn(`fetch crypto prefs failed (status=${result.status}): ${result.error}`);
    return NextResponse.json({ code: 'upstream_error', error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.prefs);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ code: 'internal_error', error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
  const gate = await requireCryptoEligible(request, { allowPaused: true });
  if (!gate.ok) return gate.response;
  const tenantId = gate.subscription.cryptoTenantId;
  if (!tenantId) {
    return NextResponse.json({ code: 'service_unavailable', error: 'no_crypto_tenant' }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? 'invalid_payload';
    return NextResponse.json({ code: 'bad_request', error: message }, { status: 400 });
  }

  const result = await updateCryptoNotificationPrefs(tenantId, gate.userId, parsed.data);
  if (!result.ok) {
    log.warn(`patch crypto prefs failed (status=${result.status}): ${result.error}`);
    return NextResponse.json({ code: 'upstream_error', error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.prefs);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ code: 'internal_error', error: message }, { status: 500 });
  }
}
