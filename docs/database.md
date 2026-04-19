# Database Reference

**BabahAlgo — CV Babah Digital**

ORM: Prisma 5.22 | Database: PostgreSQL 16 | Schema: `public`

---

## Table of Contents

1. [Entity-Relationship Diagram](#1-entity-relationship-diagram)
2. [Enums](#2-enums)
3. [Models](#3-models)
4. [Indexes](#4-indexes)
5. [Relationships Summary](#5-relationships-summary)
6. [Seed Data](#6-seed-data)
7. [Migration Notes](#7-migration-notes)
8. [Prisma Configuration](#8-prisma-configuration)

---

## 1. Entity-Relationship Diagram

```
┌─────────────────────────┐
│         User            │
│─────────────────────────│
│ id (PK, CUID)           │
│ email (UNIQUE)          │
│ passwordHash            │
│ role (Role)             │
│ name?                   │
│ mt5Account? (UNIQUE)    │
│ twoFaSecret?            │
│ createdAt               │
│ lastLoginAt?            │
└────┬──────────┬──────┬──┘
     │          │      │
     │ 1:N      │ 1:N  │ 1:N
     ▼          ▼      ▼
┌─────────┐ ┌────────────┐ ┌─────────────┐
│ License │ │Subscription│ │   Session   │
│─────────│ │────────────│ │─────────────│
│ id (PK) │ │ id (PK)    │ │ id (PK)     │
│ userId  │ │ userId     │ │ userId      │
│licenseKey││ tier       │ │ jwtId (UNIQ)│
│ type    │ │ status     │ │refreshToken │
│vpsInstId│ │ startsAt   │ │  (UNIQUE)   │
│ status  │ │ expiresAt  │ │ ipAddress?  │
│ startsAt│ │profitShare │ │ userAgent?  │
│expiresAt│ │monthlyFee  │ │ createdAt   │
│autoRenew│ │brokerAcct? │ │ expiresAt   │
│metadata │ │ metadata   │ │ revokedAt?  │
│createdAt│ │ createdAt  │ └─────────────┘
│revokedAt│ └────────────┘
└──┬──┬───┘
   │  │
   │  │ N:1 (optional)
   │  ▼
   │ ┌──────────────────────────┐
   │ │       VpsInstance        │
   │ │──────────────────────────│
   │ │ id (PK)                  │
   │ │ name                     │
   │ │ host                     │
   │ │ port                     │
   │ │ backendBaseUrl           │
   │ │ adminTokenCiphertext     │
   │ │ adminTokenIv             │
   │ │ adminTokenTag            │
   │ │ sshHost?                 │
   │ │ sshPort?                 │
   │ │ sshUser?                 │
   │ │ status (VpsStatus)       │
   │ │ lastHealthCheckAt?       │
   │ │ lastHealthStatus?        │
   │ │ notes?                   │
   │ │ createdAt                │
   │ └────────┬─────────────────┘
   │          │ 1:N
   │          ▼
   │  ┌────────────────┐
   │  │  HealthCheck   │
   │  │────────────────│
   │  │ id (PK)        │
   │  │ vpsInstanceId  │
   │  │ checkedAt      │
   │  │ httpStatus?    │
   │  │ responseTimeMs?│
   │  │ zmqConnected?  │
   │  │ dbOk?          │
   │  │ lastTickAge?   │
   │  │ raw?           │
   │  └────────────────┘
   │
   ├── 1:N ──────────────────────────────────────┐
   │                                              ▼
   │                                  ┌───────────────────────┐
   │                                  │    KillSwitchEvent    │
   │                                  │───────────────────────│
   │                                  │ id (PK)               │
   │                                  │ licenseId             │
   │                                  │ triggeredBy           │
   │                                  │ triggeredAt           │
   │                                  │ apiResponse (JSON)    │
   │                                  │ success               │
   │                                  │ errorMessage?         │
   │                                  └───────────────────────┘
   │
   └── 1:N ──────────────────────────────────────┐
                                                  ▼
                                      ┌───────────────────────┐
                                      │       AuditLog        │
                                      │───────────────────────│
                                      │ id (PK)               │
                                      │ userId?               │
                                      │ licenseId?            │
                                      │ action                │
                                      │ ipAddress?            │
                                      │ userAgent?            │
                                      │ metadata (JSON)       │
                                      │ createdAt             │
                                      └───────────────────────┘
```

---

## 2. Enums

### Role

Defines user access level.

| Value | Description |
|---|---|
| `ADMIN` | Platform operator — full access to all admin routes and pages |
| `CLIENT` | License holder — access to portal and client API routes only |

---

### LicenseType

The type of commercial product a license grants access to.

| Value | Business Model | Access |
|---|---|---|
| `VPS_INSTALLATION` | One-time VPS bot installation ($3K–$7.5K) | Proxied VPS backend, filtered positions/status |
| `PAMM_SUBSCRIBER` | Monthly PAMM fund subscription ($49–$149) | Proxied master backend performance data |
| `SIGNAL_SUBSCRIBER` | Monthly signal subscription ($49–$99) | Signal scanner, calendar, trade history |

---

### LicenseStatus

Lifecycle state of a license.

| Value | Description | Effect |
|---|---|---|
| `PENDING` | Created but not yet activated | Cannot login with this license key |
| `ACTIVE` | License is valid and within date range | Full portal access |
| `EXPIRED` | Past `expiresAt` or cron-expired | Access blocked, sessions revoked |
| `REVOKED` | Manually terminated by admin | Access blocked immediately |
| `SUSPENDED` | Temporarily suspended | Access blocked pending review |

---

### VpsStatus

Operational state of a VPS instance.

| Value | Description |
|---|---|
| `PROVISIONING` | Newly registered, not yet verified |
| `ONLINE` | Health check passed; proxy requests allowed |
| `OFFLINE` | Health check failed; proxy returns 503 |
| `SUSPENDED` | Manually suspended by admin |

---

### SubscriptionTier

Granularity within PAMM/Signal subscription products.

| Value | Product | Monthly Fee |
|---|---|---|
| `PAMM_BASIC` | PAMM fund basic tier | $49/month |
| `PAMM_PRO` | PAMM fund professional tier | $149/month |
| `SIGNAL_BASIC` | Signal subscription basic | $49/month |
| `SIGNAL_VIP` | Signal subscription VIP | $99/month |

---

### ArticleCategory

Content categorization for research articles.

| Value | Description |
|---|---|
| `RESEARCH` | General research and analysis |
| `STRATEGY` | Trading strategy deep-dives |
| `EXECUTION` | Execution and infrastructure |
| `RISK` | Risk management topics |
| `OPERATIONS` | Operational procedures |
| `MARKET_ANALYSIS` | Market analysis and commentary |

---

## 3. Models

### User

Primary user identity for both administrators and clients.

```prisma
model User {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  role         Role      @default(CLIENT)
  name         String?
  mt5Account   String?   @unique
  twoFaSecret  String?
  createdAt    DateTime  @default(now())
  lastLoginAt  DateTime?
  licenses      License[]
  subscriptions Subscription[]
  sessions      Session[]
}
```

| Field | Type | Description |
|---|---|---|
| `id` | CUID | Primary key, auto-generated |
| `email` | String (unique) | Login credential for Mode A authentication |
| `passwordHash` | String | bcrypt hash (rounds: 12) |
| `role` | Role | `ADMIN` or `CLIENT` (default: CLIENT) |
| `name` | String? | Display name shown in portal header |
| `mt5Account` | String? (unique) | MetaTrader 5 account number — used in Mode B login |
| `twoFaSecret` | String? | TOTP secret for 2FA (reserved for future use) |
| `createdAt` | DateTime | Account creation timestamp |
| `lastLoginAt` | DateTime? | Updated on each successful login |

---

### License

Commercial license entitlement. Each license links a user to a product and optionally a VPS instance.

```prisma
model License {
  id             String        @id @default(cuid())
  userId         String
  licenseKey     String        @unique
  type           LicenseType
  vpsInstanceId  String?
  status         LicenseStatus @default(PENDING)
  startsAt       DateTime
  expiresAt      DateTime
  autoRenew      Boolean       @default(false)
  metadata       Json          @default("{}")
  createdAt      DateTime      @default(now())
  revokedAt      DateTime?
  killSwitchEvents KillSwitchEvent[]
  auditLogs       AuditLog[]

  @@index([status, expiresAt])
  @@index([userId])
}
```

| Field | Type | Description |
|---|---|---|
| `licenseKey` | String (unique) | Format: `TRAD-XXXX-XXXX-XXXX-XXXX` — used for Mode B login |
| `type` | LicenseType | Product type |
| `vpsInstanceId` | String? | Required for `VPS_INSTALLATION`; null for PAMM/Signal |
| `status` | LicenseStatus | Current lifecycle state |
| `startsAt` | DateTime | License validity start |
| `expiresAt` | DateTime | License validity end — kill-switch triggers when exceeded |
| `autoRenew` | Boolean | Reserved for automated billing integration |
| `metadata` | JSON | Flexible: broker name, account tier, custom notes |
| `revokedAt` | DateTime? | Set when manually revoked |

**Composite Index:** `[status, expiresAt]` — optimizes kill-switch cron query.

---

### VpsInstance

Represents a Python trading bot backend server.

```prisma
model VpsInstance {
  id                   String      @id @default(cuid())
  name                 String
  host                 String
  port                 Int         @default(8000)
  backendBaseUrl       String
  adminTokenCiphertext String
  adminTokenIv         String
  adminTokenTag        String
  sshHost              String?
  sshPort              Int?        @default(1983)
  sshUser              String?
  status               VpsStatus   @default(PROVISIONING)
  lastHealthCheckAt    DateTime?
  lastHealthStatus     String?
  notes                String?
  licenses             License[]
  healthChecks         HealthCheck[]
  createdAt            DateTime    @default(now())
}
```

| Field | Type | Description |
|---|---|---|
| `backendBaseUrl` | String | Full HTTP base URL e.g. `http://147.93.156.218:8000` |
| `adminTokenCiphertext` | String | AES-256-GCM encrypted admin token (hex) |
| `adminTokenIv` | String | 12-byte random IV (hex) — unique per encryption |
| `adminTokenTag` | String | 16-byte GCM auth tag (hex) — detects tampering |
| `sshHost/sshPort/sshUser` | String?/Int?/String? | SSH connection details for admin reference |
| `lastHealthStatus` | String? | Last returned health status string from VPS |

---

### Subscription

PAMM or Signal subscription record, independent of the `License` model.

```prisma
model Subscription {
  id             String           @id @default(cuid())
  userId         String
  tier           SubscriptionTier
  status         LicenseStatus
  startsAt       DateTime
  expiresAt      DateTime
  profitSharePct Decimal?         @db.Decimal(5, 2)
  monthlyFeeUsd  Decimal?         @db.Decimal(10, 2)
  brokerAccountId String?
  metadata       Json             @default("{}")
  createdAt      DateTime         @default(now())

  @@index([userId])
}
```

| Field | Type | Description |
|---|---|---|
| `tier` | SubscriptionTier | Product tier (PAMM_BASIC, PAMM_PRO, etc.) |
| `status` | LicenseStatus | Reuses `LicenseStatus` enum |
| `profitSharePct` | Decimal(5,2)? | Profit share percentage for PAMM (e.g., 20.00) |
| `monthlyFeeUsd` | Decimal(10,2)? | Monthly fee in USD |
| `brokerAccountId` | String? | Managed account ID at the broker |

---

### KillSwitchEvent

Immutable audit record of each kill-switch invocation (automatic or manual).

```prisma
model KillSwitchEvent {
  id           String   @id @default(cuid())
  licenseId    String
  triggeredBy  String
  triggeredAt  DateTime @default(now())
  apiResponse  Json     @default("{}")
  success      Boolean
  errorMessage String?

  @@index([licenseId])
}
```

| Field | Type | Description |
|---|---|---|
| `triggeredBy` | String | `cron_expiry` (automatic) or `admin_manual` |
| `apiResponse` | JSON | Raw response from VPS `/api/scalping/stop` |
| `success` | Boolean | Whether the stop command succeeded |
| `errorMessage` | String? | Error details if `success = false` |

---

### HealthCheck

Time-series health snapshots for each VPS instance. Written every 5 minutes.

```prisma
model HealthCheck {
  id            String      @id @default(cuid())
  vpsInstanceId String
  checkedAt     DateTime    @default(now())
  httpStatus    Int?
  responseTimeMs Int?
  zmqConnected  Boolean?
  dbOk          Boolean?
  lastTickAge   Float?
  raw           Json?

  @@index([vpsInstanceId, checkedAt])
}
```

| Field | Type | Description |
|---|---|---|
| `httpStatus` | Int? | HTTP status code from VPS `/health` endpoint |
| `responseTimeMs` | Int? | Round-trip latency in milliseconds |
| `zmqConnected` | Boolean? | ZeroMQ connection to MT5 bridge |
| `dbOk` | Boolean? | VPS local database operational |
| `lastTickAge` | Float? | Seconds since last market tick received |
| `raw` | JSON? | Complete raw response from VPS health endpoint |

**Composite Index:** `[vpsInstanceId, checkedAt]` — optimizes time-range queries for health history.

---

### AuditLog

Append-only log of significant system actions.

```prisma
model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  licenseId String?
  action    String
  ipAddress String?
  userAgent String?
  metadata  Json     @default("{}")
  createdAt DateTime @default(now())

  @@index([userId, createdAt])
  @@index([licenseId, createdAt])
}
```

**Common action values:**

| Action | Trigger |
|---|---|
| `login` | Successful authentication |
| `login_failed` | Failed authentication attempt |
| `logout` | Session revocation via logout |
| `license_created` | Admin creates new license |
| `license_activated` | License status set to ACTIVE |
| `kill_switch_auto` | Cron-triggered expiry kill-switch |
| `kill_switch_manual` | Admin-triggered kill-switch |
| `vps_registered` | New VPS instance created |

---

### Session

JWT session tracking. Enables token revocation without a blocklist.

```prisma
model Session {
  id           String    @id @default(cuid())
  userId       String
  jwtId        String    @unique
  refreshToken String    @unique
  ipAddress    String?
  userAgent    String?
  createdAt    DateTime  @default(now())
  expiresAt    DateTime
  revokedAt    DateTime?

  @@index([userId])
}
```

| Field | Type | Description |
|---|---|---|
| `jwtId` | String (unique) | Matches `jti` claim in access token |
| `refreshToken` | String (unique) | Hashed refresh token value |
| `revokedAt` | DateTime? | Set on logout or kill-switch; immediately invalidates all tokens |

---

### PageContent (CMS)

CMS-managed page content with bilingual support.

```prisma
model PageContent {
  id         String   @id @default(cuid())
  slug       String   @unique
  title      String
  title_en   String?
  subtitle   String?
  subtitle_en String?
  body       String?  @db.Text
  body_en    String?  @db.Text
  sections   Json     @default("{}")
  isVisible  Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

| Field | Type | Description |
|---|---|---|
| `slug` | String (unique) | URL-friendly identifier (e.g., `platform-overview`) |
| `title` / `title_en` | String | Page title in Indonesian / English |
| `body` / `body_en` | Text? | Markdown page body content (bilingual) |
| `sections` | JSON | Flexible structured content (key-value sections) |
| `isVisible` | Boolean | Toggle page visibility without deleting |

---

### Article (CMS)

Research articles and insights published on the research page.

```prisma
model Article {
  id          String          @id @default(cuid())
  slug        String          @unique
  title       String
  excerpt     String?
  body        String          @db.Text
  category    ArticleCategory
  author      String?
  readTime    String?
  imageUrl    String?
  isPublished Boolean         @default(false)
  publishedAt DateTime?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
}
```

| Field | Type | Description |
|---|---|---|
| `slug` | String (unique) | URL-friendly identifier |
| `category` | ArticleCategory | Content categorization |
| `isPublished` | Boolean | Only published articles appear on public `/api/public/articles` |
| `publishedAt` | DateTime? | Publication date (set manually or on publish toggle) |

---

## 4. Indexes

| Model | Index Fields | Purpose |
|---|---|---|
| `License` | `[status, expiresAt]` | Kill-switch cron: find `ACTIVE` + `expiresAt <= now` |
| `License` | `[userId]` | User license lookup |
| `Subscription` | `[userId]` | User subscription lookup |
| `KillSwitchEvent` | `[licenseId]` | Events per license |
| `HealthCheck` | `[vpsInstanceId, checkedAt]` | Time-series health history queries |
| `AuditLog` | `[userId, createdAt]` | User activity timeline |
| `AuditLog` | `[licenseId, createdAt]` | License activity timeline |
| `Session` | `[userId]` | Active sessions per user |
| `PageContent` | `slug` (unique) | CMS page lookup |
| `Article` | `slug` (unique) | Article lookup by slug |

---

## 5. Relationships Summary

```
User ──────────────────── 1:N ──── License
User ──────────────────── 1:N ──── Subscription
User ──────────────────── 1:N ──── Session

License ────────────────── N:1 ──── VpsInstance (optional)
License ────────────────── 1:N ──── KillSwitchEvent
License ────────────────── 1:N ──── AuditLog (optional)

VpsInstance ──────────── 1:N ──── License
VpsInstance ──────────── 1:N ──── HealthCheck

AuditLog ───── userId? ─ N:1 ──── User (soft reference, no FK)
```

Note: `AuditLog.userId` is stored as a plain string (no FK constraint) so that audit records are preserved even if the user is deleted.

---

## 6. Seed Data

The seed script (`prisma/seed.ts`) creates initial data for development and production bootstrap.

### Admin User

```typescript
{
  email: process.env.ADMIN_EMAIL || 'admin@babahalgo.com',
  passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'changeme123', 12),
  role: 'ADMIN',
  name: 'Abdullah - Babah Digital'
}
```

### Sample VPS Instance

```typescript
{
  name: 'VPS1-Main',
  host: '147.93.156.218',
  port: 8000,
  backendBaseUrl: 'http://147.93.156.218:8000',
  // adminToken encrypted from VPS1_ADMIN_TOKEN env var
  status: 'PROVISIONING'
}
```

### Sample Client and License

```typescript
// Demo client user
{
  email: 'demo@client.com',
  role: 'CLIENT',
  mt5Account: '1234567',
  name: 'Demo Client'
}

// Demo VPS license (30-day trial)
{
  type: 'VPS_INSTALLATION',
  status: 'ACTIVE',
  startsAt: new Date(),
  expiresAt: addDays(new Date(), 30),
  licenseKey: 'TRAD-DEMO-0001-0000-0000'
}
```

---

## 7. Migration Notes

### Initial Migration

File: `prisma/migrations/20260416_init/migration.sql`

The initial migration creates all 11 tables with:
- UUID/CUID primary keys
- All enum types
- Foreign key constraints
- All indexes defined in the schema

### Running Migrations

```bash
# Development — creates migration file and applies it
npx prisma migrate dev --name <description>

# Production — applies pending migrations (no file creation)
npx prisma migrate deploy

# Check migration status
npx prisma migrate status
```

---

## 8. Prisma Configuration

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

The `binaryTargets` includes `linux-musl-openssl-3.0.x` to support the Alpine Linux Docker environment. The `native` target supports local development on macOS and Windows.

### Prisma Client Singleton

`src/lib/db/prisma.ts` exports a singleton Prisma client to prevent connection pool exhaustion in development hot-reload cycles:

```typescript
// Prevents multiple instances during Next.js HMR
declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.prisma ?? new PrismaClient({ log: ['error'] });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}
```
