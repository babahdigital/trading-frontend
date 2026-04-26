export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchWhatsappConfig, updateWhatsappConfig } from '@/lib/whatsapp/backend-proxy';
import { isValidWhatsappTarget } from '@/lib/whatsapp/format';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/client/whatsapp/config');

const productSchema = z.enum(['forex', 'crypto']);

const targetSchema = z
  .string()
  .nullable()
  .refine((v) => v === null || v === '' || isValidWhatsappTarget(v), {
    message: 'invalid_whatsapp_target',
  });

const patchSchema = z
  .object({
    enabled: z.boolean().optional(),
    alertsTarget: targetSchema.optional(),
    opsTarget: targetSchema.optional(),
    digestTarget: targetSchema.optional(),
    countryCode: z.string().regex(/^\d{1,4}$/).optional(),
  })
  .strict();

function userIdOrUnauthorized(request: NextRequest): string | NextResponse {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return userId;
}

export async function GET(request: NextRequest) {
  const userIdResult = userIdOrUnauthorized(request);
  if (userIdResult instanceof NextResponse) return userIdResult;

  const productParse = productSchema.safeParse(request.nextUrl.searchParams.get('product'));
  if (!productParse.success) {
    return NextResponse.json({ error: 'invalid_product' }, { status: 400 });
  }

  const result = await fetchWhatsappConfig(productParse.data, userIdResult);
  if (!result.ok) {
    log.warn(`fetch failed for ${productParse.data} (status=${result.status}): ${result.error}`);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.config);
}

export async function PATCH(request: NextRequest) {
  const userIdResult = userIdOrUnauthorized(request);
  if (userIdResult instanceof NextResponse) return userIdResult;

  const productParse = productSchema.safeParse(request.nextUrl.searchParams.get('product'));
  if (!productParse.success) {
    return NextResponse.json({ error: 'invalid_product' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? 'invalid_payload';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const result = await updateWhatsappConfig(productParse.data, userIdResult, parsed.data);
  if (!result.ok) {
    log.warn(`patch failed for ${productParse.data} (status=${result.status}): ${result.error}`);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.config);
}
