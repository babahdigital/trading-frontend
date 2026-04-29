import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { AUTH_COOKIE_NAMES } from './cookies';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

/**
 * Resolve the authenticated user id from a request.
 *
 * Reads the Authorization Bearer header first (legacy localStorage clients),
 * then falls back to the HttpOnly access_token cookie (current default).
 * Returns null on any failure — caller decides 401.
 *
 * Single source of truth for cookie name + verification — every client API
 * route MUST use this instead of inlining `cookies.get(...)` to avoid the
 * 'auth-token' typo that broke /api/client/{2fa,invoices,notifications,
 * profile,password} after the c092eb0 HttpOnly migration.
 */
export async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization');
  const bearer = auth?.replace(/^Bearer\s+/i, '');
  const cookieToken = req.cookies.get(AUTH_COOKIE_NAMES.ACCESS_TOKEN)?.value;
  const token = bearer || cookieToken;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return (payload.sub as string) || (payload.userId as string) || null;
  } catch {
    return null;
  }
}

/**
 * Same as getUserIdFromRequest but also returns the role for routes that
 * need to gate by ADMIN/CLIENT.
 */
export async function getUserContextFromRequest(
  req: NextRequest,
): Promise<{ userId: string; role: 'ADMIN' | 'CLIENT' } | null> {
  const auth = req.headers.get('authorization');
  const bearer = auth?.replace(/^Bearer\s+/i, '');
  const cookieToken = req.cookies.get(AUTH_COOKIE_NAMES.ACCESS_TOKEN)?.value;
  const token = bearer || cookieToken;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const userId = (payload.sub as string) || (payload.userId as string);
    const role = (payload.role as 'ADMIN' | 'CLIENT') || 'CLIENT';
    if (!userId) return null;
    return { userId, role };
  } catch {
    return null;
  }
}
