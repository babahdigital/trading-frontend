# System Architecture

## High-Level Overview

```
                         Internet
                            |
                     Cloudflare Tunnel
                            |
              +-------------+-------------+
              |       VPS3 (Ubuntu)       |
              |   148.230.96.201:1983     |
              |                           |
              |  +---------------------+  |
              |  |  Docker Container   |  |
              |  |  Next.js 16 :3000   |  |
              |  |  (standalone mode)  |  |
              |  +-----+-------+------+  |
              |        |       |         |
              |  +-----+  +---+------+  |
              |  | PostgreSQL (native)|  |
              |  | trading_commercial |  |
              |  +-------------------+  |
              +-------------+-----------+
                            |
              +-------------+-------------+
              |   SSH Tunnel to VPS1      |
              |   (Forex Backend)         |
              +---------------------------+
```

## Route Groups

The App Router organizes pages into four route groups:

```
src/app/
  [locale]/(guest)/     Public pages -- bilingual, i18n-routed
                        Landing, pricing, solutions, research, legal, etc.

  (auth)/               Authentication pages -- locale-agnostic
                        Login, admin login, forgot/reset password

  (admin)/admin/        Admin console -- requires ADMIN+ role
                        CMS, customers, licenses, KYC, VPS fleet

  (portal)/portal/      Client portal -- requires authenticated user
                        Dashboard, signals, positions, billing, crypto
```

Guest pages use `[locale]` dynamic segment for URL-based locale routing (`/en/pricing`, `/pricing` for Indonesian). Auth, admin, and portal pages are locale-agnostic -- they read locale from cookie or user preference.

## Middleware Pipeline (proxy.ts)

The Edge middleware (`src/proxy.ts`) executes on every request in this order:

```
Request
  |
  v
1. Locale-prefix strip (redirect /en/login -> /login)
  |
  v
2. Registration slug redirect (/register/signal -> /register?service=signal)
  |
  v
3. API subdomain rewrite (api.babahalgo.com/* -> /api/*)
  |
  v
4. Legacy redirects (/features -> /platform, /faq -> /contact)
  |
  v
5. Maintenance mode gate (503 JSON for API, redirect for pages)
  |
  v
6. Rate limiting
     - Login: 10/min per IP
     - Chat: 20/min per IP
     - Lead capture: 6/min per IP
     - Global API: 100/min per IP
  |
  v
7. Public path bypass (auth, health, public, cron, webhooks)
  |
  v
8. Guest path: Geo-IP detection + next-intl locale routing
   OR
   Auth path: JWT verification + role-based routing
  |
  v
9. Header injection (x-user-id, x-user-role, x-license-id, etc.)
  |
  v
Response
```

## Data Flow

### Client Request to Database

```
Browser
  |
  v
Edge Middleware (proxy.ts)
  |  JWT verify, rate limit, geo-IP, maintenance gate
  v
API Route Handler (src/app/api/*)
  |  Zod validation, auth guard (requireAdmin/requireClient)
  v
Business Logic (src/lib/*)
  |  Domain-specific processing
  v
Prisma ORM (src/lib/db/prisma.ts)
  |  Singleton client, connection pooling
  v
PostgreSQL (native on VPS3)
```

### Backend Bridge (Forex/Crypto)

```
Browser
  |
  v
FE API Route (/api/forex/*, /api/crypto/*)
  |
  v
Bridge Client (src/lib/forex/client.ts, src/lib/proxy/crypto-client.ts)
  |  Token forwarding via HttpOnly cookies
  v
Backend API (VPS1 forex / crypto backend)
```

## External Integrations

| Service | Purpose | Module |
|---------|---------|--------|
| **OpenRouter** | Single AI provider (Gemini models) | `src/lib/ai/openrouter.ts` |
| **Xendit** | Payment processing (Card, QRIS, VA, E-wallet) | `src/app/api/billing/*` |
| **Midtrans** | Legacy payment fallback | `src/app/api/billing/webhook/midtrans/` |
| **Brevo** | Email delivery (SMTP + API dual transport) | `src/lib/email/config.ts` |
| **Pollinations.ai** | Image generation fallback | `src/lib/ai/promo-image-generator.ts` |
| **CoinGecko** | Crypto price data (live ticker) | Ticker component |
| **Stooq** | Stock/forex/commodity data (live ticker) | Ticker component (Yahoo fallback) |
| **Fonnte** | WhatsApp OTP + notifications | `src/lib/whatsapp/client.ts` |
| **Telegram** | Alert notifications | `src/lib/notifier/telegram.ts` |
| **Sentry** | Error tracking (client + server + edge) | `src/instrumentation.ts` |
| **Cloudflare** | CDN, Tunnel, R2 backup, CF-IPCountry | Infrastructure |
| **Cal.com** | Scheduling embed (institutional) | `src/components/ui/cal-embed.tsx` |
| **ipapi.co** | Geo-IP fallback for locale detection | `src/lib/geoip/fallback.ts` |

## Docker Deployment Architecture

### Multi-Stage Build

```
Stage 1: deps        node:20-alpine -- npm ci (dependency install)
Stage 2: builder     node:20-alpine -- prisma generate + next build
Stage 3: runner      node:20-alpine -- standalone output + prisma binaries
```

The runner stage includes:
- Standalone Next.js output (no `node_modules` bulk)
- Prisma client binaries (`linux-musl-openssl-3.0.x`)
- Prisma CLI (for `migrate deploy` at startup)
- Sharp (image optimization)
- `docker-entrypoint.sh` (runs migrations before server start)

### Production Compose Stack

```
docker-compose.prod.yml
  |
  +-- app          Next.js container (port 3000)
  +-- db-backup    Nightly pg_dump to /backups
  +-- r2-backup    Cloudflare R2 offsite sync
```

PostgreSQL runs natively on the host (not in Docker).

## Runtime Architecture

### Edge Runtime vs Node.js Runtime

| Component | Runtime | Reason |
|-----------|---------|--------|
| `proxy.ts` (middleware) | Edge | Low latency, runs at CDN edge |
| API route handlers | Node.js | Prisma requires Node.js runtime |
| Guest pages | Node.js (SSR) | CMS data fetching via Prisma |
| Chat API | Node.js | AI SDK streaming requires Node.js |

### Background Workers

Workers run in-process alongside the Next.js server via `setInterval`. Initialized at startup in `src/instrumentation.ts` -> `src/lib/cron/index.ts`.

```
Next.js Server Process
  |
  +-- Kill-switch monitor          (60s,  always on)
  +-- VPS health check             (5min, always on)
  +-- Subscription expiry          (1h,   always on)
  +-- WhatsApp OTP cleanup         (6h,   always on)
  +-- Signal consumer              (30s,  ENABLE_SIGNAL_CONSUMER)
  +-- Trade events consumer        (20s,  ENABLE_TRADE_EVENTS_CONSUMER)
  +-- Research ingester            (6h,   ENABLE_RESEARCH_INGESTER)
  +-- Pair brief worker            (4h,   ENABLE_PAIR_BRIEF_WORKER)
  +-- Blog article generator       (12h,  auto when OPENROUTER_API_KEY set)
  +-- Daily research               (24h,  auto when OPENROUTER_API_KEY set)
  +-- CMS i18n auto-sync           (5min, auto when OPENROUTER_API_KEY set)
```

## Feature Flags

DB-backed via `SiteSetting` model with in-memory cache (30s TTL):

```
SiteSetting table
  key: "feature:<name>"
  value: "true" / "false"
  type: "boolean"
            |
            v
  src/lib/feature-flags.ts        ← core read/write
  src/lib/feature-flag-registry.ts ← type-safe registry (10 known flags)
    - In-memory Map cache (30s TTL)
    - Env var fallback (UPPERCASE_SNAKE_CASE)
    - Admin toggle propagates within 30s without restart
    - isKnownFlagEnabled('SIGNAL_CONSUMER') ← type-safe, no typo risk
```

Known flags: SIGNAL_CONSUMER, TRADE_EVENTS_CONSUMER, RESEARCH_INGESTER,
PAIR_BRIEF_WORKER, BLOG_GENERATOR, MAINTENANCE_MODE, MACRO_BLACKOUT,
KYC_REQUIRED, PROMO_STRATEGIST, CMS_I18N_SYNC.

## Centralization Architecture

All product/trading data flows through single-source-of-truth cascade:

```
product-info.ts (hardcoded master data — strategies, pairs, tiers, stats)
       ↓
trading-settings.ts (SiteSetting DB facade, 60s cache, fallback to product-info)
       ↓
/api/public/trading-info (public REST, 1h cache, locale-aware)
       ↓
Components: server → getTradingSettings() | client → fetch('/api/public/trading-info')
```

Supporting centralization modules:
- `lib/compliance/disclaimers.ts` — legal copy (zero-custody, risk, no-PAMM)
- `lib/tiers/tier-slug-map.ts` — TIER_SLUG_MAP (uppercase ↔ kebab-case)
- `lib/navigation/cta-links.ts` — CTA link registry (/register, /checkout, /contact)
- `lib/api/rate-limiter.ts` — server-side rate limit config + checker
- `lib/admin/use-crud.ts` — generic CRUD hook for admin CMS pages
- `components/seo/json-ld-script.tsx` — reusable JSON-LD injection
- `components/solutions/solution-page-shell.tsx` — shared solution page layout

i18n shared keys (`shared.*`):
- `ct_*` — crypto tier names/descriptions/features (single source for 5 tiers)
- `cs_*` — crypto strategy names/taglines/highlights (single source for 4 strategies)
- `disclaimer_*` — risk, zero-custody, AI advisory disclaimers
