# BabahAlgo — Project Documentation

**CV Babah Digital** | Owner: Abdullah | Platform Version: 2.0

This directory contains the complete technical documentation for BabahAlgo — an institutional quantitative trading platform providing AI-powered trading infrastructure, signal services, PAMM accounts, and VPS license management.

---

## Table of Contents

| Document | Description |
|---|---|
| [CHANGELOG.md](./CHANGELOG.md) | Complete changelog of enterprise transformation (v2.0) |
| [architecture.md](./architecture.md) | 3-node architecture, data flow, Zero Trust topology |
| [api-reference.md](./api-reference.md) | Complete API endpoint reference with request/response schemas |
| [database.md](./database.md) | Database schema, models, enums, relationships, seed data |
| [deployment.md](./deployment.md) | Docker build, server setup, Cloudflare Tunnel, environment variables |
| [security.md](./security.md) | Auth flow, JWT, rate limiting, response filtering, kill-switch |
| [charts.md](./charts.md) | Chart components, props, data formats, usage examples |
| [pages.md](./pages.md) | Every page: route, layout, data sources, refresh intervals |

---

## Project Overview

BabahAlgo is a **Next.js 14 App Router** application that serves as the enterprise platform for CV Babah Digital's quantitative trading business. It provides:

- **Public-facing website** with enterprise design, i18n (ID/EN), performance data, and research content
- **Self-serve registration** for Signal, PAMM, and Institutional engagement flows
- **CMS-powered content** with admin management for pages, articles, FAQ, pricing, testimonials, and more
- **License issuance and lifecycle management** (CRUD, expiry, kill-switch)
- **Client portal** with filtered, real-time data proxied from VPS backends
- **Admin dashboard** for operators to manage users, VPS instances, CMS content, and audit logs
- **Zero Trust deployment** via Cloudflare Tunnel — no exposed inbound ports
- **Cal.com scheduling integration** for client briefings via Google Meet

---

## Business Models

| Model | Audience | Price Range | License/Tier |
|---|---|---|---|
| Signal Basic | Retail traders | $49/month | `SIGNAL_BASIC` |
| Signal VIP | Active traders | $149/month | `SIGNAL_VIP` |
| PAMM Basic | Retail investors | 20% profit share | `PAMM_BASIC` |
| PAMM Pro | Professional investors | 30% profit share | `PAMM_PRO` |
| VPS License | HNWI / prop traders | $3,000 – $7,500 one-time | `VPS_INSTALLATION` |
| Institutional | Funds / family offices | Custom | Custom mandate |

---

## Tech Stack Summary

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 14.2.21 |
| Language | TypeScript | 5.7 |
| UI | React | 18.3 |
| ORM | Prisma | 5.22 |
| Database | PostgreSQL | 16 |
| Auth | jose (HS256 JWT) | latest |
| i18n | next-intl | latest |
| Scheduling | @calcom/embed-react | 1.5.3 |
| Charts (time-series) | Lightweight Charts | latest |
| Charts (analytics) | Recharts | latest |
| Styling | Tailwind CSS + Shadcn/UI + Radix UI | 3.4 |
| Fonts | Fraunces (display), Inter Tight (body), JetBrains Mono (data) |
| Runtime | Node.js | 20 (Alpine) |
| Container | Docker multi-stage | — |
| Network | Cloudflare Tunnel (Zero Trust) | — |

---

## Design System

### Typography
- **Display**: Fraunces (serif) — headlines, section titles
- **Body**: Inter Tight — paragraph text, UI labels
- **Mono**: JetBrains Mono — data, prices, code, account numbers

### Brand Colors
| Token | Hex | Usage |
|---|---|---|
| Midnight | `#0B1220` | Background, dark surfaces |
| Signal Amber | `#F5B547` | CTAs, accent, highlights |
| Paper White | `#FAFAF7` | Light mode background, text on dark |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                           │
│                    https://babahalgo.com                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS (Zero Trust)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              CLOUDFLARE TUNNEL (babahalgo.com)                   │
│         No inbound ports — outbound tunnel only                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                VPS2  148.230.96.201:1983                         │
│         Ubuntu 24.04 — Docker — Next.js :3000 (localhost)       │
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐    │
│  │  Middleware  │   │  API Routes  │   │  Cron Workers    │    │
│  │  (Edge JWT)  │   │  /api/*      │   │  kill-switch 60s │    │
│  │  (i18n)      │   │  /api/admin  │   │  health-check 5m │    │
│  │  (geo-det.)  │   │  /api/public │   └──────────────────┘    │
│  └──────────────┘   └──────┬───────┘                            │
│                            │                                     │
│  ┌─────────────────────────▼──────────────────────────────┐    │
│  │               PostgreSQL 16 (host network)              │    │
│  │    Users, Licenses, Subscriptions, Sessions, CMS        │    │
│  │    PageContent, Articles, Testimonials, FAQ, Banners    │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP + X-API-Token (AES-256-GCM)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                VPS1  147.93.156.218:8000                         │
│       Python FastAPI — AI Scalping Bot — MetaTrader 5           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Start (Development)

### Prerequisites

- Node.js 20+
- PostgreSQL 16 running locally
- `.env.local` configured (see [deployment.md](./deployment.md))

### Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed initial admin user and sample data
npx prisma db seed

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Default Admin Credentials (seed)

```
Email:    admin@babahdigital.net   (or ADMIN_EMAIL env var)
Password: configured via ADMIN_PASSWORD env var
```

---

## Quick Start (Production via Docker)

```bash
# Clone and configure environment
cp .env.example .env
# Edit .env with real values

# Build and run
docker compose up -d --build

# Run migrations
docker compose exec app npx prisma migrate deploy
```

See [deployment.md](./deployment.md) for the full production deployment guide including Cloudflare Tunnel setup.

---

## Directory Structure

```
trading-apifrontend/
├── docs/                              # This documentation
├── prisma/
│   ├── schema.prisma                  # Database schema (11 models, 8 enums)
│   ├── seed.ts                        # Seed script
│   └── migrations/                    # SQL migration history
├── scripts/
│   ├── setup-server.sh                # Ubuntu server bootstrap
│   └── setup-tunnel.sh                # Cloudflare Tunnel configuration
├── src/
│   ├── app/
│   │   ├── [locale]/(guest)/          # Public guest pages (i18n routed)
│   │   │   ├── platform/             # Platform pages (overview, technology, etc.)
│   │   │   ├── solutions/            # Solutions info pages
│   │   │   ├── register/             # Self-serve registration flows
│   │   │   ├── performance/          # Live performance data
│   │   │   ├── research/             # Research articles
│   │   │   ├── contact/              # Cal.com scheduling + contact form
│   │   │   ├── about/                # Company info pages
│   │   │   ├── legal/                # Terms, privacy, risk disclosure
│   │   │   └── pricing/              # Pricing comparison
│   │   ├── (admin)/admin/             # Admin panel pages
│   │   │   └── cms/                   # CMS management (articles, pages, FAQ, etc.)
│   │   ├── (auth)/login/              # Login page
│   │   ├── (portal)/portal/           # Client portal pages
│   │   └── api/
│   │       ├── admin/                 # Admin API routes
│   │       │   └── cms/               # CMS CRUD APIs
│   │       ├── auth/                  # Auth API routes (login, register, refresh)
│   │       ├── client/                # Client proxy API routes
│   │       └── public/                # Public API routes (performance, articles)
│   ├── components/
│   │   ├── charts/                    # 8 chart components
│   │   ├── diagrams/                  # Architecture SVG diagram
│   │   ├── forms/                     # Contact form
│   │   ├── icons/                     # Custom enterprise SVG icons
│   │   ├── layout/                    # EnterpriseNav, EnterpriseFooter, ResponsiveSidebar
│   │   └── ui/                        # Shadcn/UI primitives + CalEmbed
│   ├── i18n/                          # next-intl config, navigation, translations
│   ├── lib/
│   │   ├── auth/                      # JWT + password utilities
│   │   ├── cron/                      # Background workers
│   │   ├── db/                        # Prisma client singleton
│   │   └── proxy/                     # VPS proxy + response filters
│   └── middleware.ts                   # Edge middleware (auth + rate limit + i18n + geo + legacy redirects)
├── public/
│   └── logo/                          # Brand logo assets (PNG variants)
├── docker-compose.yml
├── Dockerfile
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

---

## Related Infrastructure

| Component | Location | Role |
|---|---|---|
| VPS2 (this app) | 148.230.96.201 | BabahAlgo platform + client dashboard |
| VPS1 (Python bot) | 147.93.156.218:8000 | AI trading bot + MT5 bridge |
| PostgreSQL | VPS2 host network | Persistent storage |
| Cloudflare Tunnel | cloudflared service | HTTPS ingress without open ports |
| Domain | babahalgo.com | Public-facing URL |
| Cal.com | app.cal.com | Scheduling widget embedded on contact page |
