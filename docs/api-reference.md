# API Reference

**BabahAlgo — CV Babah Digital**

Base URL: `https://babahalgo.com`

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Auth Endpoints](#2-auth-endpoints)
3. [Admin Endpoints](#3-admin-endpoints)
4. [Admin CMS Endpoints](#4-admin-cms-endpoints)
5. [Client Endpoints](#5-client-endpoints)
6. [Public Endpoints](#6-public-endpoints)
7. [Health Endpoint](#7-health-endpoint)
8. [Error Responses](#8-error-responses)
9. [Rate Limits](#9-rate-limits)
10. [JWT Token Structure](#10-jwt-token-structure)

---

## 1. Authentication

All protected endpoints require a valid JWT access token. The token must be provided via:

- **Header:** `Authorization: Bearer <access_token>`
- **Cookie:** `access_token=<token>` (set by login response)

### Role Requirements

| Route Prefix | Required Role | Notes |
|---|---|---|
| `/api/auth/*` | Public (no auth) | Login, refresh, logout |
| `/api/health` | Public | Health check |
| `/api/admin/*` | `ADMIN` | Admin operations |
| `/api/client/*` | `CLIENT` or `ADMIN` | CLIENT must have `licenseId` or `subscriptionId` in JWT |
| `/admin/*` (pages) | `ADMIN` | Redirects to `/login` if unauthorized |
| `/portal/*` (pages) | `CLIENT` or `ADMIN` | Redirects to `/login` if unauthorized |

---

## 2. Auth Endpoints

### POST /api/auth/login

Authenticate a user. Supports two modes:

**Mode A — Admin / Standard Login:**
```json
{
  "email": "admin@babahalgo.com",
  "password": "your_password"
}
```

**Mode B — License Key Login (VPS clients):**
```json
{
  "licenseKey": "TRAD-XXXX-XXXX-XXXX-XXXX",
  "mt5Account": "123456",
  "password": "your_password"
}
```

**Response 200 OK:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "clxxx...",
    "email": "user@example.com",
    "name": "Abdullah",
    "role": "CLIENT"
  },
  "license": {
    "id": "clyyy...",
    "licenseKey": "TRAD-XXXX-XXXX-XXXX-XXXX",
    "type": "VPS_INSTALLATION",
    "status": "ACTIVE",
    "expiresAt": "2027-01-01T00:00:00.000Z"
  }
}
```

| Status | Condition |
|---|---|
| 200 | Credentials valid, session created |
| 400 | Missing required fields |
| 401 | Invalid credentials |
| 403 | License not ACTIVE (for license key login) |
| 429 | Rate limit exceeded (10 attempts/min per IP) |

---

### POST /api/auth/refresh

Rotate access and refresh tokens using a valid refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9..."
}
```

**Response 200 OK:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9..."
}
```

| Status | Condition |
|---|---|
| 200 | Tokens rotated successfully |
| 400 | Missing refresh token |
| 401 | Invalid, expired, or revoked refresh token |

---

### POST /api/auth/logout

Revoke the current session (marks `Session.revokedAt`).

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9..."
}
```

**Response 200 OK:**
```json
{ "message": "Logged out" }
```

| Status | Condition |
|---|---|
| 200 | Session revoked |
| 400 | Missing refresh token |
| 401 | Invalid token |

---

## 3. Admin Endpoints

All admin endpoints require `ADMIN` role.

### GET /api/admin/dashboard

Returns aggregate statistics for the admin overview dashboard.

**Response 200 OK:**
```json
{
  "totalUsers": 47,
  "activeLicenses": 31,
  "expiredLicenses": 8,
  "pendingLicenses": 3,
  "totalRevenue": 142500.00,
  "vpsInstances": [
    {
      "id": "clxxx...",
      "name": "VPS-Main",
      "status": "ONLINE",
      "activeLicenses": 12,
      "lastHealthCheckAt": "2026-04-16T08:00:00.000Z"
    }
  ],
  "recentAuditLogs": [ ... ],
  "killSwitchEvents": 2
}
```

---

### GET /api/admin/licenses

List all licenses with filtering and pagination.

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `status` | `string` | Filter by `LicenseStatus` enum value |
| `type` | `string` | Filter by `LicenseType` enum value |
| `userId` | `string` | Filter by user ID |
| `page` | `number` | Page number (default: 1) |
| `limit` | `number` | Results per page (default: 20, max: 100) |

**Response 200 OK:**
```json
{
  "licenses": [
    {
      "id": "clxxx...",
      "licenseKey": "TRAD-A1B2-C3D4-E5F6-G7H8",
      "type": "VPS_INSTALLATION",
      "status": "ACTIVE",
      "startsAt": "2026-01-01T00:00:00.000Z",
      "expiresAt": "2027-01-01T00:00:00.000Z",
      "autoRenew": false,
      "user": { "id": "...", "email": "client@example.com", "name": "Client Name" },
      "vpsInstance": { "id": "...", "name": "VPS-Main", "status": "ONLINE" }
    }
  ],
  "total": 47,
  "page": 1,
  "limit": 20
}
```

---

### POST /api/admin/licenses

Create a new license.

**Request Body:**
```json
{
  "userId": "clxxx...",
  "type": "VPS_INSTALLATION",
  "vpsInstanceId": "clyyy...",
  "startsAt": "2026-04-16T00:00:00.000Z",
  "expiresAt": "2027-04-16T00:00:00.000Z",
  "autoRenew": false,
  "metadata": {}
}
```

**Response 201 Created:**
```json
{
  "id": "clzzz...",
  "licenseKey": "TRAD-A1B2-C3D4-E5F6-G7H8",
  "type": "VPS_INSTALLATION",
  "status": "PENDING",
  "startsAt": "2026-04-16T00:00:00.000Z",
  "expiresAt": "2027-04-16T00:00:00.000Z"
}
```

**License Key Format:** `TRAD-XXXX-XXXX-XXXX-XXXX` (auto-generated, unique)

| Status | Condition |
|---|---|
| 201 | License created |
| 400 | Missing required fields or invalid date range |
| 404 | User or VPS instance not found |
| 409 | User already has an active license of this type |

---

### GET /api/admin/users

List all users.

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `role` | `string` | Filter by `Role` enum (`ADMIN` or `CLIENT`) |
| `page` | `number` | Page number (default: 1) |
| `limit` | `number` | Results per page (default: 20) |

**Response 200 OK:**
```json
{
  "users": [
    {
      "id": "clxxx...",
      "email": "client@example.com",
      "name": "Client Name",
      "role": "CLIENT",
      "mt5Account": "123456",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "lastLoginAt": "2026-04-15T10:00:00.000Z",
      "_count": { "licenses": 1, "sessions": 2 }
    }
  ],
  "total": 47,
  "page": 1
}
```

---

### POST /api/admin/users

Create a new user account.

**Request Body:**
```json
{
  "email": "newclient@example.com",
  "password": "SecurePassword123",
  "name": "New Client",
  "role": "CLIENT",
  "mt5Account": "789012"
}
```

**Response 201 Created:**
```json
{
  "id": "clxxx...",
  "email": "newclient@example.com",
  "name": "New Client",
  "role": "CLIENT",
  "createdAt": "2026-04-16T00:00:00.000Z"
}
```

| Status | Condition |
|---|---|
| 201 | User created |
| 400 | Missing fields or invalid role |
| 409 | Email already registered |

---

### GET /api/admin/vps

List all VPS instances.

**Response 200 OK:**
```json
{
  "instances": [
    {
      "id": "clxxx...",
      "name": "VPS-Main",
      "host": "147.93.156.218",
      "port": 8000,
      "backendBaseUrl": "http://147.93.156.218:8000",
      "status": "ONLINE",
      "lastHealthCheckAt": "2026-04-16T08:00:00.000Z",
      "lastHealthStatus": "ok",
      "notes": "Primary trading VPS",
      "_count": { "licenses": 12, "healthChecks": 1440 }
    }
  ]
}
```

---

### POST /api/admin/vps

Register a new VPS instance. The admin token is encrypted with AES-256-GCM before storage.

**Request Body:**
```json
{
  "name": "VPS-Secondary",
  "host": "192.168.1.100",
  "port": 8000,
  "backendBaseUrl": "http://192.168.1.100:8000",
  "adminToken": "plain_text_admin_token_here",
  "sshHost": "192.168.1.100",
  "sshPort": 22,
  "sshUser": "ubuntu",
  "notes": "Secondary VPS for overflow clients"
}
```

**Response 201 Created:**
```json
{
  "id": "clxxx...",
  "name": "VPS-Secondary",
  "status": "PROVISIONING",
  "createdAt": "2026-04-16T00:00:00.000Z"
}
```

Note: `adminToken` is never returned in responses. It is encrypted and stored as `adminTokenCiphertext`, `adminTokenIv`, `adminTokenTag`.

---

### GET /api/admin/audit

Retrieve audit log entries with filtering.

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `userId` | `string` | Filter by user ID |
| `licenseId` | `string` | Filter by license ID |
| `action` | `string` | Filter by action string (partial match) |
| `from` | `ISO8601` | Start date |
| `to` | `ISO8601` | End date |
| `page` | `number` | Page number |
| `limit` | `number` | Results per page |

**Response 200 OK:**
```json
{
  "logs": [
    {
      "id": "clxxx...",
      "userId": "clyyy...",
      "licenseId": "clzzz...",
      "action": "kill_switch_auto",
      "ipAddress": "203.0.113.1",
      "userAgent": "license-middleware/1.0",
      "metadata": { "reason": "license_expired", "type": "VPS_INSTALLATION" },
      "createdAt": "2026-04-16T00:00:00.000Z"
    }
  ],
  "total": 234,
  "page": 1
}
```

---

### GET /api/admin/kill-switch

List kill-switch events.

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `licenseId` | `string` | Filter by license ID |
| `success` | `boolean` | Filter by success status |
| `page` | `number` | Page number |

**Response 200 OK:**
```json
{
  "events": [
    {
      "id": "clxxx...",
      "licenseId": "clyyy...",
      "triggeredBy": "cron_expiry",
      "triggeredAt": "2026-04-16T00:00:00.000Z",
      "apiResponse": { "status": "stopped" },
      "success": true,
      "errorMessage": null,
      "license": { "licenseKey": "TRAD-...", "type": "VPS_INSTALLATION" }
    }
  ],
  "total": 14
}
```

---

### POST /api/admin/kill-switch

Manually trigger a kill-switch for a specific license.

**Request Body:**
```json
{
  "licenseId": "clxxx...",
  "reason": "manual_revocation"
}
```

**Response 200 OK:**
```json
{
  "success": true,
  "event": {
    "id": "clyyy...",
    "triggeredBy": "admin_manual",
    "triggeredAt": "2026-04-16T09:00:00.000Z",
    "success": true
  }
}
```

| Status | Condition |
|---|---|
| 200 | Kill-switch triggered |
| 404 | License not found |
| 409 | License already REVOKED or EXPIRED |

---

## 4. Admin CMS Endpoints

All CMS endpoints require `ADMIN` role.

### GET/POST/PUT/DELETE /api/admin/cms/pages

CRUD for CMS `PageContent` model.

**GET** — List all page content entries, ordered by updatedAt desc.

**POST** — Create new page content:
```json
{
  "slug": "platform-overview",
  "title": "Platform Overview",
  "title_en": "Platform Overview",
  "subtitle": "Subtitle text",
  "body": "Markdown body content",
  "body_en": "English markdown body",
  "sections": {},
  "isVisible": true
}
```

**PUT** — Update existing page content (requires `id` in body).

**DELETE** — Delete page content (requires `id` query param).

---

### GET/POST/PUT/DELETE /api/admin/cms/articles

CRUD for `Article` model.

**GET** — List all articles, ordered by publishedAt desc.

**POST** — Create new article:
```json
{
  "slug": "market-structure-analysis",
  "title": "Market Structure Analysis",
  "excerpt": "Short description...",
  "body": "Full markdown content",
  "category": "RESEARCH",
  "author": "BabahAlgo Research",
  "readTime": "5 min read",
  "imageUrl": "/images/article-cover.jpg",
  "isPublished": true
}
```

**PUT** — Update existing article (requires `id` in body).

**DELETE** — Delete article (requires `id` query param).

**ArticleCategory enum values:** `RESEARCH`, `STRATEGY`, `EXECUTION`, `RISK`, `OPERATIONS`, `MARKET_ANALYSIS`

---

## 5. Client Endpoints

All client endpoints require `CLIENT` or `ADMIN` role. CLIENT role additionally requires `licenseId` or `subscriptionId` in the JWT payload. All responses are filtered — sensitive fields are stripped before delivery.

---

### GET /api/client/status

Bot status, open positions summary, and license info. Proxies to `/api/scalping/status` on VPS1.

**Filtered fields removed:** `entry_matrix`, `last_reasoning`, `prompt_tokens`, `model_config`

**Response 200 OK:**
```json
{
  "bot_status": "active",
  "today_pnl": 127.50,
  "open_trades": 3,
  "equity": 15420.00,
  "license_status": "active",
  "license_expiry": "2027-04-16T00:00:00.000Z",
  "wins_today": 5,
  "losses_today": 2,
  "active_pairs": 14,
  "equity_change_pct": 0.83,
  "floating_pnl": 42.30,
  "ai_state_by_pair": {
    "EURUSD": {
      "runtime_status_label": "Memantau pasar",
      "pair": "EURUSD",
      "updated_seconds_ago": 12
    }
  },
  "open_positions": [
    {
      "symbol": "EURUSD",
      "direction": "BUY",
      "pnl_usd": 25.40,
      "duration_seconds": 1800,
      "status": "open"
    }
  ],
  "strategy_mode": {
    "mode": "scalping"
  }
}
```

| Status | Condition |
|---|---|
| 200 | Data returned |
| 503 | VPS is not ONLINE |

---

### GET /api/client/positions

Open positions. Proxies to `/api/positions` on VPS1.

**Filtered fields removed:** `lot_audit`, `entry_commission_usd`, `confluence_score`, `signal_data`

**Response 200 OK:**
```json
[
  {
    "ticket": 12345678,
    "symbol": "EURUSD",
    "direction": "BUY",
    "open_price": 1.0823,
    "current_price": 1.0841,
    "pnl_usd": 18.00,
    "swap": -0.50,
    "duration_seconds": 3600,
    "open_time": "2026-04-16T06:00:00.000Z"
  }
]
```

---

### GET /api/client/equity

Equity history snapshots. Proxies to `/api/equity/history` on VPS1 (pass-through, no filtering).

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `days` | `number` | Number of days of history (default: 30) |

**Response 200 OK:**
```json
{
  "snapshots": [
    {
      "timestamp": "2026-04-01T00:00:00.000Z",
      "equity": 14800.00
    },
    {
      "timestamp": "2026-04-02T00:00:00.000Z",
      "equity": 14950.00
    }
  ]
}
```

---

### GET /api/client/trades

Trade history. Proxies to `/api/trades/history` on VPS1.

**Filtered fields removed:** `signal_data`, `commission_usd`, `confluence_detail`

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `from` | `ISO8601` | Start date |
| `to` | `ISO8601` | End date |
| `symbol` | `string` | Filter by symbol |

**Response 200 OK:**
```json
{
  "trades": [
    {
      "ticket": 12345670,
      "symbol": "GBPUSD",
      "direction": "SELL",
      "open_price": 1.2654,
      "close_price": 1.2621,
      "pnl_usd": 33.00,
      "open_time": "2026-04-15T09:00:00.000Z",
      "close_time": "2026-04-15T11:30:00.000Z",
      "duration_seconds": 9000
    }
  ],
  "summary": {
    "total_trades": 87,
    "win_rate": 62.1,
    "total_pnl": 1240.50,
    "avg_duration_seconds": 5400
  }
}
```

---

### GET /api/client/performance

Performance summary. Proxies to `/api/performance/summary` on VPS1 (pass-through).

**Response 200 OK:**
```json
{
  "period": "30D",
  "total_pnl": 1240.50,
  "win_rate": 62.1,
  "profit_factor": 1.84,
  "sharpe_ratio": 1.42,
  "max_drawdown_pct": 4.2,
  "total_trades": 87,
  "avg_pnl_per_trade": 14.26,
  "best_day_pnl": 210.00,
  "worst_day_pnl": -85.00,
  "by_strategy": [
    { "name": "Strategi A", "trades": 34, "win_rate": 67.6, "pnl": 620.00 }
  ]
}
```

---

### GET /api/client/scanner

Currency pair scanner status. Proxies to `/api/scanner/status` on VPS1.

**Filtered fields removed:** `smc_score`, `wyckoff_score`, `qm_score`, `ao_score`, `confluence_detail`, `raw_indicators`

**Replacement:** Each pair receives a `status_label` field (`AKTIF`, `STANDBY`, or `OFF`) based on `total_score`.

**Response 200 OK:**
```json
{
  "pairs": [
    {
      "pair": "EURUSD",
      "total_score": 0.78,
      "status_label": "AKTIF",
      "session": "london",
      "trend": "bullish"
    },
    {
      "pair": "USDJPY",
      "total_score": 0.45,
      "status_label": "STANDBY",
      "session": "asian",
      "trend": "ranging"
    }
  ],
  "active_session": "london",
  "updated_at": "2026-04-16T09:00:00.000Z"
}
```

---

### GET /api/client/reports

Daily report. Proxies to `/api/report/today` on VPS1 (pass-through).

**Response 200 OK:**
```json
{
  "date": "2026-04-16",
  "today_pnl": 127.50,
  "total_trades": 12,
  "win_rate": 66.7,
  "daily_pnl": [
    { "date": "2026-04-10", "pnl": 95.00 },
    { "date": "2026-04-11", "pnl": -42.00 }
  ],
  "by_symbol": [
    { "symbol": "EURUSD", "pnl": 65.00, "trades": 5 }
  ]
}
```

---

### GET /api/client/calendar

Monthly calendar data. Proxies to `/api/calendar` on VPS1 (pass-through).

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `month` | `number` | Month (1–12) |
| `year` | `number` | Four-digit year |

**Response 200 OK:**
```json
{
  "month": 4,
  "year": 2026,
  "days": [
    {
      "date": "2026-04-01",
      "pnl": 95.00,
      "trades": 8,
      "winRate": 75.0
    }
  ]
}
```

---

## 6. Public Endpoints

Public endpoints require no authentication.

### GET /api/public/performance

Returns equity curve data and KPI metrics for the public performance page. Data is server-side cached for 4 hours.

**Response 200 OK:**
```json
{
  "equity": [
    { "time": "2025-04-01", "value": 10000.00 },
    { "time": "2025-04-02", "value": 10045.23 }
  ],
  "kpi": {
    "totalReturn": "+32.4%",
    "sharpeRatio": "2.14",
    "sortinoRatio": "3.21",
    "profitFactor": "1.87",
    "winRate": "64.2%",
    "maxDrawdown": "-8.7%",
    "avgHoldTime": "4.2h",
    "recoveryFactor": "14.6"
  }
}
```

Note: Currently generates demo data. Will proxy to master backend when available.

---

### GET /api/public/articles

Returns published articles.

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `slug` | `string` | Fetch single article by slug |

**Response 200 OK (list):**
```json
[
  {
    "id": "clxxx...",
    "slug": "market-structure-analysis",
    "title": "Market Structure Analysis",
    "excerpt": "Short description...",
    "category": "RESEARCH",
    "author": "BabahAlgo Research",
    "readTime": "5 min read",
    "imageUrl": "/images/cover.jpg",
    "publishedAt": "2026-04-16T00:00:00.000Z"
  }
]
```

**Response 200 OK (single, with `?slug=`):**
```json
{
  "id": "clxxx...",
  "slug": "market-structure-analysis",
  "title": "Market Structure Analysis",
  "body": "Full markdown content...",
  "category": "RESEARCH",
  "author": "BabahAlgo Research",
  "readTime": "5 min read",
  "publishedAt": "2026-04-16T00:00:00.000Z"
}
```

---

### POST /api/auth/register

Self-serve user registration. Creates a user with PENDING status awaiting admin activation.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123",
  "tier": "SIGNAL_BASIC",
  "brokerName": "ICMarkets",
  "mt5Account": "12345678"
}
```

| Field | Required | Description |
|---|---|---|
| `name` | Yes | Full name |
| `email` | Yes | Email address (unique) |
| `password` | Yes | Min 8 characters |
| `tier` | Yes | `SIGNAL_BASIC`, `SIGNAL_VIP`, `PAMM_BASIC`, or `PAMM_PRO` |
| `brokerName` | PAMM only | Broker name |
| `mt5Account` | PAMM only | MT5 account number |

**Response 201 Created:**
```json
{
  "message": "Registration successful! Your account will be activated by admin."
}
```

| Status | Condition |
|---|---|
| 201 | User registered |
| 400 | Missing required fields |
| 409 | Email already registered |

---

### GET /api/public/pair-briefs

List published Pair Intelligence Briefs, newest first. Response fields
are tier-gated — see [pair-brief-system.md](./pair-brief-system.md) for
the full spec.

**Query parameters:**

| Name | Required | Description |
|---|---|---|
| `pair` | No | Filter by pair symbol, e.g. `BTCUSD` |
| `limit` | No | Max briefs to return (default 20, max 50) |

**Headers (optional):**
- `Authorization: Bearer <token>` — if present and user has an active
  `SIGNAL_BASIC | SIGNAL_VIP | PAMM_BASIC | PAMM_PRO` subscription,
  the response includes the full narrative and trade ideas.

**Response 200 OK (anonymous or non-subscriber):**

```json
{
  "briefs": [
    {
      "id": "cmo5pt0yb001hcqhu8whs9wgr",
      "pair": "BTCUSD",
      "session": "NEW_YORK",
      "date": "2026-04-19",
      "slug": "btcusd-2026-04-19-new-york",
      "supportLevels": [76073.12, 76072.8, 76070.61, 76069.15, 76058.42, 76047.06, 76036.93, 76012.11],
      "resistanceLevels": [76156.07, 76159.58, 76188.43, 76228.61, 76236.19, 76243.23, 76251.61, 76274.71],
      "fundamentalBias": "BULLISH",
      "confluenceScore": "0.80",
      "isPublished": true,
      "publishedAt": "2026-04-19T15:17:54.258Z"
    }
  ],
  "access": "preview",
  "tier": "anonymous"
}
```

**Response 200 OK (active subscriber):**

Adds: `sndZones`, `keyPatterns`, `fakeLiquidity`, `narrative`
(Bahasa Indonesia), `narrative_en` (English), `tradeIdeas`,
`validationStatus`.

```json
{
  "briefs": [ { ...preview fields..., "sndZones": [...], "narrative": "## Ringkasan Eksekutif\n...", ... } ],
  "access": "full",
  "tier": "SIGNAL_BASIC"
}
```

### GET /api/public/pair-briefs/[slug]

Fetch a single published brief by slug
(`{pair}-{date}-{session}`). Same tier-gating rules as the list
endpoint.

**Response 200 OK (subscriber):**
```json
{
  "brief": {
    "id": "cmo5pt0yb001hcqhu8whs9wgr",
    "pair": "BTCUSD",
    "session": "NEW_YORK",
    "date": "2026-04-19",
    "slug": "btcusd-2026-04-19-new-york",
    "supportLevels": [...],
    "resistanceLevels": [...],
    "fundamentalBias": "BULLISH",
    "confluenceScore": "0.80",
    "sndZones": [{ "type": "DEMAND", "low": 76040, "high": 76080, "tf": "M5" }, ...],
    "keyPatterns": [{ "name": "Wyckoff lpsy", "tf": "M5", "description": "..." }, ...],
    "fakeLiquidity": [],
    "narrative": "## Ringkasan Eksekutif\n...",
    "narrative_en": "## Executive Summary\n...",
    "tradeIdeas": [{ "direction": "SELL", "entry": 76100, "sl": 76150, "tp": 75800, "confidence": 0.82, "rationale": "..." }],
    "validationStatus": "PASSED",
    "isPublished": true,
    "publishedAt": "2026-04-19T15:17:54.258Z"
  },
  "access": "full",
  "tier": "SIGNAL_BASIC"
}
```

| Status | Condition |
|---|---|
| 200 | Brief found |
| 404 | No brief with that slug, or brief exists but `isPublished: false` |

---

### GET /api/public/status

Public status page feed — used by the landing-page "system status"
widget and by uptime monitors. Reports database, VPS1 latency, and
every autonomous worker's last run.

**Response 200 OK:**

```json
{
  "overall": "operational",
  "components": [
    { "name": "Portal BabahAlgo", "status": "operational", "description": "Website publik, portal klien, dan CMS admin" },
    { "name": "Database", "status": "operational", "description": "PostgreSQL terkoneksi" },
    { "name": "Mesin Trading", "status": "operational", "description": "Latensi 67ms" },
    { "name": "Sinyal Trading", "status": "operational", "description": "Jalan terakhir baru saja — 0 item" },
    { "name": "Event Trading", "status": "operational", "description": "Jalan terakhir baru saja — 0 item" },
    { "name": "Pengimpor Riset", "status": "operational", "description": "Jalan terakhir 3m lalu — 0 item" }
  ],
  "workers": [
    { "scope": "signals", "lastRunAt": "...", "lastStatus": "ok", "lastError": null, "runCount": 2286, "lastSeenId": "0" },
    { "scope": "pair_brief", "lastRunAt": "...", "lastStatus": "SKIPPED", "lastError": null, "runCount": 15, "lastSeenId": "0" }
  ],
  "recentHealthChecks": [],
  "timestamp": "2026-04-19T16:14:44.926Z"
}
```

`overall` is `operational` if every component is operational,
`degraded` if any component is degraded, `outage` if any is down.
A worker is `degraded` if it has never run, if its last run was an
ERROR, or if its last run is older than a per-worker staleness
threshold (10m for signal/trade-event consumers, 7h for the 6-hour
research ingester).

**Note on labels.** `status` values (`operational` / `degraded` /
`outage`) are the stable API contract and stay in English. The
`name` and `description` strings are human-readable Indonesian —
clients rendering the feed should use `status` for logic and
`name` + `description` for display, not parse the text. The
latest-run-per-worker query uses one `findFirst` per scope rather
than a windowed `findMany` so a low-frequency worker cannot be
"hidden" by a high-frequency one (see bug 2026-04-19.10).

---

### POST /api/cron/pair-briefs

Manual trigger for the Pair Brief worker. Not public — requires the
`x-cron-secret` header to match `CRON_SECRET`. The same endpoint is
called internally by the 45-second post-startup kickoff and by the
4-hour `setInterval`.

**Headers:**
- `x-cron-secret: <CRON_SECRET>` — required.

Also supports `?secret=<CRON_SECRET>` query param for shells that
can't easily set headers.

**Response 200 OK:**
```json
{ "status": "ok", "briefsGenerated": 1, "briefsSkipped": 0, "errors": [], "durationMs": 15342 }
```

`status`: `ok` | `skipped` | `error`. `skipped` means every
configured pair already had a brief for today's session (the
existence check short-circuits before any AI call — no cost
incurred).

Companion cron endpoints (same auth pattern):

- `POST /api/cron/signals` — drain VPS1 signal queue, persist
  new signals.
- `POST /api/cron/trade-events` — drain VPS1 trade-event queue
  (copy-trade open/close notifications).
- `POST /api/cron/research` — regenerate the weekly research recap
  article from VPS1's weekly-recap data.

---

## 7. Health Endpoint

### GET /api/health

Public endpoint for Docker health checks and uptime monitoring.

**Response 200 OK:**
```json
{
  "status": "ok",
  "timestamp": "2026-04-16T09:00:00.000Z",
  "version": "1.0.0"
}
```

---

## 8. Error Responses

All error responses use the following structure:

```json
{
  "error": "Human-readable error message"
}
```

### Standard Status Codes

| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request — missing or invalid fields |
| 401 | Unauthorized — missing, invalid, or expired JWT |
| 403 | Forbidden — insufficient role or no active license |
| 404 | Not Found |
| 409 | Conflict — duplicate resource |
| 429 | Too Many Requests — rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable — VPS backend offline |

---

## 9. Rate Limits

Rate limiting is enforced by the Next.js Edge Middleware (`src/middleware.ts`) using an in-memory store (resets on server restart).

| Scope | Limit | Window | Key |
|---|---|---|---|
| Login attempts | 10 requests | 60 seconds | `login:{ip}` |
| All API routes | 100 requests | 60 seconds | `global:{ip}` |

**Response when rate limited (429):**
```json
{
  "error": "Too many login attempts. Try again later."
}
```
or
```json
{
  "error": "Rate limit exceeded"
}
```

---

## 10. JWT Token Structure

### Access Token

Algorithm: `HS256`
Expiry: 15 minutes (short-lived)

**Payload:**
```json
{
  "sub": "clxxx...",
  "role": "CLIENT",
  "licenseId": "clyyy...",
  "vpsInstanceId": "clzzz...",
  "subscriptionId": null,
  "jti": "uuid-v4",
  "iat": 1713258000,
  "exp": 1713258900
}
```

| Claim | Description |
|---|---|
| `sub` | User ID (CUID) |
| `role` | `ADMIN` or `CLIENT` |
| `licenseId` | License ID (CLIENT with VPS or PAMM/Signal) |
| `vpsInstanceId` | VPS instance ID (VPS_INSTALLATION only) |
| `subscriptionId` | Subscription ID (PAMM/Signal only) |
| `jti` | JWT ID — links to `Session.jwtId` for revocation |

### Refresh Token

Algorithm: `HS256`
Expiry: 7 days

**Payload:**
```json
{
  "sub": "clxxx...",
  "sessionId": "clyyy...",
  "iat": 1713258000,
  "exp": 1713862800
}
```

Refresh tokens are stored in `Session.refreshToken` and are invalidated when `Session.revokedAt` is set.

### Token Delivery

On successful login, tokens are returned both:
- In the JSON response body (for SPA `localStorage` storage)
- As `HttpOnly` cookies (`access_token`, `refresh_token`) for SSR/middleware access
