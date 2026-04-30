/**
 * Chat lead gate auth probe.
 *
 * Logged-in user (HttpOnly session cookie valid) di-bypass dari pre-chat
 * lead capture form. Endpoint ini ringan: hanya verify JWT, tidak fetch
 * Prisma — keep cold-start cepat.
 */
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const tokenMatch = cookieHeader.match(/(?:^|;\s*)(?:access_token|session)=([^;]+)/);
  if (!tokenMatch) {
    return NextResponse.json({ authenticated: false });
  }
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ authenticated: false });
  }
  try {
    const token = decodeURIComponent(tokenMatch[1]);
    await jwtVerify(token, new TextEncoder().encode(secret));
    return NextResponse.json({ authenticated: true });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
