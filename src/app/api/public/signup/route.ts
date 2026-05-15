export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { createLogger } from '@/lib/logger';
import { z } from 'zod';

const log = createLogger('api/public/signup');

/**
 * Public free-tier self-service signup.
 * Backend: POST /api/forex/auth/signup (Phase 14V — no auth required)
 *
 * Body: { email, display_name, language?, timezone? }
 * Response: 201 { tenant_id, api_token, tier='free', products=['signals'] }
 *
 * Behavior:
 *   - Backend issue plaintext token sekali — FE harus simpan ke httpOnly cookie
 *     SEGERA, jangan log atau echo ke browser console
 *   - Tenant auto-set tier='free', products=['signals']
 *   - Onboarding status: signup=true, mt5=false, equity=false, pair=false
 *
 * Rate limit: 5 signup per IP per jam (backend enforces).
 */

const SignupSchema = z.object({
  email: z.string().email(),
  display_name: z.string().min(2).max(120),
  language: z.enum(['id', 'en']).optional(),
  timezone: z.string().max(64).optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_FAILED', error: 'validation_failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const res = await proxyToMasterBackend('admin', '/api/forex/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      log.warn(`signup backend HTTP ${res.status} email=${parsed.data.email}`);
      return NextResponse.json(
        {
          code: (payload as { code?: string }).code || 'BACKEND_FAILED',
          error: (payload as { error?: string }).error || 'backend_failed',
        },
        { status: res.status },
      );
    }

    // PENTING: api_token plaintext hanya muncul sekali — FE harus set ke
    // httpOnly cookie via Set-Cookie HEADER, JANGAN return ke body biar tidak
    // bisa di-read browser script.
    const apiToken = (payload as { api_token?: string }).api_token;
    if (!apiToken) {
      log.error('signup response missing api_token');
      return NextResponse.json(
        { code: 'BACKEND_INVARIANT', error: 'token_missing' },
        { status: 502 },
      );
    }

    const response = NextResponse.json({
      source: 'backend',
      tenant_id: (payload as { tenant_id?: string }).tenant_id,
      tier: (payload as { tier?: string }).tier || 'free',
      products: (payload as { products?: string[] }).products || ['signals'],
    });

    // HttpOnly cookie — saat backend butuh tenant context, FE middleware
    // baca cookie ini dan inject ke X-API-Token header proxy.
    response.cookies.set('babahalgo_api_token', apiToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 tahun
    });

    return response;
  } catch (err) {
    log.warn(`signup error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json(
      { code: 'BACKEND_UNREACHABLE', error: 'backend_unreachable' },
      { status: 503 },
    );
  }
}
