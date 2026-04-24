# Architecture

**Trading API Frontend — CV Babah Digital**

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [3-Node Architecture](#2-3-node-architecture)
3. [Data Flow Diagrams](#3-data-flow-diagrams)
4. [Proxy Pattern](#4-proxy-pattern)
5. [Response Filtering](#5-response-filtering)
6. [Security Layers](#6-security-layers)
7. [Zero Trust Topology](#7-zero-trust-topology)
8. [Cron Workers](#8-cron-workers)
9. [Technology Decisions](#9-technology-decisions)

---

## 1. System Overview

The platform is structured as a **three-tier architecture** where VPS2 (this application) acts as an authenticated middleware between the Python trading backend (VPS1) and client browsers. It handles:

- **Identity and access management** — JWT issuance, session management, role enforcement
- **License lifecycle** — creation, renewal, expiry detection, kill-switch
- **Data proxying** — forwarding authenticated requests to VPS1 and filtering sensitive fields before responding to clients
- **Audit and observability** — all significant actions are logged; VPS health is polled every 5 minutes

---

## 2. 3-Node Architecture

```
╔══════════════════════════════════════════════════════════════════════════╗
║  NODE 1: CLIENT BROWSER                                                  ║
║                                                                          ║
║  https://babahalgo.com                                                   ║
║  Next.js SSR + React SPA — Tailwind CSS + Shadcn/UI                      ║
║  Charts: Lightweight Charts (equity) + Recharts (analytics)              ║
╚══════════════════════════════╦═══════════════════════════════════════════╝
                               ║ HTTPS / WSS
                               ║ Bearer token (JWT HS256)
                               ║
               ╔═══════════════▼═══════════════════════════════════════════╗
               ║  CLOUDFLARE TUNNEL                                        ║
               ║  Zero Trust — no inbound firewall rules required          ║
               ║  Terminates TLS — forwards to localhost:3000              ║
               ╚═══════════════╦═══════════════════════════════════════════╝
                               ║ HTTP (internal loopback)
                               ║
╔══════════════════════════════▼═══════════════════════════════════════════╗
║  NODE 2: VPS2 — 148.230.96.201  (Ubuntu 24.04)                          ║
║                                                                          ║
║  ┌────────────────────────────────────────────────────────────────────┐  ║
║  │  Docker Container: trading-apifrontend                             │  ║
║  │  Next.js 14.2.21  —  Node 20 Alpine  —  Port 3000 (localhost)     │  ║
║  │                                                                    │  ║
║  │  ┌──────────────┐  ┌────────────────┐  ┌──────────────────────┐  │  ║
║  │  │  Edge        │  │  Route         │  │  Background Workers  │  │  ║
║  │  │  Middleware  │  │  Handlers      │  │                      │  │  ║
║  │  │              │  │                │  │  kill-switch  60s    │  │  ║
║  │  │  JWT verify  │  │  /api/admin/*  │  │  health-check  5min  │  │  ║
║  │  │  Rate limit  │  │  /api/client/* │  │                      │  │  ║
║  │  │  Role guard  │  │  /api/auth/*   │  └──────────────────────┘  │  ║
║  │  └──────────────┘  └───────┬────────┘                            │  ║
║  │                            │ Prisma ORM                          │  ║
║  └────────────────────────────│────────────────────────────────────┘  ║
║                               │                                        ║
║  ┌────────────────────────────▼────────────────────────────────────┐  ║
║  │  PostgreSQL 16  (host network — not containerized)              │  ║
║  │  DB: trading_commercial                                         │  ║
║  │  9 models: User, License, VpsInstance, Subscription,           │  ║
║  │           KillSwitchEvent, HealthCheck, AuditLog, Session       │  ║
║  └────────────────────────────────────────────────────────────────┘  ║
╚══════════════════════════════╦═══════════════════════════════════════════╝
                               ║ HTTP — X-API-Token header
                               ║ (AES-256-GCM decrypted per-request)
                               ║ 15-second timeout
                               ║
╔══════════════════════════════▼═══════════════════════════════════════════╗
║  NODE 3: VPS1 — 147.93.156.218:8000  (Python FastAPI)                   ║
║                                                                          ║
║  AI Scalping Bot  —  MetaTrader 5 Bridge  —  ZMQ Connector              ║
║                                                                          ║
║  Endpoints consumed by VPS2:                                             ║
║  GET  /api/scalping/status       GET  /api/positions                     ║
║  GET  /api/equity/history        GET  /api/trades/history                ║
║  GET  /api/performance/summary   GET  /api/scanner/status                ║
║  GET  /api/report/today          GET  /api/calendar                      ║
║  POST /api/scalping/stop         (kill-switch trigger)                   ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## 3. Data Flow Diagrams

### 3.1 Authentication Flow

```
Browser                VPS2 (Next.js)           PostgreSQL
  │                         │                        │
  │── POST /api/auth/login ─►│                        │
  │   { email, password }   │── findUnique(email) ──►│
  │   OR                    │◄── User record ─────────│
  │   { licenseKey,         │                        │
  │     mt5Account,         │── rate limit check     │
  │     password }          │── bcrypt.compare()     │
  │                         │                        │
  │                         │── findFirst(licenseKey)►│
  │                         │◄── License + VPS ───────│
  │                         │                        │
  │                         │── Session.create() ───►│
  │                         │                        │
  │◄── 200 OK ──────────────│                        │
  │    { accessToken,       │                        │
  │      refreshToken,      │                        │
  │      user, license }    │                        │
```

### 3.2 Client Data Request Flow (Proxy)

```
Browser              VPS2 Middleware         VPS2 Route Handler       VPS1 Backend
  │                       │                        │                       │
  │── GET /api/client/    │                        │                       │
  │   positions ─────────►│                        │                       │
  │   Authorization:       │── jwtVerify() ─────── │                       │
  │   Bearer <token>       │   role check           │                       │
  │                        │   licenseId check      │                       │
  │                        │── x-vps-instance-id ──►│                       │
  │                        │   header set           │── proxyToVpsBackend() ►│
  │                        │                        │   decryptAdminToken()  │
  │                        │                        │   fetch() with         │
  │                        │                        │   X-API-Token header   │
  │                        │                        │◄── raw positions ──────│
  │                        │                        │   (includes lot_audit, │
  │                        │                        │    confluence_score)   │
  │                        │                        │── filterPositions()    │
  │                        │                        │   strips sensitive     │
  │                        │                        │   fields               │
  │◄─────────────── 200 OK ─────────────────────────│                       │
  │   filtered positions   │                        │                       │
  │   (no lot sizes, etc.) │                        │                       │
```

### 3.3 Kill-Switch Flow (Automatic)

```
CronWorker (60s)          PostgreSQL              VPS1 Backend
  │                           │                       │
  │── findMany(licenses       │                       │
  │   where status=ACTIVE     │                       │
  │   AND expiresAt <= now) ──►│                       │
  │◄── expired licenses ──────│                       │
  │                           │                       │
  │  for each license:        │                       │
  │  ├─ VPS_INSTALLATION:     │                       │
  │  │   proxyToVpsBackend() ──────────────────────► │
  │  │   POST /api/scalping/stop                      │
  │  │◄──────────────── 200 OK ──────────────────────│
  │  │                        │                       │
  │  ├─ PAMM/SIGNAL:          │                       │
  │  │   Session.updateMany() ►│                       │
  │  │   (revokedAt = now)     │                       │
  │  │                        │                       │
  │  ├─ License.update()      │                       │
  │  │   status = EXPIRED ───►│                       │
  │  │                        │                       │
  │  ├─ KillSwitchEvent.      │                       │
  │  │   create() ───────────►│                       │
  │  │                        │                       │
  │  └─ AuditLog.create() ───►│                       │
```

### 3.4 Health Check Flow

```
HealthCheckWorker (5min)   PostgreSQL             VPS1 Backend
  │                            │                      │
  │── VpsInstance.findMany()──►│                      │
  │◄── all VPS records ────────│                      │
  │                            │                      │
  │  for each VPS instance:    │                      │
  │  ├─ fetch(backendBaseUrl + │                      │
  │  │   /health) ────────────────────────────────── ►│
  │  │◄── { zmqConnected,      │                      │
  │  │      dbOk, lastTickAge, │                      │
  │  │      httpStatus } ─────────────────────────── ◄│
  │  │                         │                      │
  │  ├─ HealthCheck.create() ─►│                      │
  │  │                         │                      │
  │  └─ VpsInstance.update()   │                      │
  │     status, lastHealthCheck►│                      │
```

---

## 4. Proxy Pattern

VPS2 never exposes VPS1 credentials to clients. Requests follow this pattern:

```
Client request
  └── Middleware validates JWT (role + licenseId)
        └── Route handler resolves VPS instance from x-vps-instance-id header
              └── proxyToVpsBackend(vpsInstanceId, path)
                    ├── Load VpsInstance from DB
                    ├── Verify status === 'ONLINE'
                    ├── decryptAdminToken(ciphertext, iv, tag)  [AES-256-GCM]
                    ├── fetch(backendBaseUrl + path, { X-API-Token: plaintext })
                    └── Return Response (15s timeout)
```

The master backend (VPS1 for PAMM/Signal clients) uses `proxyToMasterBackend()` which reads credentials directly from environment variables `VPS1_BACKEND_URL` and `VPS1_ADMIN_TOKEN`.

### Admin Token Encryption at Rest

Each `VpsInstance` record stores three fields:

| Field | Description |
|---|---|
| `adminTokenCiphertext` | AES-256-GCM encrypted token (hex) |
| `adminTokenIv` | 12-byte random IV used during encryption (hex) |
| `adminTokenTag` | 16-byte GCM authentication tag (hex) |

The master key (`LICENSE_MW_MASTER_KEY`) is a 64-character hex string stored only in the environment. It is never written to the database.

---

## 5. Response Filtering

VPS1 returns raw data that includes proprietary intellectual property. VPS2 strips these fields before forwarding to clients.

### Filtering Matrix

| VPS1 Field | Endpoint | Reason Stripped | Client Sees |
|---|---|---|---|
| `strategy_mode.entry_matrix` | `/api/scalping/status` | Proprietary entry logic IP | Omitted |
| `ai_state.last_reasoning` | `/api/scalping/status` | LLM prompt engineering IP | Omitted |
| `ai_state.prompt_tokens` | `/api/scalping/status` | Internal AI metrics | Omitted |
| `ai_state.model_config` | `/api/scalping/status` | Model configuration IP | Omitted |
| `lot_audit` | `/api/positions` | Risk management internals | Omitted |
| `entry_commission_usd` | `/api/positions` | Broker fee breakdown | Omitted |
| `confluence_score` | `/api/positions` | Strategy signal score | Omitted |
| `signal_data` | `/api/positions`, `/api/trades/history` | Raw signal feed | Omitted |
| `commission_usd` | `/api/trades/history` | Commission detail | Omitted |
| `confluence_detail` | `/api/trades/history` | Strategy analytics | Omitted |
| `smc_score`, `wyckoff_score`, etc. | `/api/scanner/status` | Individual strategy scores | Replaced with label |
| `raw_indicators` | `/api/scanner/status` | Technical indicator data | Omitted |

### Strategy Name Obfuscation

The `ScannerHeatmap` component renders strategy names generically for clients:

| Internal Name | Client Label |
|---|---|
| SMC (Smart Money Concepts) | Strategi A |
| Wyckoff | Strategi B |
| QM (Quasimodo) | Strategi C |
| AO (Awesome Oscillator) | Strategi D |

Scores ≥ 70 → `AKTIF`, scores 40–69 → `STANDBY`, scores < 40 → `OFF`.

---

## 6. Security Layers

```
Layer 1: Network
  └── Cloudflare Tunnel — no inbound ports open
        └── DDoS protection, bot filtering, TLS termination

Layer 2: Edge (Next.js Middleware)
  ├── Rate limiting: 10 login/min per IP, 100 API/min per IP
  ├── JWT verification (jose HS256)
  ├── Role-based route protection (ADMIN vs CLIENT)
  └── License scope validation (licenseId or subscriptionId in JWT)

Layer 3: Route Handlers
  ├── Re-validate JWT claims from x-user-* headers
  ├── DB-level license status checks (ACTIVE required)
  └── Admin token decryption per-request (AES-256-GCM)

Layer 4: Response
  ├── Sensitive field stripping (filterPositions, filterTradeHistory, etc.)
  └── Strategy obfuscation (score → label)

Layer 5: Headers (Next.js config)
  ├── X-Frame-Options: DENY
  ├── X-Content-Type-Options: nosniff
  ├── Referrer-Policy: strict-origin-when-cross-origin
  ├── HSTS (Strict-Transport-Security)
  └── Content-Security-Policy
```

---

## 7. Zero Trust Topology

```
                   Internet
                      │
          ┌───────────▼───────────┐
          │  Cloudflare Network   │
          │  - TLS termination    │
          │  - DDoS protection    │
          │  - Access policies    │
          └───────────┬───────────┘
                      │ Encrypted tunnel (QUIC/HTTP2)
                      │ Outbound-only from VPS2
                      ▼
          ┌───────────────────────┐
          │  cloudflared daemon   │
          │  (VPS2, systemd)      │
          └───────────┬───────────┘
                      │ localhost
                      ▼
          ┌───────────────────────┐
          │  Docker container     │
          │  Next.js :3000        │
          │  Bound to 127.0.0.1   │
          └───────────────────────┘
```

Key properties:
- VPS2 firewall has **no inbound rules** for ports 80 or 443
- Port 3000 is bound to `127.0.0.1` only (Docker: `127.0.0.1:3000:3000`)
- All traffic enters via the outbound Cloudflare Tunnel
- VPS1 is accessed via direct HTTP from VPS2's private network; it is not publicly reachable

---

## 8. Cron Workers

Workers are initialized in `src/lib/cron/index.ts` and run inside the Next.js server process.

### Kill-Switch Worker

```
File:     src/lib/cron/kill-switch.ts
Interval: 60 seconds
Trigger:  setInterval
```

**Algorithm:**
1. Query all `License` records where `status = ACTIVE` and `expiresAt <= now`
2. For each expired license:
   - If `VPS_INSTALLATION`: call `POST /api/scalping/stop` via `proxyToVpsBackend`
   - If `PAMM_SUBSCRIBER` or `SIGNAL_SUBSCRIBER`: revoke all active `Session` records for the user
   - Update `License.status = EXPIRED`
   - Expire related `Subscription` records
   - Create `KillSwitchEvent` record
   - Create `AuditLog` entry with `action = kill_switch_auto`

### Health Check Worker

```
File:     src/lib/cron/health-check.ts
Interval: 5 minutes (300 seconds)
```

**Algorithm:**
1. Query all `VpsInstance` records
2. For each instance:
   - `GET {backendBaseUrl}/health` with 10s timeout
   - Extract: `httpStatus`, `responseTimeMs`, `zmqConnected`, `dbOk`, `lastTickAge`
   - Create `HealthCheck` record
   - Update `VpsInstance.lastHealthCheckAt`, `lastHealthStatus`, and `status` (ONLINE/OFFLINE)

### Signal Consumer & Trade-Events Consumer

```
File:     src/lib/consumers/signal.ts       (ENABLE_SIGNAL_CONSUMER)
          src/lib/consumers/trade-events.ts (ENABLE_TRADE_EVENTS_CONSUMER)
Interval: 30s / 20s
```

Drain queues from VPS1 (`/api/signals/latest?since_id=...` and
`/api/trade-events/latest?since_id=...`), advance
`ConsumerState.lastSeenId`, and persist new records for the subscriber
notification pipeline. Feature-flagged.

### Research Ingester

```
File:     src/lib/ingesters/research.ts
Interval: 6 hours + 30s startup kickoff
Flag:     ENABLE_RESEARCH_INGESTER
```

Pulls VPS1's weekly-recap data, uses OpenRouter to expand it into a
Markdown research article (and translate to English), upserts the
`Article` row. The 30s startup kickoff exists because without it every
container restart delayed the first run by a full 6 hours — see
[bugs-and-fixes.md](./bugs-and-fixes.md) entry 2026-04-19.04.

### Pair Brief Worker

```
File:     src/lib/workers/pair-brief.ts
Interval: 4 hours + 45s startup kickoff
Flag:     ENABLE_PAIR_BRIEF_WORKER
```

Generates Pair Intelligence Briefs — see
[pair-brief-system.md](./pair-brief-system.md) for the full pipeline
(6 parallel VPS1 calls → deterministic extractors → 3-layer
anti-hallucination AI → `PairBrief` row → Telegram notification).

The worker uses an in-process `activeRun` promise to prevent duplicate
simultaneous runs and catches `P2002` unique-constraint violations on
`PairBrief.create()` gracefully, in case a concurrent process slips
past the existence check.

### Blog Article Generator

```
File:     src/lib/workers/blog-article-generator.ts
Interval: 12h (configurable via BLOG_GENERATOR_INTERVAL_MS) + 60s startup
Flag:     ENABLE_BLOG_GENERATOR
```

Zero-touch AI-powered article generator. Reads the `BlogTopic` catalog,
picks eligible topics (status PENDING/FAILED, scheduledWeek ≤ currentWeek
relative to `BLOG_LAUNCH_EPOCH_ISO_WEEK`), fetches each topic's data
sources (VPS1 scoped endpoints via `proxyToMasterBackend`, local DB
queries, or inline static values), builds prompt by substituting
`{{DATA_JSON}}` + `{{TARGET_WORDS}}`, calls OpenRouter
`google/gemini-2.5-flash-lite`, validates output (word count, heading
structure, disclaimer presence), upserts an `Article`, then auto-
translates body to English non-blocking.

**Observability:**
- Each run: one `WorkerRun` row (status OK/PARTIAL/ERROR).
- Each AI call: one `AiCallLog` row (input/output tokens, latency).
- Per topic: `BlogTopic.status + lastGeneratedAt + lastError + aiTokensUsed`.

**Admin controls:**
- Seed catalog once: `POST /api/cron/seed-blog-topics`.
- Regenerate single topic: `POST /api/admin/blog-topics/:id/regenerate`
  (synchronous — for manual refresh).
- Force-regenerate via cron: `GET /api/cron/blog-articles?slug=X&force=1`.
- CRUD via `/admin/cms/blog-topics` UI.

**Crypto-ready:** `BlogTopic.assetClass` enum includes CRYPTO. Future
Binance integration adds new topics without worker code changes.

### Subscription Lifecycle

```
File:     src/lib/subscription/lifecycle.ts
Interval: 60 minutes
```

Expires `Subscription` records past their `endDate`, sends renewal
reminders via Brevo email, and archives historical license state.

---

## 8a. AI Integration Layer

All outbound AI requests route through a single factory in
`src/lib/ai/openrouter.ts` targeting OpenRouter's OpenAI-compatible
endpoint. The default model is `google/gemini-2.5-flash-lite`.

```
┌─────────────────────────────────────────────────────────────┐
│  VPS2 Workers & Routes                                      │
│    • pair-brief-generator (narrative)                       │
│    • content.ts translate / enhanceResearchBody             │
│    • /api/chat/route.ts (Babah assistant, streaming)        │
│    • /api/admin/i18n/generate (CMS bulk translate)          │
└──────────────────────────┬──────────────────────────────────┘
                           │ createOpenAI({ baseURL: openrouter })
                           │ X-API-Token = OPENROUTER_API_KEY
                           │ HTTP-Referer: babahalgo.com
                           │ X-Title: BabahAlgo
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  OpenRouter (openrouter.ai/api/v1)                          │
│    Model: google/gemini-2.5-flash-lite ($0.10 / $0.40 per M)│
└─────────────────────────────────────────────────────────────┘
```

No provider fallback exists — if `OPENROUTER_API_KEY` is missing,
AI-dependent features degrade explicitly (e.g. pair briefs fall back
to the template-only text and log a warning). See
[ai-integration.md](./ai-integration.md) for the full rationale and
cost envelope.

---

## 9. Technology Decisions

| Decision | Rationale |
|---|---|
| Next.js App Router | SSR for landing page SEO, RSC for admin pages, client components for real-time charts |
| Prisma ORM | Type-safe DB access, migration management, compatible with PostgreSQL 16 |
| jose (not jsonwebtoken) | Edge-compatible (Web Crypto API), required for Next.js middleware at edge runtime |
| AES-256-GCM for VPS tokens | Authenticated encryption — prevents both tampering and decryption without master key |
| Cloudflare Tunnel | Eliminates need for TLS certificates on VPS, provides DDoS protection, no inbound firewall rules required |
| PostgreSQL on host network | Simplifies Docker networking, avoids container-to-container DNS issues, allows direct `psql` access from host |
| node:20-alpine base image | Minimal attack surface, small image size |
| In-memory rate limiting | Edge-compatible, zero latency, acceptable for single-process Docker deployment |
