import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from '@/i18n/config';
import { resolveCountryByIp } from '@/lib/geoip/fallback';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

const publicPaths = ['/login', '/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/health', '/api/public/', '/api/client/inquiries', '/api/chat', '/api/cron/', '/api/billing/webhook/', '/api/license/check', '/manifest.json'];

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

// next-intl middleware for locale detection on guest pages.
//
// localeDetection: false → URL is the single source of truth. With auto-detect
// enabled (the default), next-intl reads the NEXT_LOCALE cookie and rewrites
// `/` to `/en/` whenever the cookie says 'en' — even if the visitor is in
// Indonesia. That causes "I'm in Indonesia but pages still show English"
// when the cookie was locked to 'en' on a prior visit. Our outer
// detectGeoLocale already handles first-visit redirect; once the cookie is
// set, the URL is trusted.
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
  localeDetection: false,
});

/**
 * Detect preferred locale from CF-IPCountry header (Cloudflare) with
 * graceful fallback to ipapi.co Geo-IP lookup when header is missing.
 *
 * URL semantics:
 *   - ID visitors → root URL (no prefix). Cookie locks NEXT_LOCALE=id.
 *   - non-ID visitors → redirected to /en{pathname}. Cookie locks NEXT_LOCALE=en.
 *
 * Strategy:
 * 1. Skip if URL already has explicit locale prefix or user already has NEXT_LOCALE cookie.
 * 2. Read CF-IPCountry → fast path, no outbound call.
 * 3. Else, ask resolveCountryByIp (cached, 1.5s timeout).
 * 4. If still unknown → fall through to non-ID branch (English).
 *    Rationale: CF-IPCountry reliably detects ID; failed detection most often = international.
 *
 * Always sets NEXT_LOCALE cookie so subsequent requests skip detection (flicker-free).
 */
async function detectGeoLocale(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;

  // Skip if user already has a locale prefix in URL (explicit choice)
  const hasLocalePrefix = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );
  if (hasLocalePrefix) return null;

  // Skip if user already has NEXT_LOCALE cookie (returning visitor with preference)
  if (request.cookies.get('NEXT_LOCALE')) return null;

  // 1. Cloudflare header (fast path)
  let country = request.headers.get('cf-ipcountry')?.toUpperCase() ?? null;

  // 2. Fallback to ipapi.co (cached + timeout-bounded) if missing
  if (!country || country === 'XX' || country === 'T1') {
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '';
    if (clientIp) {
      try {
        country = await resolveCountryByIp(clientIp);
      } catch {
        country = null;
      }
    }
  }

  // 3. Decide locale: 'id' for Indonesia, 'en' for everyone else (incl. unknown)
  const targetLocale: 'id' | 'en' = country === 'ID' ? 'id' : 'en';

  if (targetLocale === 'id') {
    // ID is the platform default — no URL rewrite needed; just lock the cookie so
    // subsequent requests don't re-run detection.
    const response = NextResponse.next();
    response.cookies.set('NEXT_LOCALE', 'id', {
      maxAge: 365 * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax',
    });
    return response;
  }

  // Non-ID → redirect to /en{pathname} and set cookie
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

// Legacy path redirects — old pages → new enterprise pages
const LEGACY_REDIRECTS: Record<string, string> = {
  '/features': '/platform',
  '/faq': '/contact',
  '/terms': '/legal/terms',
  '/privacy': '/legal/privacy',
  '/risk-disclaimer': '/legal/risk-disclosure',
};

function getLegacyRedirect(pathname: string): string | null {
  // Strip locale prefix if present
  const stripped = pathname.replace(/^\/(id|en)/, '') || '/';
  return LEGACY_REDIRECTS[stripped] || null;
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
  const host = request.headers.get('host') ?? '';

  // Locale-prefixed app surfaces (auth/admin/portal) → strip prefix.
  // These pages are locale-agnostic — they read locale from cookie/UI,
  // not URL. Without this redirect, /en/login 404s because no
  // [locale]/login route exists.
  const localeStripMatch = pathname.match(/^\/(en|id)(\/(login|admin|portal)(\/.*)?$)/);
  if (localeStripMatch) {
    const stripped = localeStripMatch[2]; // /login or /admin/... or /portal/...
    const url = request.nextUrl.clone();
    url.pathname = stripped;
    return NextResponse.redirect(url, 308);
  }

  // api.babahalgo.com subdomain → rewrite to /api/* routes
  if (host.startsWith('api.')) {
    // Health check at root
    if (pathname === '/' || pathname === '') {
      return NextResponse.rewrite(new URL('/api/health', request.url));
    }
    // Already prefixed with /api — pass through
    if (pathname.startsWith('/api/')) {
      // Continue to rate limiting and auth below
    } else {
      // Rewrite: api.babahalgo.com/billing/checkout → /api/billing/checkout
      const apiUrl = new URL(`/api${pathname}${request.nextUrl.search}`, request.url);
      return NextResponse.rewrite(apiUrl);
    }
  }

  // Legacy redirects (old pages → new enterprise pages)
  const redirectTarget = getLegacyRedirect(pathname);
  if (redirectTarget) {
    const url = request.nextUrl.clone();
    url.pathname = redirectTarget;
    return NextResponse.redirect(url, 301);
  }

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
    // GeoIP detection: CF-IPCountry → ipapi.co fallback → cookie lock (flicker-free)
    let geoResponse: NextResponse | null = null;
    try {
      geoResponse = await detectGeoLocale(request);
    } catch {
      // Geo-IP failure must never break navigation — fall through to intl middleware
      geoResponse = null;
    }
    if (geoResponse) {
      // If detection chose ID and locked the cookie via NextResponse.next(),
      // we still need next-intl to handle the request — let intl take over.
      // For redirect responses (non-ID), return immediately.
      const status = geoResponse.status;
      if (status >= 300 && status < 400) {
        return geoResponse;
      }
      // Cookie was set on a `.next()` response — let intl middleware run with it
      // and merge cookies into the eventual response.
      const intlResponse = intlMiddleware(request);
      // Copy the geo cookie onto intl response (cookie set on .next() doesn't
      // automatically forward through intlMiddleware)
      const cookie = geoResponse.cookies.get('NEXT_LOCALE');
      if (cookie) {
        intlResponse.cookies.set('NEXT_LOCALE', cookie.value, {
          maxAge: 365 * 24 * 60 * 60,
          path: '/',
          sameSite: 'lax',
        });
      }
      return intlResponse;
    }

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

    // Pass user info to downstream via request headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.sub as string);
    requestHeaders.set('x-user-role', payload.role as string);
    if (payload.licenseId) requestHeaders.set('x-license-id', payload.licenseId as string);
    if (payload.vpsInstanceId) requestHeaders.set('x-vps-instance-id', payload.vpsInstanceId as string);
    if (payload.subscriptionId) requestHeaders.set('x-subscription-id', payload.subscriptionId as string);
    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  // Exclude SEO files (sitemap.xml, robots.txt) + Next.js static assets
  // from the middleware so next-intl doesn't rewrite them under /id/.
  // Sitemap + robots must be served at root regardless of locale.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.json|logo/).*)',
  ],
};
