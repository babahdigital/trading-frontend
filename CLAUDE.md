# BabahAlgo Frontend — CLAUDE.md

> This file is loaded by Claude Code AI at the start of every session.
> It contains everything an AI agent needs to work effectively on this codebase.

## Project Overview

- **Framework**: Next.js 16 + React 19 + TypeScript 5.7 + Tailwind CSS 3.4
- **ORM / DB**: Prisma 5 + PostgreSQL (native on VPS3, not Docker)
- **Product**: Bilingual (id/en) trading bot subscription platform — forex + crypto
- **Domain**: babahalgo.com
- **Primary market**: Indonesia (default locale `id`)
- **Owner**: Abdullah / Babah Digital
- **Business model**: Zero-custody SaaS — customers hold their own funds at broker/Binance; we sell signal subscriptions, VPS licenses, and crypto bot access

## Architecture

- **App Router** with route groups: `(guest)`, `(auth)`, `(admin)`, `(portal)`
- **Edge middleware** in `src/proxy.ts` — JWT auth, rate limiting, geo-IP detection, maintenance mode, locale negotiation via `next-intl`
- **Prisma ORM** with PostgreSQL — singleton client at `src/lib/db/prisma.ts`
- **Standalone output** — Docker builds use `output: 'standalone'` in next.config.js
- **Sentry** integration (conditional on `SENTRY_DSN` env)
- **CSP headers** configured in next.config.js — strict but allows Xendit, Cal.com, Cloudflare

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 3.4, Radix UI, Framer Motion |
| Language | TypeScript 5.7 (strict mode) |
| ORM | Prisma 5 with PostgreSQL |
| Auth | JWT (jose) — access 15min + refresh 7d, HttpOnly cookies |
| i18n | next-intl 4.x — `id` source, `en` auto-translated |
| AI | OpenRouter (single provider) via @ai-sdk/openai |
| Payment | Xendit (inline: Card/QRIS/VA/E-wallet), Midtrans (legacy) |
| Charts | Recharts, Lightweight Charts (TradingView) |
| Email | Nodemailer + Brevo (SMTP + API dual transport) |
| PDF | pdf-lib (invoice generation) |
| Phone | libphonenumber-js/max (E.164 normalization) |
| Monitoring | Sentry |
| E2E Tests | Playwright |

## Folder Structure

```
src/
  app/                          # Next.js App Router pages + API routes
    [locale]/(guest)/           # Public pages (landing, pricing, solutions, research, legal)
    (admin)/admin/              # Admin console (CMS, customers, licenses, KYC, VPS fleet)
    (portal)/portal/            # Client portal (dashboard, billing, crypto, signals)
    (auth)/                     # Login, register, forgot-password
    api/
      auth/                     # Authentication endpoints
      admin/                    # Admin CRUD (requireAdmin guard)
      billing/                  # Xendit checkout + webhooks + Midtrans
      client/                   # Portal features (subscription-gated)
      cron/                     # Scheduled workers (CRON_SECRET auth)
      crypto/                   # Crypto bot integration bridge
      forex/                    # Forex backend bridge (VPS1 proxy)
      public/                   # Guest-accessible read-only (pricing, articles, FAQ)
      cms/                      # Public CMS endpoints
      v1/                       # Versioned public API (recommend-tier)
      license/                  # License validation
      chat/                     # AI chat + email summary
      health/                   # Health check endpoint
      webhook/                  # External webhook receivers (Telegram)
  components/
    ui/                         # Shared primitives (Button, Card, Dialog, Input, Toast, etc.)
    layout/                     # Layout components (sidebar, footer, newsletter, brand logo)
    admin/                      # Admin-specific components
    portal/                     # Portal-specific components (billing, KYC, notifications)
    charts/                     # Chart components (equity curve, PnL, heatmaps)
    trading/                    # Trading UI (price chart, symbol selector, badges)
    cms/                        # CMS components (banner bar, popups, image upload)
    landing/                    # Landing page sections
    pricing/                    # Pricing components (tier matrix, capability ladder)
    checkout/                   # Checkout flow components
    register/                   # Registration wizard + lead forms
    chat/                       # Chat widget + lead capture
    forms/                      # Shared forms (contact form)
    shared/                     # Cross-cutting (TrustStrip, StatsBar, FAQ accordion)
    tiers/                      # Tier badge + tier gate components
    icons/                      # Custom icon sets (enterprise, strategy)
    providers/                  # React context providers (theme)
    notifications/              # Notification UI components
    solutions/                  # Solution page components (SolutionPageShell, decision quiz)
    seo/                        # SEO components (JsonLdScript)
    demo/                       # Demo CTA components
    diagrams/                   # Architecture diagrams
    analytics/                  # Tracking components (pageview, web vitals)
  lib/
    ai/                         # AI integrations (OpenRouter client, content generation, image gen)
    auth/                       # Auth utilities (JWT, passwords, permissions, RBAC, eligibility)
    api/                        # API helpers (rate-limit, idempotency, error envelope, client-fetch)
    db/                         # Prisma client singleton
    cron/                       # Background cron jobs (kill-switch, health-check)
    consumers/                  # VPS1 data consumers (signals, trade events, state)
    ingesters/                  # Data ingestion (research)
    workers/                    # Background workers (pair-brief, blog, daily-research, CMS i18n)
    forex/                      # Forex backend bridge client (auth, billing, session, cookies)
    proxy/                      # Backend proxy clients (VPS, crypto)
    vps1/                       # VPS1 integration client
    trading/                    # Trading utilities (symbols, strategy names/stats, CMS settings)
    admin/                      # Admin utilities (useCrud generic hook)
    navigation/                 # CTA link registry
    compliance/                 # Legal disclaimer library (zero-custody, risk, no-PAMM)
    whatsapp/                   # WhatsApp integration (client, OTP, format, backend proxy)
    notifier/                   # Notification dispatchers (Telegram, email, pair-brief)
    email/                      # Email config, templates, shell
    payment/                    # Payment integration (Midtrans, exchange rates)
    chat/                       # Chat types + auth context
    blog/                       # Blog utilities (internal links, topic catalog)
    analytics/                  # Analytics computation + tracking
    charts/                     # Chart theming
    cms/                        # CMS fetch utilities
    company/                    # Company settings
    crypto/                     # Crypto utilities (secrets, recommend-tier)
    formatters/                 # Signal formatter
    geoip/                      # Geo-IP fallback
    hooks/                      # Custom hooks (KYC status, notifications)
    i18n/                       # i18n utilities (localize CMS, server locale)
    kyc/                        # KYC storage
    pwa/                        # PWA push notification hooks
    register/                   # Registration service registry
    subscription/               # Subscription lifecycle
    tiers/                      # Tier config + use-tier hook + tier-slug-map
    timezone/                   # Timezone utilities
    capabilities/               # Tier-capability mapping
  i18n/
    config.ts                   # Locale config: ['id', 'en'], default 'id'
    messages/
      id.json                   # Indonesian translations (SOURCE OF TRUTH)
      en.json                   # English translations (auto-generated)
  types/                        # Global TypeScript type definitions
  instrumentation.ts            # Server startup hook (initializes cron jobs)
  proxy.ts                      # Edge middleware (auth, rate-limit, geo-IP, maintenance)
prisma/
  schema.prisma                 # Database schema (~1300 lines, ~50 models)
  seed.ts                       # Database seeder
  migrations/                   # Prisma migration history
scripts/
  translate-i18n.ts             # OpenRouter-powered i18n auto-translation
  translate-cms-faq.ts          # CMS FAQ translation
public/                         # Static assets
.github/workflows/
  ci.yml                        # Quality gates (tsc + lint + build)
  docker-publish.yml            # Docker image build + push to Docker Hub
  lighthouse-and-a11y.yml       # Lighthouse + accessibility checks
  actions-housekeeping.yml      # GH Actions cleanup
```

## Key Conventions

### Quality Gate (MANDATORY before every commit)

```bash
npx prisma generate        # Regenerate Prisma client after schema changes
npx tsc --noEmit           # Type check — zero errors required
npx eslint .               # Lint — zero errors required
npm run build              # Full Next.js build — must succeed
```

If VSCode shows TypeScript errors that CLI does not, restart the TS Server — it is likely stale.

### Commit Discipline

- **Conventional commits**: `feat(scope):`, `fix(scope):`, `refactor(scope):`, `chore(scope):`
- **Split commits** — one logical change per commit, push each
- **Co-author line required** on every commit
- **Never mock DB** in tests — use real Prisma against test DB
- **Never amend** unless explicitly asked — always create new commits

### i18n Rules

- `src/i18n/messages/id.json` is the **source of truth** (~3100+ leaves)
- `en.json` is auto-translated via `npm run i18n:sync` (OpenRouter)
- CI parity gate checks id/en key count match
- CMS content uses bilingual columns (`title` + `title_en`) with zero-touch auto-sync worker

### Path Aliases

```
@/* → ./src/*
```

Defined in `tsconfig.json`. Always use `@/` imports.

## AI Models (via OpenRouter)

All AI traffic routes through OpenRouter (`src/lib/ai/openrouter.ts`).

| Purpose | Model | Constant | Cost |
|---------|-------|----------|------|
| Chat, narration, translation, content | `google/gemini-3.1-flash-lite` | `DEFAULT_MODEL` | ~$0.01/call |
| Signal advisor, research, reasoning | `google/gemini-3.5-flash` | `REASONING_MODEL` | ~$0.02/call |
| Image generation (articles, promos) | `google/gemini-2.5-flash-image` (primary) | In `image-generator.ts` | ~$0.04/image |
| Image generation fallback | Pollinations.ai Flux (free) | Fallback only | $0 |

Cost tracking via `AiCallLog` model (purpose, tokens, latency). Image generation currently NOT tracked in AiCallLog.

## Database (Prisma Schema)

~50 models across these domains:

### Core User & Auth
- `User` — email/password, role (SUPER_ADMIN/ADMIN/OPERATOR/CLIENT), RBAC permissions, forex/crypto tenant links, 2FA, locale preference
- `Session` — JWT sessions with refresh tokens
- `PasswordResetToken`, `EmailVerificationToken` — auth flows

### Licensing & Subscriptions
- `License` — VPS/signal/PAMM license keys with status lifecycle
- `Subscription` — tier-based subscriptions (DEMO through VIP/HNWI)
- `CryptoBotSubscription` — crypto-specific subscription with Binance integration

### Billing
- `Invoice` — invoices with PDF generation, status tracking
- `PricingTier` — CMS-managed pricing with IDR/USD, metadata, category

### CMS
- `LandingSection` — hero, features, pricing, FAQ sections
- `Article` / `BlogTopic` — AI-generated blog content pipeline
- `Faq` — categorized FAQ with bilingual auto-sync
- `PageMeta` — SEO metadata per route
- `PageContent` — static page content
- `Banner`, `Popup` — marketing display components
- `Testimonial` — social proof
- `SiteSetting` — key-value site configuration + feature flags
- `EmailTemplate` — bilingual email templates with variable interpolation
- `Changelog` — versioned release notes

### Promotions & Revenue
- `Promotion` — AI-strategist-driven promos with discount engine
- `CalendarEvent` — Indonesia/international calendar for promo timing
- `RevenueSnapshot` — daily MRR tracking for strategist input

### Trading & Signals
- `SignalAuditLog` — signal tracking with outcome (WIN/LOSS/BREAKEVEN)
- `PairBrief` — AI-generated pair intelligence briefs
- `ConsumerState` — VPS1 data consumer cursor tracking
- `KillSwitchEvent` — kill-switch audit trail

### Notifications
- `NotificationLog` — multi-channel notification history
- `NotificationPreference` — per-user channel/timezone preferences
- `WhatsappVerification` — WhatsApp OTP verification
- `PushSubscription` — PWA push notification subscriptions

### Infrastructure
- `VpsInstance` — VPS fleet management with health checks
- `HealthCheck` — periodic VPS health metrics
- `AuditLog` — tamper-evident audit trail

### KYC & Leads
- `UserKyc` — KYC document + risk profile submission
- `ChatLead` — pre-chat lead capture (name/email gate)
- `Subscriber` — newsletter subscribers
- `Inquiry` — sales inquiries
- `AnalyticsEvent` — self-hosted pageview + funnel tracking

### Workers
- `WorkerRun` — background worker execution log
- `AiCallLog` — AI API call tracking (cost, latency, tokens)
- `CryptoAuditTrail` — crypto bot operation audit

## API Routes

### Authentication (`/api/auth/*`)
- `POST /api/auth/login` — email/password + 2FA, returns JWT in HttpOnly cookies
- `POST /api/auth/register` — self-registration with email verification
- `POST /api/auth/refresh` — rotate access token using refresh cookie
- `POST /api/auth/logout` — revoke session
- `POST /api/auth/forgot-password`, `/reset-password` — password reset flow
- `GET  /api/auth/me` — identity probe (works for guests too)
- `POST /api/auth/verify-email`, `/resend-verification` — email verification

### Admin (`/api/admin/*`)
All require admin role (SUPER_ADMIN, ADMIN, or OPERATOR with matching permission).
- `/api/admin/customers` — customer CRUD
- `/api/admin/licenses` — license management
- `/api/admin/kill-switch` — kill-switch resolver
- `/api/admin/vps/*` — VPS fleet management
- `/api/admin/audit` — audit log viewer
- `/api/admin/cms/*` — CMS content management (articles, banners, FAQ, pricing, landing, etc.)
- `/api/admin/blog-topics/*` — blog topic catalog management
- `/api/admin/system-info` — system diagnostics
- `/api/admin/maintenance` — maintenance mode toggle

### Client Portal (`/api/client/*`)
Require authenticated CLIENT role with active subscription.
- `/api/client/analytics/*` — performance, PnL, drawdown
- `/api/client/signal-audit` — signal audit trail
- `/api/client/calendar` — trading calendar
- `/api/client/scanner` — market scanner
- `/api/client/symbols`, `/news`, `/bars` — market data
- `/api/client/whatsapp/*` — WhatsApp verification + preferences
- `/api/client/trading-config` — trading configuration
- `/api/client/kill-switch/status` — kill-switch status
- `/api/client/crypto/notifications/*` — crypto notification preferences
- `/api/client/ai/budget` — AI usage budget

### Billing (`/api/billing/*`)
- `POST /api/billing/checkout` — initiate Xendit checkout
- `POST /api/billing/charge` — direct charge
- `GET  /api/billing/preview` — price preview with promo discount
- `GET  /api/billing/poll-status` — payment status polling
- `GET  /api/billing/xendit-config` — client-side Xendit config
- `POST /api/billing/webhook/xendit` — Xendit webhook receiver
- `POST /api/billing/webhook/midtrans` — Midtrans webhook receiver

### Forex Bridge (`/api/forex/*`)
Proxy to VPS1 forex backend — FE bridge only.
- `/api/forex/auth/login` — bridge login (body payload auth)
- `/api/forex/auth/refresh` — rotate forex tokens
- `/api/forex/auth/logout` — clear backend session
- `/api/forex/me` — fetch forex tenant profile
- `/api/forex/me/tier-upgrade` — tier upgrade request
- `/api/forex/billing/checkout` — forex checkout bridge

### Crypto (`/api/crypto/*`)
Bridge to crypto backend.
- `/api/crypto/subscription` — crypto subscription management
- `/api/crypto/keys/*` — API key management (submit, status, revoke)
- `/api/crypto/risk/*` — risk profile + kill-switch
- `/api/crypto/strategy/configure` — strategy configuration
- `/api/crypto/trading/status` — live trading status
- `/api/crypto/positions/[id]/close` — manual position close
- `/api/crypto/telegram/*` — Telegram binding for crypto alerts

### Public (`/api/public/*`)
No auth required — read-only.
- `/api/public/pricing` — pricing tiers
- `/api/public/articles` — published articles
- `/api/public/landing` — landing page sections
- `/api/public/faq` — FAQ
- `/api/public/testimonials`, `/banners`, `/popups` — marketing content
- `/api/public/pair-briefs` — published pair briefs
- `/api/public/changelog` — release changelog
- `/api/public/capabilities` — tier capability matrix
- `/api/public/pages` — static page content

### Cron (`/api/cron/*`)
Authenticated via `CRON_SECRET` header.
- `/api/cron/signals` — signal ingestion from VPS1
- `/api/cron/trade-events` — trade event sync
- `/api/cron/research` — research ingestion
- `/api/cron/pair-briefs` — pair brief generation
- `/api/cron/blog-articles` — AI blog article generation
- `/api/cron/daily-research` — daily research pipeline
- `/api/cron/seed-*` — database seeders (articles, blog topics, pricing, settings, changelog)
- `/api/cron/cleanup-stale-articles` — article cleanup
- `/api/cron/backfill-seo-meta` — SEO metadata backfill
- `/api/cron/refresh-article-images` — article image regeneration
- `/api/cron/promo-strategist` — AI promo decision engine

## Auth System

- **JWT tokens** via `jose` library (`src/lib/auth/jwt.ts`)
  - Access token: 15min expiry, HS256
  - Refresh token: 7d expiry
  - Stored in HttpOnly cookies (not localStorage)
- **4 roles**: `SUPER_ADMIN` > `ADMIN` > `OPERATOR` > `CLIENT`
- **RBAC permissions** (`src/lib/auth/permissions.ts`):
  - SUPER_ADMIN: bypass all checks
  - ADMIN with empty permissions: legacy full-access (back-compat)
  - ADMIN with permissions: scoped admin
  - OPERATOR: always scoped, must have explicit permission grants
  - CLIENT: no admin access
- **Permission scopes**: `dashboard.view`, `customers.view/write`, `licenses.view/write`, `kill_switch.view/resolve`, `vps.view/write`, `audit.view`, `users.view/write/create`, `cms.view/write/publish`, `settings.write`, `platform.config`
- **2FA**: TOTP with recovery codes, enforced at login
- **Email verification**: opt-in currently, infrastructure ready for mandatory gate

## Payment System

### Xendit (Primary — Inline)
- Card, QRIS, VA (Virtual Account), E-wallet
- Client-side via `js.xendit.co` tokenization
- Webhook at `/api/billing/webhook/xendit`
- Multi-currency support (IDR primary, USD for international)

### Midtrans (Legacy Fallback)
- Webhook at `/api/billing/webhook/midtrans`

### Invoice & PDF
- Institutional-grade PDF invoices via `pdf-lib`
- WinAnsi character sanitizer for PDF compatibility
- Payment method labels mapped to invoice display

## Background Workers

Initialized at server startup via `src/instrumentation.ts` -> `src/lib/cron/index.ts`.

| Worker | Interval | Feature Flag |
|--------|----------|-------------|
| Kill-switch monitor | 60s | Always on |
| VPS health check | 5min | Always on |
| Subscription expiry | 1h | Always on |
| WhatsApp OTP cleanup | 6h | Always on |
| Signal consumer | 30s | `ENABLE_SIGNAL_CONSUMER` |
| Trade events consumer | 20s | `ENABLE_TRADE_EVENTS_CONSUMER` |
| Research ingester | 6h | `ENABLE_RESEARCH_INGESTER` |
| Pair brief worker | 4h | `ENABLE_PAIR_BRIEF_WORKER` |
| Blog article generator | 12h | Auto when `OPENROUTER_API_KEY` set |
| Daily research | 24h | Auto when `OPENROUTER_API_KEY` set |
| CMS i18n auto-sync | 5min | Auto when `OPENROUTER_API_KEY` set |

### Feature Flags

DB-backed via `SiteSetting` table (`src/lib/feature-flags.ts`).
- Key pattern: `feature:<name>` with boolean type
- In-memory cache with 30s TTL
- Env var fallback (UPPERCASE_SNAKE_CASE) for backward compat
- Admin toggle propagates within 30s without restart

## Infrastructure

### Production (VPS3)
- **IP**: 148.230.96.201, **SSH port**: 1983 (NEVER port 22)
- **User**: abdullah
- **Stack**: Docker container + Cloudflare Tunnel
- **DB**: PostgreSQL native on host (not Docker) — `trading_commercial` DB, `trading_user` user
- **Access**: `sudo -u postgres psql` for DB operations

### CI/CD Pipeline
- **GitHub Actions** -> Docker Hub (`babahdigital/babahalgo-frontend`) -> VPS3 auto-deploy
- Pull-based deploy model
- Workflows: `ci.yml` (quality gates), `docker-publish.yml` (image build + push)
- Post-deploy auto-prune: Docker image cleanup to prevent disk bloat

### Docker
- Multi-stage build: deps -> builder -> runner (node:20-alpine)
- Standalone output mode
- Prisma binary target: `linux-musl-openssl-3.0.x`

### Backup
- Cloudflare R2 bucket: `babahalgo-backups/frontend/`
- Schedule: daily DB + public assets, weekly full

### DNS
- Docker daemon multi-DNS: 8.8.8.8 + 1.1.1.1 + 8.8.4.4 (fix for systemd-resolved intermittent timeouts)

## Centralization Architecture

All product/trading data flows through a single-source-of-truth cascade:

| Layer | File | Purpose |
|-------|------|---------|
| Master Data | `lib/trading/product-info.ts` | Strategies, pairs, tiers, stats |
| CMS Facade | `lib/trading/trading-settings.ts` | DB SiteSetting with 60s cache + fallback |
| Public API | `api/public/trading-info` | Client-accessible, 1h cache |
| Pricing | `lib/pricing-format.ts` | PRICE_TABLE (30 keys) + DB overrides |
| Company | `lib/company/settings.ts` | 19 fields, DB-backed |
| Compliance | `lib/compliance/disclaimers.ts` | Zero-custody, risk, no-PAMM, AI advisory |
| Tier Mapping | `lib/tiers/tier-slug-map.ts` | Uppercase ↔ kebab-case tier aliases |
| CTA Links | `lib/navigation/cta-links.ts` | Centralized /register, /checkout, /contact URLs |
| Rate Limits | `lib/api/rate-limiter.ts` | Server-side rate limit registry + checker |
| Feature Flags | `lib/feature-flag-registry.ts` | Type-safe flag registry (10 known flags) |
| Admin CRUD | `lib/admin/use-crud.ts` | Generic fetch/save/delete hook for CMS pages |
| SEO | `components/seo/json-ld-script.tsx` | Reusable JSON-LD injection |
| Layout | `components/solutions/solution-page-shell.tsx` | Shared solution page wrapper |

### i18n Shared Keys (single source for commonly duplicated content)
- `shared.ct_*` — Crypto tier names, descriptions, features (5 tiers)
- `shared.cs_*` — Crypto strategy names, taglines, descriptions (4 strategies)
- `shared.disclaimer_*` — Risk, zero-custody, AI advisory disclaimers

## Important Rules

### Scope
- **Frontend-only scope** — this repo is `trading-apifrontend` (VPS3)
- `trading-forex` backend (VPS1) is owned by another team — **READ-ONLY**
- VPS2 = Windows Server MT5 execution (user Trading, port 1983) — separate scope

### AI Policy
- **AI is ADVISORY ONLY** — never makes trading decisions
- AI provides research, web fetch, chat assistance only
- Zero-custody model: customers hold their own funds
- Copy across 14+ files must reflect "advisory only" language

### Data Integrity
- Always check `force_rls` before concluding "empty" on VPS1 `trading.*` tables — RLS fail-closed masking produces identical 0-row signal as genuinely empty
- Master tenant `019dc07b...` = system portfolio, FE must surface real metrics (never hallucinate)

### Security
- Never commit `.env`, credentials, or secrets
- JWT_SECRET, OPENROUTER_API_KEY, XENDIT keys — all via env vars
- CSP headers enforced in next.config.js
- HSTS preload via Cloudflare

### VPS3 Operations
- Standing authorization for all VPS3 operations (DB, systemctl, docker compose)
- Scope: VPS3 (148.230.96.201) only

## Environment Variables (Key Ones)

```
# Core
DATABASE_URL              # PostgreSQL connection string
JWT_SECRET                # HMAC secret for JWT signing
NEXT_PUBLIC_APP_URL       # https://babahalgo.com

# AI
OPENROUTER_API_KEY        # OpenRouter API key (enables AI features)

# Payment
XENDIT_SECRET_KEY         # Xendit server-side key
NEXT_PUBLIC_XENDIT_PUBLIC_KEY  # Xendit client-side key

# Notifications
FONNTE_API_KEY            # WhatsApp via Fonnte
TELEGRAM_BOT_TOKEN        # Telegram notifications
BREVO_SMTP_*              # Brevo email (SMTP transport)
BREVO_API_KEY             # Brevo email (API transport)

# Monitoring
SENTRY_DSN                # Sentry error tracking
SENTRY_ORG / SENTRY_PROJECT

# Workers
CRON_SECRET               # Auth for /api/cron/* endpoints
ENABLE_SIGNAL_CONSUMER    # Feature flag (1/true)
ENABLE_TRADE_EVENTS_CONSUMER
ENABLE_RESEARCH_INGESTER
ENABLE_PAIR_BRIEF_WORKER

# Backend bridges
VPS1_BASE_URL             # Forex backend base URL
CRYPTO_BACKEND_URL        # Crypto backend base URL
```

## Guest Pages (Public — Localized)

All under `src/app/[locale]/(guest)/`:

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/pricing` | Pricing tiers (forex + crypto) |
| `/pricing/apis` | API pricing |
| `/solutions` | Solutions overview |
| `/solutions/signal` | Signal subscription |
| `/solutions/crypto` | Crypto bot |
| `/solutions/license` | VPS license |
| `/solutions/institutional` | Institutional offering |
| `/platform` | Platform overview |
| `/platform/strategies` | Trading strategies |
| `/platform/strategies/[slug]` | Strategy detail |
| `/platform/technology` | Technology stack |
| `/platform/execution` | Execution engine |
| `/platform/instruments` | Tradable instruments |
| `/platform/risk-framework` | Risk management |
| `/performance` | Track record |
| `/research` | Research articles |
| `/research/[slug]` | Article detail |
| `/research/briefs` | Pair intelligence briefs |
| `/demo` | Demo CTA |
| `/register` | Registration wizard |
| `/about` | About company |
| `/about/team` | Team page |
| `/about/governance` | Governance |
| `/contact` | Contact form |
| `/status` | System status |
| `/changelog` | Release changelog |
| `/legal/terms` | Terms of service |
| `/legal/privacy` | Privacy policy |
| `/legal/cookies` | Cookie policy |
| `/legal/regulatory` | Regulatory info |
| `/legal/risk-disclosure` | Risk disclosure |
| `/unsubscribe` | Newsletter unsubscribe |

## Quick Reference Commands

```bash
# Development
npm run dev                   # Start dev server
npm run build                 # Production build
npm run lint                  # ESLint check
npx tsc --noEmit              # Type check

# Database
npx prisma generate           # Regenerate client after schema changes
npx prisma migrate dev        # Create + apply migration (dev)
npx prisma migrate deploy     # Apply pending migrations (production)
npx prisma studio             # Visual DB browser
npm run db:seed                # Run database seeder

# i18n
npm run i18n:sync              # Auto-translate id.json -> en.json
npm run i18n:sync:force        # Force re-translate all keys
npm run i18n:sync:dry          # Preview without writing

# CMS Translation
npm run cms:translate-faq      # Translate FAQ content
npm run cms:translate-faq:dry  # Preview FAQ translation

# Testing
npm run test:e2e               # Run Playwright E2E tests
npm run test:e2e:ui            # Playwright UI mode
```
