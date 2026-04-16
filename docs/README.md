# Trading API Frontend — Project Documentation

**CV Babah Digital** | Owner: Abdullah | Platform Version: 1.0

This directory contains the complete technical documentation for the Trading API Frontend — a commercial license management and client dashboard platform for AI-powered Forex trading bots.

---

## Table of Contents

| Document | Description |
|---|---|
| [architecture.md](./architecture.md) | 3-node architecture, data flow, Zero Trust topology |
| [api-reference.md](./api-reference.md) | Complete API endpoint reference with request/response schemas |
| [database.md](./database.md) | Database schema, models, enums, relationships, seed data |
| [deployment.md](./deployment.md) | Docker build, server setup, Cloudflare Tunnel, environment variables |
| [security.md](./security.md) | Auth flow, JWT, rate limiting, response filtering, kill-switch |
| [charts.md](./charts.md) | Chart components, props, data formats, usage examples |
| [pages.md](./pages.md) | Every page: route, layout, data sources, refresh intervals |

---

## Project Overview

The Trading API Frontend is a **Next.js 14 App Router** application that serves as the license management middleware and client-facing dashboard for CV Babah Digital's AI trading bot commercialization business.

It sits between the Python trading bot backends (VPS1) and end-user browsers, providing:

- **License issuance and lifecycle management** (CRUD, expiry, kill-switch)
- **Client portal** with filtered, real-time data proxied from VPS backends
- **Admin dashboard** for operators to manage users, VPS instances, and audit logs
- **Zero Trust deployment** via Cloudflare Tunnel — no exposed inbound ports

---

## Business Models

| Model | Audience | Price Range | License Type |
|---|---|---|---|
| VPS Installation | HNWI / proprietary traders | $3,000 – $7,500 one-time | `VPS_INSTALLATION` |
| PAMM Subscription | Retail investors | $49 – $149/month | `PAMM_SUBSCRIBER` |
| Signal Subscription | Retail traders | $49 – $99/month | `SIGNAL_SUBSCRIBER` |

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
| Password hashing | bcryptjs | latest |
| Charts (time-series) | Lightweight Charts | latest |
| Charts (analytics) | Recharts | latest |
| Styling | Tailwind CSS + Shadcn/UI + Radix UI | 3.4 |
| Runtime | Node.js | 20 (Alpine) |
| Container | Docker multi-stage | — |
| Network | Cloudflare Tunnel (Zero Trust) | — |

---

## Architecture Overview (ASCII)

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                           │
│              https://trading.babahdigital.net                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS (Zero Trust)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              CLOUDFLARE TUNNEL (babahdigital.net)               │
│         No inbound ports — outbound tunnel only                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                VPS2  148.230.96.201:1983                        │
│         Ubuntu 24.04 — Docker — Next.js :3000 (localhost)       │
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐    │
│  │  Middleware  │   │  API Routes  │   │  Cron Workers    │    │
│  │  (Edge JWT)  │   │  /api/*      │   │  kill-switch 60s │    │
│  └──────────────┘   └──────┬───────┘   │  health-check 5m │    │
│                            │           └──────────────────┘    │
│  ┌─────────────────────────▼──────────────────────────────┐    │
│  │               PostgreSQL 16 (host network)              │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP + X-API-Token (AES-256-GCM decrypted)
                           │ 15s timeout
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                VPS1  147.93.156.218:8000                        │
│       Python FastAPI — AI Scalping Bot — MetaTrader 5           │
│                                                                 │
│  /api/scalping/status    /api/positions    /api/equity/history  │
│  /api/trades/history     /api/performance/summary               │
│  /api/scanner/status     /api/report/today  /api/calendar       │
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
├── docs/                          # This documentation
├── prisma/
│   ├── schema.prisma              # Database schema (9 models, 6 enums)
│   ├── seed.ts                    # Seed script
│   └── migrations/                # SQL migration history
├── scripts/
│   ├── setup-server.sh            # Ubuntu server bootstrap
│   └── setup-tunnel.sh            # Cloudflare Tunnel configuration
├── src/
│   ├── app/
│   │   ├── (admin)/admin/         # Admin panel pages
│   │   ├── (auth)/login/          # Login page
│   │   ├── (portal)/portal/       # Client portal pages
│   │   ├── api/
│   │   │   ├── admin/             # Admin API routes
│   │   │   ├── auth/              # Auth API routes
│   │   │   └── client/            # Client proxy API routes
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx               # Landing page
│   ├── components/
│   │   ├── charts/                # 8 chart components
│   │   └── ui/                    # Shadcn/UI primitives
│   ├── lib/
│   │   ├── auth/                  # JWT + password utilities
│   │   ├── cron/                  # Background workers
│   │   ├── db/                    # Prisma client singleton
│   │   └── proxy/                 # VPS proxy + response filters
│   └── middleware.ts               # Edge middleware (auth + rate limit)
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
| VPS2 (this app) | 148.230.96.201 | License middleware + client dashboard |
| VPS1 (Python bot) | 147.93.156.218:8000 | AI trading bot + MT5 bridge |
| PostgreSQL | VPS2 host network | Persistent storage |
| Cloudflare Tunnel | cloudflared service | HTTPS ingress without open ports |
| Domain | trading.babahdigital.net | Public-facing URL |
