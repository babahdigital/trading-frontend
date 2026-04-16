import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

const publicPaths = ['/login', '/api/auth/login', '/api/auth/refresh', '/api/health'];

// In-memory rate limit store (per-process, resets on restart)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count++;
  return entry.count > limit;
}

// Cleanup stale entries every 5 minutes
if (typeof globalThis !== 'undefined') {
  const cleanup = () => {
    const now = Date.now();
    for (const [key, val] of Array.from(rateLimitStore.entries())) {
      if (now > val.resetAt) rateLimitStore.delete(key);
    }
  };
  setInterval(cleanup, 5 * 60 * 1000);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  // Rate limit login: 10 attempts per minute
  if (pathname === '/api/auth/login' && request.method === 'POST') {
    if (isRateLimited(`login:${clientIp}`, 10, 60_000)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Try again later.' },
        { status: 429 }
      );
    }
  }

  // Global rate limit: 100 requests per minute per IP
  if (pathname.startsWith('/api/')) {
    if (isRateLimited(`global:${clientIp}`, 100, 60_000)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }
  }

  // Allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.startsWith('/public') || pathname === '/') {
    return NextResponse.next();
  }

  // Extract token from Authorization header or cookie
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : request.cookies.get('access_token')?.value;

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, secret);

    // Admin routes require ADMIN role
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
      if (payload.role !== 'ADMIN') {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }

    // Portal/client routes: check role + license/subscription scope
    if (pathname.startsWith('/portal') || pathname.startsWith('/api/client')) {
      if (payload.role !== 'CLIENT' && payload.role !== 'ADMIN') {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/login', request.url));
      }

      // For CLIENT role, verify license is still valid via licenseId in JWT
      // The actual DB check happens in the API route handler for performance,
      // but we ensure the JWT contains the required claims
      if (payload.role === 'CLIENT') {
        if (!payload.licenseId && !payload.subscriptionId) {
          if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'No active license or subscription' }, { status: 403 });
          }
          return NextResponse.redirect(new URL('/login', request.url));
        }
      }
    }

    // Pass user info to downstream via headers
    const response = NextResponse.next();
    response.headers.set('x-user-id', payload.sub as string);
    response.headers.set('x-user-role', payload.role as string);
    if (payload.licenseId) response.headers.set('x-license-id', payload.licenseId as string);
    if (payload.vpsInstanceId) response.headers.set('x-vps-instance-id', payload.vpsInstanceId as string);
    if (payload.subscriptionId) response.headers.set('x-subscription-id', payload.subscriptionId as string);
    return response;
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
