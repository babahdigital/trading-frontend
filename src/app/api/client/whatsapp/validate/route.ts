export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';
import { isValidWhatsappTarget } from '@/lib/whatsapp/format';

const log = createLogger('api/client/whatsapp/validate');

const bodySchema = z.object({
  e164: z.string().refine((v) => isValidWhatsappTarget(v), { message: 'invalid_e164' }),
}).strict();

interface FonnteValidateResponse {
  status: boolean;
  registered?: string[];
  not_registered?: string[];
  reason?: string;
}

/**
 * POST /api/client/whatsapp/validate
 *
 * Server-side proxy to Fonnte `/validate`. The Fonnte token never reaches
 * the browser. Used by the preferences UI to confirm a number is on
 * WhatsApp before sending an OTP — saves a wasted message.
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

  const token = process.env.FONNTE_TOKEN;
  if (!token) {
    log.warn('FONNTE_TOKEN missing — validate endpoint disabled');
    return NextResponse.json({ error: 'whatsapp_validate_unconfigured' }, { status: 503 });
  }

  const e164 = parsed.data.e164;
  // Fonnte expects target without leading `+`. Group ids pass through.
  const target = e164.startsWith('+') ? e164.slice(1) : e164;
  // Country code: derive from the first 1–3 digits if E.164, otherwise blank.
  const countryCode = /^\d/.test(target) ? target.slice(0, target.length > 11 ? 2 : 1) : '';

  try {
    const upstream = await fetch('https://api.fonnte.com/validate', {
      method: 'POST',
      headers: {
        Authorization: token,
      },
      body: new URLSearchParams({ target, ...(countryCode ? { countryCode } : {}) }),
      signal: AbortSignal.timeout(8_000),
    });
    const data = (await upstream.json().catch(() => null)) as FonnteValidateResponse | null;
    if (!upstream.ok || !data) {
      return NextResponse.json({ error: 'fonnte_unreachable' }, { status: 502 });
    }
    const registered = Array.isArray(data.registered) && data.registered.includes(target);
    return NextResponse.json({ registered, reason: data.reason });
  } catch (err) {
    log.error('Fonnte validate failed', err);
    return NextResponse.json({ error: 'fonnte_unreachable' }, { status: 502 });
  }
}
