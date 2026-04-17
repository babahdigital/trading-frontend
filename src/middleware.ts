import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from '@/i18n/config';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

const publicPaths = ['/login', '/register', '/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/health', '/api/public/', '/api/client/inquiries', '/api/chat', '/manifest.json'];

// In-memory rate limit store (per-process, resets on restart)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
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

// next-intl middleware for locale detection on guest pages
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
});

/**
 * Detect preferred locale from Cloudflare CF-IPCountry header.
 * Indonesian IPs → 'id', all others → 'en'.
 * Only redirects on first visit (no locale cookie yet, no explicit locale prefix).
 */
function detectGeoLocale(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;

  // Skip if user already has a locale prefix in URL (explicit choice)
  const hasLocalePrefix = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );
  if (hasLocalePrefix) return null;

  // Skip if user already has NEXT_LOCALE cookie (returning visitor with preference)
  if (request.cookies.get('NEXT_LOCALE')) return null;

  // Read Cloudflare country header
  const country = request.headers.get('cf-ipcountry')?.toUpperCase();

  // If from Indonesia (or unknown/localhost), serve default locale (id) — no redirect needed
  if (!country || country === 'ID' || country === 'XX' || country === 'T1') {
    return null;
  }

  // Non-Indonesian IP without locale prefix → redirect to /en
  const url = request.nextUrl.clone();
  url.pathname = `/en${pathname}`;
  const response = NextResponse.redirect(url);
  response.cookies.set('NEXT_LOCALE', 'en', {
    maxAge: 365 * 24 * 60 * 60,
    path: '/',
    sameSite: 'lax',
  });
  return response;
}

// Paths that are handled by the app (not guest pages)
function isNonGuestPath(pathname: string): boolean {
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/portal') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/public') ||
    pathname.startsWith('/logo') ||
    pathname.startsWith('/manifest')
  );
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

  // Rate limit chat: 20 messages per minute per IP
  if (pathname === '/api/chat' && request.method === 'POST') {
    if (isRateLimited(`chat:${clientIp}`, 20, 60_000)) {
      return NextResponse.json(
        { error: 'Too many messages. Please wait.' },
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

  // Allow public API paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.startsWith('/public') || pathname.startsWith('/logo')) {
    return NextResponse.next();
  }

  // For guest pages (not admin/portal/auth/api), run GeoIP detection + i18n middleware
  if (!isNonGuestPath(pathname)) {
    // GeoIP redirect: non-Indonesian IPs → /en on first visit
    const geoRedirect = detectGeoLocale(request);
    if (geoRedirect) return geoRedirect;

    return intlMiddleware(request);
  }

  // --- Auth-protected paths below (admin, portal) ---

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
