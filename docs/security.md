# Security Architecture

**Trading API Frontend — CV Babah Digital**

---

## Table of Contents

1. [Security Overview](#1-security-overview)
2. [Authentication Flow](#2-authentication-flow)
3. [JWT Structure and Lifecycle](#3-jwt-structure-and-lifecycle)
4. [Session Management](#4-session-management)
5. [Rate Limiting](#5-rate-limiting)
6. [Role-Based Access Control](#6-role-based-access-control)
7. [VPS Token Encryption](#7-vps-token-encryption)
8. [Response Filtering Matrix](#8-response-filtering-matrix)
9. [Kill-Switch Mechanism](#9-kill-switch-mechanism)
10. [Security Headers](#10-security-headers)
11. [Network Security (Zero Trust)](#11-network-security-zero-trust)
12. [Threat Model](#12-threat-model)

---

## 1. Security Overview

The platform implements defense in depth across five distinct layers:

```
┌─────────────────────────────────────────────────────────┐
│  Layer 5: Network                                       │
│  Cloudflare Tunnel — no exposed ports, TLS termination  │
│  DDoS mitigation, bot detection                         │
├─────────────────────────────────────────────────────────┤
│  Layer 4: Edge Middleware (Next.js)                     │
│  Rate limiting, JWT verification, role enforcement      │
│  License scope validation                               │
├─────────────────────────────────────────────────────────┤
│  Layer 3: Route Handlers                                │
│  Re-validation, DB-level license status check           │
│  AES-256-GCM token decryption per-request               │
├─────────────────────────────────────────────────────────┤
│  Layer 2: Response Filtering                            │
│  Strip proprietary fields before delivery to client     │
│  Strategy name obfuscation                              │
├─────────────────────────────────────────────────────────┤
│  Layer 1: Data                                          │
│  Passwords hashed with bcrypt (cost 12)                 │
│  VPS admin tokens encrypted at rest (AES-256-GCM)       │
│  PostgreSQL access controlled by user/password          │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Authentication Flow

### Mode A: Email + Password (Admin and Standard Clients)

```
Client                       VPS2 API                    PostgreSQL
  │                              │                             │
  │─── POST /api/auth/login ────►│                             │
  │    { email, password }       │                             │
  │                              │── Rate limit check ─────── │
  │                              │   (10 req/min per IP)       │
  │                              │                             │
  │                              │── User.findUnique          │
  │                              │   WHERE email = $1 ────────►│
  │                              │◄── { id, passwordHash,      │
  │                              │      role, ... } ──────────│
  │                              │                             │
  │                              │── bcrypt.compare(           │
  │                              │   password, passwordHash)   │
  │                              │   [async, cost 12]          │
  │                              │                             │
  │                              │── License.findFirst         │
  │                              │   WHERE userId = $1 ───────►│
  │                              │   AND status = ACTIVE       │
  │                              │◄── License record ─────────│
  │                              │                             │
  │                              │── Session.create() ────────►│
  │                              │   { jwtId, refreshToken,    │
  │                              │     ipAddress, userAgent }  │
  │                              │                             │
  │                              │── AuditLog.create()         │
  │                              │   action: 'login' ─────────►│
  │                              │                             │
  │◄── 200 { accessToken,        │                             │
  │          refreshToken,       │                             │
  │          user, license } ────│                             │
```

### Mode B: License Key + MT5 Account + Password

Used by VPS installation clients who may not know their email but have their license key.

```
Client                       VPS2 API                    PostgreSQL
  │                              │                             │
  │─── POST /api/auth/login ────►│                             │
  │    { licenseKey,             │                             │
  │      mt5Account,             │                             │
  │      password }              │                             │
  │                              │── License.findUnique        │
  │                              │   WHERE licenseKey = $1 ───►│
  │                              │   include: { user,          │
  │                              │             vpsInstance }   │
  │                              │◄── License + User ─────────│
  │                              │                             │
  │                              │── Verify:                   │
  │                              │   user.mt5Account === $2    │
  │                              │   license.status === ACTIVE │
  │                              │                             │
  │                              │── bcrypt.compare(           │
  │                              │   password, user.hash)      │
  │                              │                             │
  │                              │── Session.create() ────────►│
  │                              │                             │
  │◄── 200 { accessToken,        │                             │
  │          refreshToken,       │                             │
  │          user, license } ────│                             │
```

### Token Refresh Flow

```
Client                       VPS2 API                    PostgreSQL
  │                              │                             │
  │─── POST /api/auth/refresh ──►│                             │
  │    { refreshToken }          │                             │
  │                              │── jose.jwtVerify(token)     │
  │                              │                             │
  │                              │── Session.findUnique        │
  │                              │   WHERE refreshToken = $1 ─►│
  │                              │   AND revokedAt IS NULL     │
  │                              │◄── Session record ─────────│
  │                              │                             │
  │                              │── Verify: session.expiresAt │
  │                              │   > now                     │
  │                              │                             │
  │                              │── Generate new token pair   │
  │                              │── Session.update()          │
  │                              │   (rotate refresh token) ──►│
  │                              │                             │
  │◄── 200 { accessToken,        │                             │
  │          refreshToken } ─────│                             │
```

---

## 3. JWT Structure and Lifecycle

### Access Token

| Property | Value |
|---|---|
| Algorithm | HS256 |
| Signing Key | `JWT_SECRET` (256-bit random key) |
| Expiry | 15 minutes |
| Storage | `localStorage` (SPA) + `HttpOnly` cookie (SSR) |

**Payload fields:**

```typescript
{
  sub: string,           // User ID (CUID)
  role: "ADMIN" | "CLIENT",
  licenseId?: string,    // Present for CLIENT with active license
  vpsInstanceId?: string,// Present for VPS_INSTALLATION clients
  subscriptionId?: string,// Present for PAMM/SIGNAL clients
  jti: string,           // UUID v4 — links to Session.jwtId
  iat: number,           // Issued at (Unix timestamp)
  exp: number            // Expiry (Unix timestamp)
}
```

### Refresh Token

| Property | Value |
|---|---|
| Algorithm | HS256 |
| Expiry | 7 days |
| Storage | `HttpOnly` cookie only |
| Rotation | Rotated on every use (sliding window) |

**Payload fields:**

```typescript
{
  sub: string,       // User ID
  sessionId: string, // Links to Session record
  iat: number,
  exp: number
}
```

### Token Revocation

Tokens cannot be blacklisted (stateless JWT). Instead, revocation is enforced by:

1. **Session-based invalidation:** Each JWT carries a `jti` claim linked to a `Session` record. When `Session.revokedAt` is set, the route handler rejects the token even if it is not expired.
2. **Kill-switch:** Sets `Session.revokedAt` for all sessions belonging to the affected user.
3. **Logout:** Sets `Session.revokedAt` via `POST /api/auth/logout`.

> Note: The edge middleware does not check `Session.revokedAt` for performance — that check occurs in route handlers for sensitive operations.

---

## 4. Session Management

Sessions are stored in the `Session` PostgreSQL table:

```sql
SELECT id, jwtId, ipAddress, createdAt, expiresAt, revokedAt
FROM "Session"
WHERE "userId" = 'clxxx...'
ORDER BY "createdAt" DESC;
```

### Session Cleanup Policy

Expired or revoked sessions accumulate over time. Recommended maintenance:

```sql
-- Run monthly or via scheduled job
DELETE FROM "Session"
WHERE "expiresAt" < NOW() - INTERVAL '30 days'
   OR "revokedAt" < NOW() - INTERVAL '30 days';
```

### Concurrent Sessions

Multiple concurrent sessions per user are allowed by default (each login creates a new `Session` row). This supports users on multiple devices. Kill-switch revokes **all** sessions for a user simultaneously.

---

## 5. Rate Limiting

Implemented in `src/middleware.ts` using an in-memory `Map` (per-process).

### Configuration

| Scope | Limit | Window | Store Key |
|---|---|---|---|
| Login endpoint | 10 requests | 60 seconds | `login:{clientIP}` |
| All `/api/*` routes | 100 requests | 60 seconds | `global:{clientIP}` |

### IP Detection

```typescript
const clientIp =
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  || request.headers.get('x-real-ip')
  || 'unknown';
```

Cloudflare forwards the real client IP in `X-Forwarded-For`. When multiple IPs are present (proxy chain), only the leftmost IP is used.

### Store Cleanup

A `setInterval` runs every 5 minutes to delete stale entries where `resetAt < Date.now()`, preventing unbounded memory growth.

### Limitations

- Rate limit state is in-memory and **resets on container restart**
- Not shared between multiple container instances (single-container deployment assumed)
- For multi-node deployments, replace with Redis-backed rate limiting

---

## 6. Role-Based Access Control

### Route Protection Matrix

| Route Pattern | No Token | CLIENT Token | ADMIN Token |
|---|---|---|---|
| `GET /` | Allow | Allow | Allow |
| `POST /api/auth/login` | Allow | Allow | Allow |
| `GET /api/health` | Allow | Allow | Allow |
| `GET /api/client/*` | 401 | Allow (with licenseId) | Allow |
| `GET /api/admin/*` | 401 | 403 | Allow |
| `GET /portal/*` | Redirect /login | Allow | Allow |
| `GET /admin/*` | Redirect /login | Redirect /login | Allow |

### CLIENT Scope Enforcement

For CLIENT role, the middleware additionally verifies that the JWT contains a `licenseId` **or** `subscriptionId`. A user whose license has been revoked or expired will have their sessions revoked — new tokens will not contain these claims:

```typescript
if (payload.role === 'CLIENT') {
  if (!payload.licenseId && !payload.subscriptionId) {
    return NextResponse.json({ error: 'No active license or subscription' }, { status: 403 });
  }
}
```

### Downstream Header Propagation

After JWT verification, the middleware forwards verified claims as request headers to route handlers:

```
x-user-id:          <sub from JWT>
x-user-role:        <role from JWT>
x-license-id:       <licenseId if present>
x-vps-instance-id:  <vpsInstanceId if present>
x-subscription-id:  <subscriptionId if present>
```

Route handlers read these headers instead of re-verifying the JWT, reducing latency.

---

## 7. VPS Token Encryption

VPS admin tokens are credentials that grant full control of the Python trading bot. They must never be stored in plaintext.

### Encryption Scheme

**Algorithm:** AES-256-GCM (Authenticated Encryption with Associated Data)

**Key derivation:** Master key read from `LICENSE_MW_MASTER_KEY` environment variable (64 hex chars = 256-bit key)

**Storage:** Three separate database fields per `VpsInstance`:

| Field | Content |
|---|---|
| `adminTokenCiphertext` | Encrypted token bytes (hex) |
| `adminTokenIv` | 12-byte random IV generated fresh per encryption (hex) |
| `adminTokenTag` | 16-byte GCM authentication tag (hex) |

### Encryption Process (`encryptAdminToken`)

```typescript
const iv = randomBytes(12);                          // Fresh 12-byte IV per encryption
const cipher = createCipheriv('aes-256-gcm', key, iv);
let encrypted = cipher.update(plaintext, 'utf8', 'hex');
encrypted += cipher.final('hex');
const tag = cipher.getAuthTag();                     // 16-byte auth tag
```

### Decryption Process (`decryptAdminToken`)

```typescript
const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
decipher.setAuthTag(Buffer.from(tag, 'hex'));        // Verifies integrity before decryption
let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
decrypted += decipher.final('utf8');
```

GCM mode verifies the authentication tag during decryption. If the ciphertext or tag has been tampered with, decryption throws an error — preventing use of corrupted or modified tokens.

### Security Properties

| Property | Guarantee |
|---|---|
| Confidentiality | Token cannot be read without `LICENSE_MW_MASTER_KEY` |
| Integrity | GCM auth tag detects any modification to the ciphertext |
| IV uniqueness | Each encryption uses a fresh random IV; no IV reuse |
| Key separation | Master key never stored in DB; only in environment |

---

## 8. Response Filtering Matrix

Clients receive filtered versions of VPS1 backend responses. The following table documents what each role sees.

### `/api/scalping/status` → `/api/client/status`

| Field | VPS1 Returns | ADMIN Sees | CLIENT Sees | Reason |
|---|---|---|---|---|
| `bot_status` | Yes | Yes | Yes | — |
| `today_pnl` | Yes | Yes | Yes | — |
| `open_trades` | Yes | Yes | Yes | — |
| `equity` | Yes | Yes | Yes | — |
| `strategy_mode.entry_matrix` | Yes | Yes | **No** | Proprietary entry logic IP |
| `ai_state.last_reasoning` | Yes | Yes | **No** | LLM prompt engineering IP |
| `ai_state.prompt_tokens` | Yes | Yes | **No** | AI model internals |
| `ai_state.model_config` | Yes | Yes | **No** | AI model configuration |
| `open_positions` | Yes | Yes | Yes | — |

### `/api/positions` → `/api/client/positions`

| Field | VPS1 Returns | ADMIN Sees | CLIENT Sees | Reason |
|---|---|---|---|---|
| `ticket`, `symbol`, `direction` | Yes | Yes | Yes | — |
| `pnl_usd`, `open_price` | Yes | Yes | Yes | — |
| `lot_audit` | Yes | Yes | **No** | Risk management internals |
| `entry_commission_usd` | Yes | Yes | **No** | Broker fee breakdown |
| `confluence_score` | Yes | Yes | **No** | Strategy signal score |
| `signal_data` | Yes | Yes | **No** | Raw signal feed data |

### `/api/trades/history` → `/api/client/trades`

| Field | VPS1 Returns | ADMIN Sees | CLIENT Sees | Reason |
|---|---|---|---|---|
| `ticket`, `symbol`, `pnl_usd` | Yes | Yes | Yes | — |
| `open_time`, `close_time` | Yes | Yes | Yes | — |
| `signal_data` | Yes | Yes | **No** | Raw signal feed |
| `commission_usd` | Yes | Yes | **No** | Commission detail |
| `confluence_detail` | Yes | Yes | **No** | Strategy confluence analysis |

### `/api/scanner/status` → `/api/client/scanner`

| Field | VPS1 Returns | ADMIN Sees | CLIENT Sees | Reason |
|---|---|---|---|---|
| `pairs[].pair` | Yes | Yes | Yes | — |
| `pairs[].total_score` | Yes | Yes | Yes | — |
| `pairs[].smc_score` | Yes | Yes | **No** | Individual strategy score |
| `pairs[].wyckoff_score` | Yes | Yes | **No** | Individual strategy score |
| `pairs[].qm_score` | Yes | Yes | **No** | Individual strategy score |
| `pairs[].ao_score` | Yes | Yes | **No** | Individual strategy score |
| `pairs[].confluence_detail` | Yes | Yes | **No** | Score breakdown |
| `pairs[].raw_indicators` | Yes | Yes | **No** | Raw technical data |
| `pairs[].status_label` | No | Derived | **Yes** | Simplified AKTIF/STANDBY/OFF |

> Note: `ADMIN` role accessing `/api/client/*` routes receives the same filtered response as CLIENT. The raw unfiltered data is only accessible to administrators who have direct VPS access.

---

## 9. Kill-Switch Mechanism

The kill-switch is the primary enforcement mechanism for license expiry and manual revocation.

### Automatic Kill-Switch (Cron, every 60 seconds)

```
Trigger: License.expiresAt <= now AND License.status = 'ACTIVE'

Action sequence:
  1. Identify all expired active licenses
  2. For VPS_INSTALLATION:
     └── POST {vpsBackendUrl}/api/scalping/stop (via proxyToVpsBackend)
         Uses decrypted admin token for authentication
         Records API response in KillSwitchEvent
  3. For PAMM_SUBSCRIBER / SIGNAL_SUBSCRIBER:
     └── Session.updateMany({ revokedAt: now })
         Invalidates all active sessions for the user
  4. License.update({ status: 'EXPIRED' })
  5. Subscription.updateMany({ status: 'EXPIRED', expiresAt <= now })
  6. KillSwitchEvent.create({ triggeredBy: 'cron_expiry', success, apiResponse })
  7. AuditLog.create({ action: 'kill_switch_auto' })
```

### Manual Kill-Switch (Admin API)

```
Trigger: POST /api/admin/kill-switch { licenseId, reason }

Action sequence:
  1. Verify license exists and is in a terminable state
  2. Same steps 2–7 as automatic kill-switch
  3. KillSwitchEvent.create({ triggeredBy: 'admin_manual' })
  4. License.update({ status: 'REVOKED', revokedAt: now })
```

### Kill-Switch Failure Handling

If the VPS backend is unreachable (VPS offline, timeout):

- `KillSwitchEvent.success = false` and `errorMessage` is populated
- The license status is still updated to `EXPIRED` or `REVOKED`
- The VPS bot continues running until the next health-check resolves connectivity and the kill-switch is retried, **or** the VPS admin manually stops it

This prevents "ghost licenses" where the DB says expired but the bot is still running. The cron will retry on the next 60-second tick while the license remains active in the VPS's own authentication layer.

---

## 10. Security Headers

Configured in `next.config.js` via `headers()`:

| Header | Value | Purpose |
|---|---|---|
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls referrer leakage |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | HSTS — forces HTTPS for 2 years |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline'; ...` | XSS mitigation |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables sensitive browser APIs |

---

## 11. Network Security (Zero Trust)

### Architecture Principle

VPS2 operates with **no inbound firewall rules** for HTTP/HTTPS traffic. All client connections enter via the Cloudflare Tunnel, which establishes an outbound connection from VPS2 to Cloudflare's network.

```
Internet ──► Cloudflare Edge (TLS terminated) ──► Tunnel ──► cloudflared (VPS2) ──► localhost:3000
```

### What This Protects Against

| Threat | Protection |
|---|---|
| Direct IP scanning of VPS2 | No ports 80/443 open; only port 1983 (SSH) |
| DDoS against Next.js | Cloudflare absorbs and mitigates |
| SSL/TLS certificate management | Handled entirely by Cloudflare |
| Brute force on web UI | Rate limiting in middleware + Cloudflare Bot protection |

### Cloudflare Access (Optional)

For additional protection, Cloudflare Access can be configured to require authentication before reaching the application. `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` environment variables support service-to-service authentication with Access.

---

## 12. Threat Model

### Assets

| Asset | Sensitivity | Protection |
|---|---|---|
| VPS admin tokens | Critical | AES-256-GCM encrypted at rest |
| JWT secrets | Critical | Environment variable only; never in DB |
| User passwords | High | bcrypt (cost 12); hash stored |
| Client PII | Medium | No sensitive financial data stored in VPS2 DB |
| Trading strategy data | High | Filtered before client delivery |

### Threats and Mitigations

| Threat | Likelihood | Mitigation |
|---|---|---|
| Credential stuffing on login | Medium | Rate limit (10/min), bcrypt slows brute force |
| JWT theft (MITM) | Low | HTTPS-only via Cloudflare; short-lived tokens (15min) |
| Expired license accessing bot | Low | Kill-switch cron every 60s; session revocation |
| VPS token database leak | Low | AES-256-GCM — useless without `LICENSE_MW_MASTER_KEY` |
| Strategy IP leakage | Low | Response filtering strips all sensitive fields |
| XSS reading localStorage tokens | Low | CSP headers; `HttpOnly` cookie for refresh token |
| SQL injection | Very Low | Prisma ORM with parameterized queries |
| Admin impersonation | Very Low | Role claim in JWT verified at middleware; route handlers re-check |

### Out of Scope

- VPS1 (Python bot) security — managed separately
- MT5 broker account security — client responsibility
- Physical VPS security — hosting provider responsibility
