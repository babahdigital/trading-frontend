/**
 * WebSocket auth token bridge.
 *
 * Per backend `dev/jawaban-bf.md` Wave-29T closure, the WebSocket
 * `/api/forex/ws` endpoint expects a TENANT API TOKEN as plaintext
 * (X-API-Token shape), NOT a JWT session cookie. The tenant token is
 * long-lived (rotated by admin via /api/admin/tenants/{id}/rotate_token).
 *
 * Browser clients cannot read HttpOnly session cookies, and we don't want
 * the long-lived tenant token persisted to localStorage (XSS reachable).
 * This endpoint acts as a controlled bridge:
 *
 *   1. Browser holds session cookie (HttpOnly).
 *   2. Browser GET /api/auth/ws-token (cookie attached automatically).
 *   3. Server validates session, then returns the tenant API token in
 *      response body. Browser holds it in memory only (React state),
 *      passes to WS handshake, discards on tab close.
 *
 * Why fetch instead of injecting at layout: the WebSocket connection only
 * happens on portal pages with realtime needs (signals, positions),
 * not on every render of every page. Fetching on-demand keeps token blast
 * radius minimal.
 *
 * MVP (per backend reply): single tenant token = single user. The token
 * lives in env var VPS1_TOKEN_TENANT. Wave-30 will expose
 * /api/me/rotate_token so each user gets their own — at that point this
 * endpoint will switch to call /api/me/tokens with session cookie and
 * forward the active token.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify, type JWTPayload } from 'jose';
import { createLogger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const log = createLogger('api/auth/ws-token');

interface SessionPayload extends JWTPayload {
  sub?: string;
  email?: string;
  role?: string;
}

async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get('access_token')?.value || store.get('session')?.value;
  if (!token) return null;
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    log.warn('JWT_SECRET missing — cannot verify session for ws-token issuance');
    return null;
  }
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function GET() {
  const session = await readSession();
  if (!session?.sub) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  // MVP: tenant API token disimpan sebagai env var server-side. Wave-30
  // akan menggantinya dengan call ke /api/me/tokens (per-user issuance).
  const tenantToken =
    process.env.VPS1_TOKEN_TENANT ||
    process.env.VPS1_ADMIN_TOKEN || // fallback selama tenant token env var belum di-set
    '';

  if (!tenantToken) {
    log.error('No tenant token configured (VPS1_TOKEN_TENANT / VPS1_ADMIN_TOKEN)');
    return NextResponse.json(
      { error: 'WebSocket auth not configured', code: 'ws_token_unconfigured' },
      { status: 503 },
    );
  }

  // Short cache header so the browser does not hammer this on every page
  // navigation; token is long-lived but we still want freshness on rotate.
  return NextResponse.json(
    {
      token: tenantToken,
      expires_in: 3600, // hint to caller — actual expiry controlled BE-side
      note: 'MVP single-tenant token. Wave-30 will issue per-user tokens.',
    },
    {
      headers: {
        'Cache-Control': 'private, max-age=300', // 5 min
        'Content-Type': 'application/json',
      },
    },
  );
}
