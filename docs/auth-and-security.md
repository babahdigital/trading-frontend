# Authentication & Security

## JWT Flow

### Token Architecture

```
Login (POST /api/auth/login)
  |
  v
Server issues two tokens:
  +-- Access Token (15min, HS256)
  |     Payload: { sub, role, jti, licenseId, vpsInstanceId, subscriptionId, scope }
  |
  +-- Refresh Token (7d, HS256)
        Payload: { sub, type: "refresh" }
  |
  v
Both stored as HttpOnly cookies (never localStorage)
  +-- access_token cookie
  +-- refresh_token cookie
```

### Token Lifecycle

```
1. Login -> access_token (15min) + refresh_token (7d)
2. API request -> middleware reads access_token cookie
3. Token expired -> client calls POST /api/auth/refresh
4. Refresh rotates access_token, keeps refresh_token
5. Logout -> revoke session, clear both cookies
```

### Implementation

- Library: `jose` (Edge-compatible JWT)
- Algorithm: HS256
- Secret: `JWT_SECRET` environment variable
- Access token: `src/lib/auth/jwt.ts` -> `signJwt()`
- Refresh token: `src/lib/auth/jwt.ts` -> `signRefreshToken()`
- Verification: `src/lib/auth/jwt.ts` -> `verifyJwt()`

---

## Cookie Security

| Property | Access Token | Refresh Token |
|----------|-------------|---------------|
| HttpOnly | Yes | Yes |
| Secure | Yes (production) | Yes (production) |
| SameSite | Lax | Lax |
| Path | `/` | `/api/auth/refresh` |
| Max-Age | 900 (15min) | 604800 (7d) |

- HttpOnly prevents JavaScript access (XSS mitigation)
- Secure flag enforced in production (Cloudflare TLS termination)
- SameSite Lax prevents CSRF on cross-origin POST
- Refresh token path-scoped to prevent unnecessary transmission

---

## Role Hierarchy

```
SUPER_ADMIN
  |  Bypasses ALL permission checks
  |  Can create ADMIN and OPERATOR accounts
  |  Only 1-2 accounts (founder + co-founder)
  v
ADMIN
  |  Full admin console access by default
  |  Empty permissions array = legacy full-access (back-compat)
  |  Populated permissions array = scoped admin
  v
OPERATOR
  |  ALWAYS scoped -- must have explicit permission grants
  |  Suitable for: support agent, marketing, content editor
  v
CLIENT
     Customer / portal user
     No admin console access
```

### Role Enum

Defined in `prisma/schema.prisma` as `Role` enum and in `src/lib/auth/jwt.ts` as `JwtRole`.

---

## RBAC Permissions System

Implementation: `src/lib/auth/permissions.ts`

### Permission Scopes

| Scope | Actions | Description |
|-------|---------|-------------|
| `dashboard` | `view` | Admin dashboard access |
| `customers` | `view`, `write` | Customer management |
| `licenses` | `view`, `write` | License CRUD |
| `kill_switch` | `view`, `resolve` | Kill-switch operations |
| `vps` | `view`, `write` | VPS fleet management |
| `audit` | `view` | Audit log access |
| `users` | `view`, `write`, `create` | Team management (sensitive) |
| `cms` | `view`, `write`, `publish` | Content management |
| `settings` | `write` | Site settings |
| `platform` | `config` | Platform configuration (high-impact) |

### Authorization Logic

```
hasPermission(role, permissions, required):
  SUPER_ADMIN  -> ALWAYS true
  ADMIN + []   -> true (legacy full-access)
  ADMIN + [...] -> permissions.includes(required)
  OPERATOR     -> permissions.includes(required)
  CLIENT       -> ALWAYS false
```

### Permission Presets

| Preset | Permissions |
|--------|-------------|
| Support Agent | dashboard.view, customers.view, licenses.view, kill_switch.view |
| Ops Operator | Above + customers.write, licenses.write, kill_switch.resolve, vps.view, audit.view |
| Content Editor | dashboard.view, cms.view, cms.write |
| Content Publisher | Above + cms.publish |
| Full Admin | All except users.create, users.write, platform.config |

---

## 2FA (TOTP)

- TOTP-based two-factor authentication
- Recovery codes generated on enable (stored as JSON array)
- Enforced at login -- if `twoFaEnabled`, login requires TOTP code
- User fields: `twoFaSecret`, `twoFaEnabled`, `recoveryCodes`

### Flow

```
1. User enables 2FA in portal
2. Server generates TOTP secret + QR code
3. User scans QR with authenticator app
4. User confirms with TOTP code
5. Server stores secret + generates recovery codes
6. On login: email/password -> 2FA code required -> session issued
```

---

## Email Verification

- Infrastructure ready, currently opt-in (not gating access)
- Token stored as SHA-256 hash (never plaintext)
- Portal shows `VerifyEmailBanner` if not verified
- Phase B gate ready: block checkout + KYC submit without verification

### Flow

```
1. Register -> send verification email with token
2. User clicks link -> POST /api/auth/verify-email
3. Token validated, emailVerifiedAt set
4. Resend available via POST /api/auth/resend-verification
```

---

## Rate Limiting

Edge middleware rate limiting (`src/proxy.ts`), in-memory per-process.

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST `/api/auth/login` | 10 requests | 1 minute |
| POST `/api/chat` | 20 messages | 1 minute |
| POST `/api/chat/lead`, etc. | 6 requests | 1 minute |
| All `/api/*` | 100 requests | 1 minute |

Per IP address. Store resets on process restart. Stale entries cleaned every 5 minutes.

Additional bus-level rate limiting available via `src/lib/api/rate-limit-bus.ts` for route-specific limits.

---

## Webhook Signature Verification

### Xendit

- Method: `timingSafeEqual` comparison
- Header: `x-callback-token`
- Compared against `XENDIT_WEBHOOK_VERIFICATION_TOKEN`
- Timing-safe to prevent timing attacks

### Midtrans

- Method: SHA-512 hash verification
- Input: `order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY`
- Compared against `signature_key` in webhook payload

---

## XSS Protection

- HTML sanitization utilities available for user-generated content
- `escapeHtml` helper for rendering user input
- CMS content stored as-is (admin-trusted) but sanitized on public render
- CSP headers configured in `next.config.js`:
  - `script-src`: self + Xendit + Cal.com + Cloudflare
  - `frame-src`: self + Xendit + Cal.com
  - `img-src`: self + OpenRouter + Pollinations + trusted domains

---

## CSRF Considerations

- SameSite=Lax cookies prevent cross-origin POST with cookies
- API routes rely on cookie auth (SameSite protection)
- State-changing operations require POST/PATCH/DELETE (not GET)
- Xendit webhook verification acts as CSRF token equivalent

---

## Maintenance Mode Security

- Fail-open design: if maintenance check fails, site stays accessible
- Admin routes bypass maintenance gate (operators can toggle off)
- API returns 503 JSON (not HTML redirect)
- Health check endpoint always accessible
- Maintenance state checked via internal API call in middleware

---

## Security Headers

Configured in `next.config.js`:

| Header | Value |
|--------|-------|
| Content-Security-Policy | Strict with allowlist (Xendit, Cal.com, Cloudflare) |
| HSTS | Via Cloudflare (preload) |
| X-Content-Type-Options | nosniff |
| X-Frame-Options | DENY (except embed paths) |
| Referrer-Policy | strict-origin-when-cross-origin |

---

## Audit Trail

- `AuditLog` model with tamper-evident SHA-256 chain
- Verification endpoint: `POST /api/admin/audit/verify`
- Logs: action, userId, licenseId, IP address, user agent, metadata
- Indexed by `[userId, createdAt]` and `[licenseId, createdAt]`

---

## Secrets Management

- All secrets via environment variables (never committed)
- VPS admin tokens encrypted with AES-256 (cipher + IV + tag)
- JWT_SECRET, OPENROUTER_API_KEY, XENDIT keys -- env vars only
- `.env` files in `.gitignore`
- Docker compose uses `env_file` directive
