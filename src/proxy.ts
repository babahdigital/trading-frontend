import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from '@/i18n/config';
import { ADMIN_ROLES } from '@/lib/auth/jwt';
import { resolveCountryByIp } from '@/lib/geoip/fallback';
import { getMaintenanceStateEdge } from '@/lib/maintenance-edge';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

// Login pages (customer + admin) tetap public — kalau pakai pattern
// `/admin` di isNonGuestPath nanti ke-catch di token-required block dan
// di-redirect ke /login. Kita whitelist `/admin/login` eksplisit di sini
// supaya operator bisa akses operator console login tanpa session.
const publicPaths = ['/login', '/admin/login', '/forgot-password', '/reset-password', '/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/auth/verify-email', '/api/auth/ws-token',
  // /api/auth/me — identity probe yang harus boleh dipanggil tanpa token
  // (untuk EnterpriseNav check login state di public pages). Route handler
  // self-handle JWT cookie + return 200 dengan {user:null} kalau guest.
  '/api/auth/me',
  '/api/health', '/api/public/', '/api/client/inquiries', '/api/chat', '/api/cron/', '/api/billing/webhook/', '/api/license/check', '/api/notifications/push/', '/api/analytics/track',
  // Chat summary endpoint — accepts guest user (chat lead) + logged-in via cookie
  '/api/chat/email-summary',
  '/manifest.json', '/sw.js',
  // /api/uploads/promotions/* — runtime-served promo hero images (Next.js
  // standalone cache `public/` listing saat startup, so files yang dibuat
  // post-startup tidak ter-detect via static path; API route bypass cache).
  '/api/uploads/',
  // /api/cms/* — public read-only endpoints (pricing tiers, active promotions).
  // Admin write endpoints di /api/admin/cms/* tetap require admin role.
  '/api/cms/',
  // /api/v1/* — public versioned API (recommend-tier dst). No auth required;
  // route handlers self-validate input.
  '/api/v1/',
  // /api/admin/cms/promotions/[id]/generate-image — dual auth (admin OR CRON).
  // Middleware bypass — route handler self-authenticates.
  '/api/admin/cms/promotions/',
  // Admin smoke test endpoints — pakai own Bearer CRON_SECRET auth di route handler,
  // tidak butuh JWT admin session. Bypass middleware JWT check.
  '/api/admin/sentry-test', '/api/admin/fonnte-test', '/api/admin/brevo-test',
  // Maintenance mode status — GET is public (Edge middleware internal fetch).
  // PATCH self-authenticates via JWT in route handler.
  '/api/admin/maintenance',
  // Phase 14V forex backend bridge (2026-05-18) — these endpoints handle
  // their OWN auth via forex_*_token cookies in the route handler. The
  // FE-internal JWT middleware would otherwise reject the unauthenticated
  // login + refresh paths before they reach the proxy.
  // - /login   : the bridge entrypoint itself (auth is the body payload)
  // - /refresh : rotates the HttpOnly refresh_token cookie (no FE JWT)
  // - /logout  : intentionally NOT whitelisted — clearing a backend
  //              session implies the FE session also exists; the route
  //              still gracefully handles missing cookies anyway.
  '/api/forex/auth/login', '/api/forex/auth/refresh'];

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

  // 3. Decide locale:
  //    - 'ID' country → 'id' (Indonesia, platform default audience)
  //    - resolution-failed (country null) → 'id' (default to platform audience
  //      bukan global 'en', karena Pak Abdullah target Indonesia first)
  //    - any other country → 'en' (global English)
  const targetLocale: 'id' | 'en' = (country === 'ID' || country === null) ? 'id' : 'en';

  // Cookie security: secure flag aktif di production via NODE_ENV
  // (Cloudflare TLS terminate sebelum origin = cookie selalu via HTTPS dari
  // perspektif client). Local dev tidak set secure supaya browser accept.
  const cookieOpts = {
    maxAge: 365 * 24 * 60 * 60,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  };

  if (targetLocale === 'id') {
    // ID is the platform default — no URL rewrite needed; just lock the cookie so
    // subsequent requests don't re-run detection.
    const response = NextResponse.next();
    response.cookies.set('NEXT_LOCALE', 'id', cookieOpts);
    return response;
  }

  // Non-ID → redirect to /en{pathname} and set cookie
  const url = request.nextUrl.clone();
  url.pathname = `/en${pathname}`;
  const response = NextResponse.redirect(url);
  response.cookies.set('NEXT_LOCALE', 'en', cookieOpts);
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
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/public') ||
    pathname.startsWith('/logo') ||
    pathname.startsWith('/manifest')
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') ?? '';

  // Locale-prefixed app surfaces (auth/admin/portal) → strip prefix.
  // These pages are locale-agnostic — they read locale from cookie/UI,
  // not URL. Without this redirect, /en/login 404s because no
  // [locale]/login route exists.
  const localeStripMatch = pathname.match(/^\/(en|id)(\/(login|admin|portal|forgot-password|reset-password)(\/.*)?$)/);
  if (localeStripMatch) {
    const stripped = localeStripMatch[2]; // /login, /admin/..., /portal/..., /forgot-password, /reset-password
    const url = request.nextUrl.clone();
    url.pathname = stripped;
    return NextResponse.redirect(url, 308);
  }

  // 2026-05-20 — Registration unification. Old per-product paths
  // (/register/signal, /register/crypto, /register/vps, /register/institutional,
  // /register/free) redirect ke unified `/register?service={slug}` dengan
  // 301 permanent (SEO honor). Optional locale prefix di-strip kalau ada.
  // Query params yang sudah ada (mis. `?tier=scalping`) di-preserve.
  const registerSlugMatch = pathname.match(/^\/(?:en|id)?\/?register\/(signal|crypto|vps|institutional|free)\/?$/);
  if (registerSlugMatch) {
    const slug = registerSlugMatch[1];
    const url = request.nextUrl.clone();
    url.pathname = pathname.startsWith('/en/') ? '/en/register' : '/register';
    const existingService = url.searchParams.get('service');
    if (!existingService) {
      url.searchParams.set('service', slug);
    }
    return NextResponse.redirect(url, 301);
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

  // --- Maintenance mode gate ---
  // Check BEFORE auth so ALL visitors (guest + logged-in) see maintenance page.
  // Bypass: maintenance page itself, admin login/auth, maintenance API, health,
  // static assets. Admin panel paths are bypassed so operators can toggle it off.
  const maintenanceBypass =
    pathname === '/maintenance' ||
    pathname.startsWith('/admin') ||
    pathname === '/api/auth/login' ||
    pathname.startsWith('/api/admin/') ||
    pathname === '/api/health' ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/logo/') ||
    pathname.startsWith('/logo') ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js';

  if (!maintenanceBypass) {
    try {
      const mState = await getMaintenanceStateEdge(request.url);
      if (mState.enabled) {
        // For API routes, return 503 JSON instead of redirect
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            {
              code: 'maintenance',
              error: 'System is under maintenance',
              message: mState.message || undefined,
              estimatedEnd: mState.estimatedEnd || undefined,
            },
            { status: 503 },
          );
        }
        // Redirect all other pages to /maintenance
        return NextResponse.redirect(new URL('/maintenance', request.url));
      }
    } catch {
      // Maintenance check failed — fail-open, don't block the site
    }
  }

  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  // Rate limit login: 10 attempts per minute
  if (pathname === '/api/auth/login' && request.method === 'POST') {
    if (isRateLimited(`login:${clientIp}`, 10, 60_000)) {
      return NextResponse.json(
        { code: 'rate_limit_login', error: 'Too many login attempts. Try again later.' },
        { status: 429 }
      );
    }
  }

  // Rate limit chat: 20 messages per minute per IP
  if (pathname === '/api/chat' && request.method === 'POST') {
    if (isRateLimited(`chat:${clientIp}`, 20, 60_000)) {
      return NextResponse.json(
        { code: 'rate_limit_chat', error: 'Too many messages. Please wait.' },
        { status: 429 }
      );
    }
  }

  // Rate limit lead capture: 6 leads/minute/IP. ChatLead + Subscriber +
  // public Inquiry + public Subscribers — semua publik, perlu dilindungi
  // dari spam. Ambang 6/min cukup longgar untuk satu user real, tapi
  // cukup ketat untuk hentikan bot.
  const LEAD_PATHS = ['/api/chat/lead', '/api/public/subscribers', '/api/public/inquiries'];
  if (LEAD_PATHS.includes(pathname) && request.method === 'POST') {
    if (isRateLimited(`lead:${clientIp}`, 6, 60_000)) {
      return NextResponse.json(
        { code: 'rate_limit_lead', error: 'Terlalu banyak permintaan. Silakan tunggu sebentar.' },
        { status: 429 }
      );
    }
  }

  // Global rate limit: 100 requests per minute per IP
  if (pathname.startsWith('/api/')) {
    if (isRateLimited(`global:${clientIp}`, 100, 60_000)) {
      return NextResponse.json(
        { code: 'rate_limit_global', error: 'Rate limit exceeded' },
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
      // Locale-agnostic error code shape: frontend resolves to localized
      // message via errors.auth.<code>. English string is fallback for
      // non-i18n consumers (curl, logs, legacy clients).
      return NextResponse.json({ code: 'unauthorized', error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, secret);

    // Admin routes require admin-level role (SUPER_ADMIN, ADMIN, OPERATOR)
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
      if (!(ADMIN_ROLES as readonly string[]).includes(payload.role as string)) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ code: 'forbidden', error: 'Forbidden' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }

    // Portal/client routes: check role + license/subscription scope
    if (pathname.startsWith('/portal') || pathname.startsWith('/api/client')) {
      const portalAllowed = ['CLIENT', 'ADMIN', 'SUPER_ADMIN', 'OPERATOR'];
      if (!portalAllowed.includes(payload.role as string)) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ code: 'forbidden', error: 'Forbidden' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/login', request.url));
      }

      // 2026-05-21 — license/subscription gate REMOVED dari /portal root +
      // billing/account routes. Sebelumnya customer baru register (belum
      // subscribe) di-loop redirect ke /login terus karena tidak punya
      // licenseId/subscriptionId. Fix: portal accessible untuk authenticated
      // CLIENT/ADMIN; specific feature routes (signals/crypto/positions)
      // gate di page-level via useSubscription hook + render upgrade prompt
      // kalau belum subscribe.
      //
      // /api/client/* TETAP require subscription (data access endpoint —
      // tidak make sense kalau belum subscribe).
      if (pathname.startsWith('/api/client') && payload.role === 'CLIENT') {
        if (!payload.licenseId && !payload.subscriptionId) {
          // Return 403 — bukan 200 graceful shape (Pak Abdullah audit
          // 2026-05-22 round 2: 200 shape `{ equity: [], positions: [] }`
          // crash consumer yang expect array langsung dari response.json()
          // → "Cannot read properties of undefined (reading 'map')" di portal).
          // 403 cleaner — FE catch handler default to empty state via initial
          // useState. Console "errors" cosmetic only, tidak block functionality.
          return NextResponse.json(
            { code: 'no_active_subscription', error: 'No active license or subscription' },
            { status: 403 },
          );
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
      return NextResponse.json({ code: 'invalid_token', error: 'Invalid or expired token' }, { status: 401 });
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
