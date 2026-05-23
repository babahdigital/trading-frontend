# BabahAlgo Frontend

[![Docker Publish](https://github.com/babahdigital/trading-apifrontend/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/babahdigital/trading-apifrontend/actions/workflows/docker-publish.yml)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)](https://www.prisma.io/)

> Institutional-grade trading platform frontend serving forex signal subscriptions and crypto bot management. Bilingual (Indonesian/English), multi-product, deployed via Docker on VPS with Cloudflare Tunnel.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, standalone output) |
| UI | React 19, Tailwind CSS 3.4, Radix UI primitives |
| Language | TypeScript 5.7 |
| ORM / DB | Prisma 5 + PostgreSQL 16 |
| Auth | JWT (jose) + HttpOnly cookies, RBAC (SUPER_ADMIN / ADMIN / OPERATOR / CLIENT) |
| i18n | next-intl 4 (id/en), OpenRouter-powered auto-translation |
| AI | Vercel AI SDK 6 + OpenRouter (Gemini model family) |
| Charts | Recharts, Lightweight Charts (TradingView) |
| Payments | Xendit (Card, QRIS, VA, E-wallet), Midtrans |
| Email | Brevo (API + SMTP fallback), Nodemailer |
| PDF | pdf-lib (institutional invoice generation) |
| Animation | Framer Motion 12 |
| Monitoring | Sentry (client + server + edge) |
| E2E Tests | Playwright |
| CI/CD | GitHub Actions -> Docker Hub -> VPS auto-deploy |

---

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16 (local or Docker)
- npm (not yarn/pnpm -- lockfile is `package-lock.json`)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npx prisma generate

# 3. Create env file
cp .env.example .env.local
# Edit .env.local -- at minimum set:
#   DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD

# 4. Run database migrations
npx prisma migrate deploy

# 5. Seed the database (admin user, pricing tiers, landing content)
npm run db:seed

# 6. Start dev server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Docker (local)

```bash
docker compose up -d          # App + PostgreSQL
docker compose exec app npx prisma migrate deploy
docker compose exec app npx prisma db seed
```

---

## Project Structure

```
trading-apifrontend/
|-- src/
|   |-- app/                      # Next.js App Router
|   |   |-- [locale]/(guest)/     # Public pages (bilingual, i18n routed)
|   |   |-- (auth)/               # Login, forgot/reset password
|   |   |-- (portal)/portal/      # Authenticated client dashboard
|   |   |-- (admin)/admin/        # Admin/operator console
|   |   |-- api/                  # API route handlers (19 groups)
|   |-- components/
|   |   |-- ui/                   # Base UI primitives (Button, Input, Card, etc.)
|   |   |-- shared/               # Cross-cutting (Trust, Stats, FAQ, ConfirmDialog)
|   |   |-- landing/              # Landing page sections
|   |   |-- portal/               # Portal-specific components
|   |   |-- admin/                # Admin console components
|   |   |-- charts/               # TradingView + Recharts wrappers
|   |   |-- chat/                 # AI chat widget (state machine)
|   |   |-- checkout/             # Xendit inline payment flow
|   |   |-- pricing/              # Pricing cards and tier display
|   |   |-- layout/               # EnterpriseNav, Footer, MegaMenu
|   |   |-- icons/                # Unified icon system (Lucide)
|   |   +-- ...                   # demo, forms, notifications, register, etc.
|   |-- lib/                      # Business logic modules
|   |   |-- auth/                 # JWT verify, RBAC helpers, session
|   |   |-- ai/                   # OpenRouter client, prompt templates
|   |   |-- api/                  # Backend proxy utilities
|   |   |-- crypto/               # Crypto backend integration
|   |   |-- forex/                # Forex backend bridge
|   |   |-- payment/              # Xendit + Midtrans adapters
|   |   |-- email/                # Brevo transport, template rendering
|   |   |-- cms/                  # CMS data loaders
|   |   |-- chat/                 # Chat skills (forex/crypto/global)
|   |   |-- kyc/                  # KYC submission + verification
|   |   |-- vps1/                 # VPS1 backend HTTP client
|   |   |-- workers/              # In-process background workers
|   |   |-- consumers/            # Signal + trade event consumers
|   |   |-- ingesters/            # Research ingester
|   |   |-- cron/                 # Cron job logic
|   |   |-- notifier/             # Telegram, email, push dispatch
|   |   |-- whatsapp/             # Fonnte integration
|   |   |-- geoip/                # Geo-IP country detection (auto-locale)
|   |   |-- pricing-db.ts         # Pricing tier DB queries
|   |   |-- phone.ts              # E.164 phone normalization
|   |   +-- ...                   # analytics, blog, charts, hooks, etc.
|   |-- i18n/
|   |   |-- config.ts             # Locale definitions (id, en)
|   |   |-- messages/             # id.json + en.json (3100+ translation keys)
|   |   |-- navigation.ts         # i18n-aware routing
|   |   +-- request.ts            # next-intl server request config
|   |-- types/                    # Shared TypeScript type definitions
|   |-- proxy.ts                  # Edge middleware (auth, i18n, geo-IP, maintenance)
|   +-- instrumentation.ts        # Sentry + worker bootstrap
|-- prisma/
|   |-- schema.prisma             # 42 models, enums, indexes
|   |-- migrations/               # Versioned SQL migrations
|   |-- seed.ts                   # Admin + initial data seeder
|   +-- seed-articles.ts          # Research article seed data
|-- public/
|   |-- logo/                     # Brand assets
|   |-- uploads/                  # CMS-uploaded images
|   |-- manifest.json             # PWA manifest
|   +-- sw.js                     # Service worker (push notifications)
|-- scripts/
|   |-- translate-i18n.ts         # OpenRouter auto-translate id -> en
|   |-- translate-cms-faq.ts      # CMS FAQ auto-translation
|   |-- seed-pricing-tiers.ts     # Pricing tier seed script
|   |-- seed-calendar-events.ts   # Economic calendar seed
|   |-- backup-db.sh              # Manual DB backup
|   +-- setup-server.sh           # VPS provisioning helper
|-- e2e/                          # Playwright end-to-end tests
|-- .github/workflows/            # CI/CD pipeline
|-- docker-compose.yml            # Local development (app + postgres)
|-- docker-compose.prod.yml       # Production (app + backup + R2 sync)
+-- Dockerfile                    # Multi-stage build (deps -> build -> runner)
```

---

## Pages Overview

### Guest Pages (Public, Bilingual)

| Route | Description |
|-------|------------|
| `/` | Landing page (CMS-driven sections) |
| `/pricing` | Subscription tiers (forex + crypto) |
| `/pricing/apis` | API marketplace pricing |
| `/performance` | Live trading performance metrics |
| `/research/briefs` | AI-generated pair briefs |
| `/research/[slug]` | Individual research article |
| `/platform` | Platform overview |
| `/platform/strategies` | Trading strategy catalog |
| `/platform/technology` | Technology stack showcase |
| `/platform/instruments` | Supported instruments |
| `/platform/execution` | Execution infrastructure |
| `/platform/risk-framework` | Risk management framework |
| `/solutions` | Solutions overview |
| `/solutions/signal` | Forex signal product |
| `/solutions/crypto` | Crypto bot product |
| `/solutions/license` | VPS license product |
| `/solutions/institutional` | Institutional offering |
| `/demo` | Interactive demo |
| `/contact` | Contact form + inquiry |
| `/about` | Company overview |
| `/about/team` | Team page |
| `/about/governance` | Governance structure |
| `/legal/terms` | Terms of service |
| `/legal/privacy` | Privacy policy |
| `/legal/risk-disclosure` | Risk disclosure |
| `/changelog` | Product changelog |
| `/status` | System status page |
| `/register` | Customer registration |
| `/checkout` | Checkout flow (Xendit inline) |

### Auth Pages

| Route | Description |
|-------|------------|
| `/login` | Customer login |
| `/admin/login` | Admin/operator login |
| `/forgot-password` | Password reset request |
| `/reset-password` | Password reset with token |

### Portal (Authenticated Client)

| Route | Description |
|-------|------------|
| `/portal` | Dashboard overview |
| `/portal/signals` | Live forex signals |
| `/portal/positions` | Open positions |
| `/portal/history` | Trade history |
| `/portal/performance` | Personal performance analytics |
| `/portal/market` | Market scanner |
| `/portal/pair-briefs` | AI pair analysis |
| `/portal/signal-audit` | Signal audit trail |
| `/portal/reports` | Reports |
| `/portal/features` | Feature status |
| `/portal/notifications` | Notification center |
| `/portal/account` | Account settings |
| `/portal/kyc` | KYC submission |
| `/portal/crypto` | Crypto bot dashboard |
| `/portal/crypto/connect` | Exchange API key binding |
| `/portal/crypto/strategy` | Strategy configuration |
| `/portal/crypto/positions` | Crypto open positions |
| `/portal/crypto/trades` | Crypto trade history |
| `/portal/crypto/risk` | Crypto risk settings |
| `/portal/crypto/performance` | Crypto performance |
| `/portal/billing/upgrade` | Subscription upgrade |
| `/portal/billing/success` | Payment success |
| `/portal/billing/failure` | Payment failure |
| `/portal/billing/pending` | Payment pending |
| `/portal/my-vps` | VPS instance management |

### Admin Console

| Category | Pages |
|----------|-------|
| **Operations** | Dashboard, Customers, KYC (list + detail), Licenses, Kill Switch, Analytics, Audit Log |
| **Infrastructure** | VPS Fleet (list + detail), Profile |
| **CMS** | Landing, Pricing, Banners, Popups, Testimonials, FAQ, SEO, Pages, Articles, Blog Topics, Changelog, Chat Leads, Inquiries, Subscribers |
| **Config** | Company Settings, Site Settings, Email Settings (Brevo), Email Templates (list + detail + new) |
| **People** | Team & RBAC (list + new), Users |

---

## API Route Groups

| Prefix | Purpose | Auth |
|--------|---------|------|
| `/api/health` | Health check | Public |
| `/api/auth/*` | Login, register, refresh, forgot/reset password, email verify | Public |
| `/api/public/*` | CMS content (landing, pricing, articles, testimonials, banners, popups, FAQ, changelog) | Public |
| `/api/client/*` | Client portal data (signals, positions, analytics, trading config, notifications, invoices, WhatsApp) | JWT (CLIENT) |
| `/api/crypto/*` | Crypto backend proxy (subscription, keys, strategy, risk, positions, trading status) | JWT (CLIENT) |
| `/api/admin/*` | Admin operations (customers, licenses, kill-switch, VPS fleet, audit, CMS, blog, upload) | JWT (ADMIN+) |
| `/api/cms/*` | CMS management | JWT (ADMIN+) |
| `/api/billing/*` | Payment webhooks (Xendit, Midtrans) | Webhook token |
| `/api/cron/*` | Scheduled jobs (signals, trade events, research, blog, cleanup) | CRON_SECRET |
| `/api/kyc/*` | KYC submission and verification | JWT (CLIENT) |
| `/api/license/*` | License validation endpoint | API key |
| `/api/chat` | AI chat (streaming, skill-routed) | Optional JWT |
| `/api/webhook/*` | External webhooks (Telegram) | Token-based |
| `/api/notifications/*` | Push notification subscription | JWT |
| `/api/analytics/*` | Event tracking | Public |
| `/api/portal/*` | Portal-specific data | JWT (CLIENT) |
| `/api/uploads/*` | File upload handling | JWT (ADMIN+) |
| `/api/v1/*` | Versioned public API | API key |
| `/api/forex/*` | Forex backend proxy | JWT (CLIENT) |

---

## Environment Variables

See `.env.example` for the complete list with documentation. Key groups:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | JWT signing key (generate: `openssl rand -base64 64`) |
| `ADMIN_EMAIL` | Yes | Bootstrap admin email |
| `ADMIN_PASSWORD` | Yes | Bootstrap admin password |
| `NEXT_PUBLIC_APP_URL` | Yes | Public-facing URL (e.g. `https://babahalgo.com`) |
| `LICENSE_MW_MASTER_KEY` | Yes | AES-256 key for VPS token encryption |
| `VPS1_BACKEND_URL` | Yes | Forex backend URL (via SSH tunnel) |
| `CRYPTO_BACKEND_URL` | No | Crypto backend URL |
| `CRON_SECRET` | Prod | Secret for authenticating cron endpoints |
| `OPENROUTER_API_KEY` | No | AI features (chat, briefs, translations, blog) |
| `BREVO_API_KEY` | No | Transactional email (Brevo API) |
| `XENDIT_SECRET_KEY` | No | Payment processing (Xendit) |
| `MIDTRANS_SERVER_KEY` | No | Payment processing (Midtrans) |
| `TELEGRAM_BOT_TOKEN` | No | Telegram notifications |
| `FONNTE_TOKEN` | No | WhatsApp OTP validation |
| `SENTRY_DSN` | No | Error tracking |
| `R2_ENABLED` | No | Cloudflare R2 offsite backup (`true`/`false`) |
| `ENABLE_SIGNAL_CONSUMER` | No | In-process signal consumer (`1`/`0`) |
| `ENABLE_TRADE_EVENTS_CONSUMER` | No | Trade events consumer (`1`/`0`) |
| `ENABLE_RESEARCH_INGESTER` | No | Research ingester (`1`/`0`) |
| `ENABLE_BLOG_GENERATOR` | No | AI blog article generator |

---

## Database Schema

42 Prisma models across these domains:

| Domain | Models |
|--------|--------|
| **Identity** | User, Session, PasswordResetToken, EmailVerificationToken |
| **Licensing** | License, Subscription, CryptoBotSubscription |
| **Infrastructure** | VpsInstance, HealthCheck, KillSwitchEvent |
| **CMS** | LandingSection, PricingTier, Banner, Popup, Promotion, CalendarEvent, Faq, Testimonial, PageMeta, PageContent, Article, BlogTopic, Changelog |
| **Communication** | Inquiry, ChatLead, Subscriber, NotificationLog, NotificationPreference, WhatsappVerification, PushSubscription |
| **Finance** | Invoice, RevenueSnapshot |
| **Operations** | AuditLog, SiteSetting, EmailTemplate, ConsumerState, SignalAuditLog, WorkerRun, AiCallLog |
| **Analytics** | AnalyticsEvent |
| **Research** | PairBrief |
| **KYC** | UserKyc |
| **Crypto** | CryptoAuditTrail |
| **Company** | CompanySettings (via SiteSetting JSON) |

RBAC roles: `SUPER_ADMIN` > `ADMIN` > `OPERATOR` > `CLIENT`. Operators use scoped permission arrays.

### Common Commands

```bash
npm run db:generate       # Regenerate Prisma client after schema changes
npm run db:migrate:dev    # Create a new migration (dev only)
npm run db:migrate        # Apply pending migrations (production)
npm run db:seed           # Seed admin user + initial data
npm run db:studio         # Open Prisma Studio GUI
```

---

## Deployment

### CI/CD Pipeline

Push to `main` triggers the automated pipeline:

1. **Build** -- Multi-stage Docker image (node:20-alpine)
2. **Push** -- Image pushed to Docker Hub as `babahdigital/babahalgo-frontend:latest`
3. **Deploy** -- SSH into VPS3, pull new image, `docker compose up -d --force-recreate`

Tags matching `v*` also publish with the semver tag.

### Production Architecture

```
Client --> Cloudflare Tunnel --> VPS3 (148.230.96.201)
                                  |-- Docker: app (port 3000)
                                  |-- Docker: db-backup (nightly pg_dump)
                                  |-- Docker: r2-backup (Cloudflare R2 offsite)
                                  |-- PostgreSQL (native on host)
                                  |-- SSH tunnel to VPS1 (forex backend)
```

### Manual Deploy

```bash
# On VPS3
cd /opt/trading-commercial
docker compose -f docker-compose.prod.yml pull app
docker compose -f docker-compose.prod.yml up -d --force-recreate app
```

### Container Startup

The `docker-entrypoint.sh` runs `prisma migrate deploy` automatically before starting the Next.js server, ensuring the database schema is always up to date.

---

## Quality Gates

Run all three before committing:

```bash
npx prisma generate       # Ensure Prisma client is up to date
npx tsc --noEmit           # Type check (zero errors required)
npx next lint              # ESLint (next/core-web-vitals rules)
npx next build             # Full production build
```

### E2E Tests

```bash
npm run test:e2e           # Run Playwright tests (against deployed URL)
npm run test:e2e:local     # Run against localhost:3000
npm run test:e2e:ui        # Open Playwright UI mode
```

---

## i18n (Internationalization)

- **Source of truth**: `src/i18n/messages/id.json` (Indonesian)
- **Auto-translated**: `src/i18n/messages/en.json` (English)
- **3100+ translation keys** across 21+ namespaces
- All guest-facing pages are fully bilingual
- Portal and admin pages use Indonesian labels by default

### Commands

```bash
npm run i18n:sync          # Auto-translate new/changed keys (id -> en)
npm run i18n:sync:dry      # Preview changes without writing
npm run i18n:sync:force    # Force re-translate all keys
```

### Adding Translations

1. Add the key to `src/i18n/messages/id.json` in the appropriate namespace
2. Run `npm run i18n:sync` to auto-generate the English translation
3. Review the generated English text in `en.json`

---

## AI Integration

Single provider architecture via OpenRouter (one API key for all AI features):

| Feature | Model | Purpose |
|---------|-------|---------|
| Chat widget | Gemini 3.1 Flash Lite | Real-time trading Q&A |
| Blog articles | Gemini 3.5 Flash | Long-form content generation |
| Image generation | Gemini 2.5 Flash Image | Article hero images |
| CMS translation | Gemini 3.1 Flash Lite | Auto-translate CMS content |
| Research briefs | Gemini 3.1 Flash Lite | Daily pair analysis |
| i18n sync | Gemini 3.1 Flash Lite | UI string translation |

All AI calls are logged to the `AiCallLog` model for cost tracking and audit.

---

## Background Workers

In-process workers run alongside the Next.js server (controlled via env flags):

| Worker | Env Flag | Description |
|--------|----------|-------------|
| Signal Consumer | `ENABLE_SIGNAL_CONSUMER` | Polls VPS1 for new forex signals |
| Trade Events | `ENABLE_TRADE_EVENTS_CONSUMER` | Polls VPS1 for trade open/close events |
| Research Ingester | `ENABLE_RESEARCH_INGESTER` | Pulls research data from VPS1 |
| Pair Brief | `ENABLE_PAIR_BRIEF_WORKER` | Generates AI pair analysis |
| Blog Generator | `ENABLE_BLOG_GENERATOR` | Auto-generates blog articles on schedule |
| Daily Research | `ENABLE_DAILY_RESEARCH` | Day-of-week research article rotation |
| CMS i18n Auto | `ENABLE_CMS_I18N_AUTO` | Auto-translates CMS content every 5 min |

---

## Middleware (Edge)

`src/proxy.ts` runs on the Edge runtime and handles:

- **JWT verification** -- validates HttpOnly cookie, redirects unauthenticated users
- **Role-based routing** -- separates admin, portal, and guest paths
- **i18n routing** -- locale prefix detection and negotiation
- **Geo-IP detection** -- auto-sets locale based on country
- **Maintenance mode** -- serves maintenance page when enabled

---

## Key Conventions

- **Feature modules** live in `src/lib/{feature}/` with isolation boundaries
- **Components** follow `src/components/{domain}/` organization
- **Design tokens** are centralized as CSS custom properties in Tailwind config
- **Shared UI** uses Radix primitives wrapped in `src/components/ui/`
- **API routes** use Zod for request validation
- **All monetary amounts** are stored as `Decimal` in the database
- **Phone numbers** are normalized to E.164 format via `libphonenumber-js`

---

## License

Proprietary -- Babah Digital. All rights reserved.
