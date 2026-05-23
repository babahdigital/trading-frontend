# API Reference

Complete endpoint catalog for the BabahAlgo frontend API. All routes live under `src/app/api/`.

## Authentication

All API routes use one of these auth strategies:

| Strategy | Description |
|----------|-------------|
| **Public** | No auth required |
| **JWT (CLIENT)** | Requires valid access_token cookie with CLIENT+ role |
| **JWT (ADMIN+)** | Requires ADMIN, OPERATOR, or SUPER_ADMIN role |
| **CRON_SECRET** | Requires `x-cron-secret` header matching `CRON_SECRET` env var |
| **Webhook** | Signature verification (Xendit: timingSafeEqual, Midtrans: SHA-512) |

---

## Auth Endpoints (`/api/auth/*`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | Public | Email/password login + optional 2FA. Sets HttpOnly cookies (access_token, refresh_token) |
| POST | `/api/auth/register` | Public | Customer self-registration with email verification |
| POST | `/api/auth/refresh` | Public | Rotate access token using refresh cookie |
| POST | `/api/auth/logout` | JWT | Revoke session, clear cookies |
| GET | `/api/auth/me` | Optional JWT | Identity probe -- returns user object or `{user: null}` for guests |
| POST | `/api/auth/forgot-password` | Public | Send password reset email |
| POST | `/api/auth/reset-password` | Public | Reset password with token |
| POST | `/api/auth/verify-email` | Public | Verify email with token |
| POST | `/api/auth/resend-verification` | JWT | Resend verification email |
| POST | `/api/auth/ws-token` | JWT | Issue short-lived WebSocket token |

---

## Public Endpoints (`/api/public/*`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/public/landing` | Landing page sections (CMS-driven) |
| GET | `/api/public/pricing` | Pricing tiers (forex + crypto) |
| GET | `/api/public/articles` | Published research articles (paginated) |
| GET | `/api/public/faq` | FAQ entries by category |
| GET | `/api/public/testimonials` | Customer testimonials |
| GET | `/api/public/banners` | Active banners |
| GET | `/api/public/popups` | Active popups |
| GET | `/api/public/pages` | Static page content by slug |
| GET | `/api/public/pair-briefs` | Published AI pair intelligence briefs |
| GET | `/api/public/capabilities` | Tier capability matrix |
| GET | `/api/public/changelog` | Product changelog |

---

## CMS Public Endpoints (`/api/cms/*`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/cms/pricing/tiers` | Public | Pricing tiers for checkout |
| GET | `/api/cms/promotions/active` | Public | Currently active promotions |

---

## Admin Endpoints (`/api/admin/*`)

All require JWT with ADMIN+ role. RBAC permission checks apply per-endpoint.

### Customer & License Management

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/admin/customers` | `customers.view` | Customer list with filters |
| POST/PATCH | `/api/admin/customers` | `customers.write` | Create/update customer |
| GET | `/api/admin/licenses` | `licenses.view` | License list with status filters |
| POST/PATCH | `/api/admin/licenses` | `licenses.write` | Issue/rotate/revoke licenses |
| GET | `/api/admin/kill-switch` | `kill_switch.view` | Kill-switch events list |
| POST | `/api/admin/kill-switch` | `kill_switch.resolve` | Resolve kill-switch lockout |

### Infrastructure

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/admin/vps` | `vps.view` | VPS fleet list |
| POST | `/api/admin/vps` | `vps.write` | Provision new VPS instance |
| GET | `/api/admin/vps/fleet-status` | `vps.view` | Fleet health overview |
| POST | `/api/admin/vps/[id]/token` | `vps.write` | Rotate VPS admin token |
| POST | `/api/admin/vps/[id]/seed` | `vps.write` | Seed VPS with config |
| PATCH | `/api/admin/vps/[id]/code-version` | `vps.write` | Update VPS code version |
| GET | `/api/admin/audit` | `audit.view` | Audit log viewer (paginated) |
| POST | `/api/admin/audit/verify` | `audit.view` | Verify audit log integrity (SHA-256 chain) |
| GET | `/api/admin/system-info` | `platform.config` | System diagnostics |
| GET/PATCH | `/api/admin/maintenance` | `settings.write` | Maintenance mode toggle |

### CMS Content Management

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET/POST/PATCH/DELETE | `/api/admin/cms/articles` | `cms.*` | Article CRUD + publish |
| GET/POST/PATCH/DELETE | `/api/admin/cms/banners` | `cms.*` | Banner management |
| GET/POST/PATCH/DELETE | `/api/admin/cms/popups` | `cms.*` | Popup management |
| GET/POST/PATCH/DELETE | `/api/admin/cms/faq` | `cms.*` | FAQ management |
| GET/POST/PATCH/DELETE | `/api/admin/cms/testimonials` | `cms.*` | Testimonial management |
| GET/POST/PATCH/DELETE | `/api/admin/cms/landing-sections` | `cms.*` | Landing section CRUD |
| GET/POST/PATCH/DELETE | `/api/admin/cms/pages` | `cms.*` | Static page content |
| GET/POST/PATCH | `/api/admin/cms/pricing` | `cms.*` | Pricing tier management |
| GET/POST/PATCH | `/api/admin/cms/changelog` | `cms.*` | Changelog entries |
| GET/PATCH | `/api/admin/cms/seo` | `cms.*` | SEO metadata per route |
| GET/PATCH | `/api/admin/cms/site-settings` | `settings.write` | Site settings (key-value) |
| GET | `/api/admin/cms/inquiries` | `customers.view` | Sales inquiries list |

### Blog Topics

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET/POST | `/api/admin/blog-topics` | `cms.*` | Blog topic catalog |
| GET/PATCH/DELETE | `/api/admin/blog-topics/[id]` | `cms.*` | Single topic CRUD |
| POST | `/api/admin/blog-topics/[id]/regenerate` | `cms.write` | Regenerate article from topic |

### File Upload

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | `/api/admin/upload` | `cms.write` | Upload image (returns URL) |

---

## Client Portal Endpoints (`/api/client/*`)

All require JWT with CLIENT role + active subscription.

### Trading Data

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/client/signals` | Live forex signals (paginated) |
| GET | `/api/client/signals/[id]` | Signal detail |
| GET | `/api/client/signal-audit` | Signal audit trail with outcomes |
| GET | `/api/client/positions/[id]/close` | Close position request |
| GET | `/api/client/symbols` | Available trading symbols |
| GET | `/api/client/news` | Market news feed |
| GET | `/api/client/bars` | OHLCV bar data for charts |
| GET | `/api/client/scanner` | Market scanner |
| GET | `/api/client/calendar` | Trading calendar |
| GET/PATCH | `/api/client/engines` | Trading engine configuration |
| GET/PATCH | `/api/client/trading-config` | Trading preferences |

### Analytics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/client/analytics/performance` | Equity curve + returns data |
| GET | `/api/client/analytics/pnl` | Profit/loss breakdown |
| GET | `/api/client/analytics/drawdown` | Drawdown analysis |

### Kill Switch

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/client/kill-switch/status` | Current kill-switch status |
| POST | `/api/client/kill-switch/acknowledge` | Acknowledge kill-switch event |
| GET/PATCH | `/api/client/kill-switch/preferences` | Kill-switch notification preferences |

### Notifications

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/client/notifications/outbound` | Notification history |
| POST | `/api/client/notifications/outbound/[id]/read` | Mark notification read |
| POST | `/api/client/notifications/outbound/read-all` | Mark all read |
| GET | `/api/client/notifications/recent` | Recent notifications (bell count) |
| PATCH | `/api/client/notification-lang` | Notification language preference |
| GET/PATCH | `/api/client/telegram/config` | Telegram notification config |

### WhatsApp Integration

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/client/whatsapp/validate` | Validate phone number format |
| POST | `/api/client/whatsapp/verify` | Send OTP to WhatsApp |
| POST | `/api/client/whatsapp/verify/confirm` | Confirm OTP |
| GET/PATCH | `/api/client/whatsapp/config` | WhatsApp notification preferences |

### Account & Billing

| Method | Path | Description |
|--------|------|-------------|
| PATCH | `/api/client/password` | Change password |
| GET | `/api/client/invoices` | Invoice history |
| GET | `/api/client/ai/budget` | AI usage budget status |
| GET | `/api/client/tenant/features` | Tenant feature flags |

### Crypto Notifications

| Method | Path | Description |
|--------|------|-------------|
| GET/PATCH | `/api/client/crypto/notifications` | Crypto notification preferences |
| POST | `/api/client/crypto/notifications/whatsapp/verify` | Crypto WhatsApp verify |
| POST | `/api/client/crypto/notifications/whatsapp/confirm` | Crypto WhatsApp confirm |

---

## Billing Endpoints (`/api/billing/*`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/billing/checkout` | JWT (CLIENT) | Initiate Xendit inline checkout |
| POST | `/api/billing/charge` | JWT (CLIENT) | Direct charge (card token) |
| GET | `/api/billing/preview` | JWT (CLIENT) | Price preview with promo discount |
| GET | `/api/billing/poll-status` | JWT (CLIENT) | Poll payment status |
| GET | `/api/billing/xendit-config` | JWT (CLIENT) | Client-side Xendit public key |
| POST | `/api/billing/webhook/xendit` | Webhook | Xendit payment webhook |
| POST | `/api/billing/webhook/midtrans` | Webhook | Midtrans payment webhook |
| POST | `/api/billing/webhook/stripe` | Webhook | Stripe payment webhook |

---

## Forex Bridge (`/api/forex/*`)

Proxy to VPS1 forex backend. Auth handled per-endpoint via forex cookies.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/forex/auth/login` | Public (self-auth) | Bridge login to forex backend |
| POST | `/api/forex/auth/refresh` | Public (self-auth) | Rotate forex tokens |
| POST | `/api/forex/auth/logout` | JWT | Clear forex backend session |
| GET | `/api/forex/me` | JWT | Fetch forex tenant profile |
| POST | `/api/forex/me/tier-upgrade` | JWT | Request tier upgrade |
| POST | `/api/forex/billing/checkout` | JWT | Forex checkout bridge |

---

## Crypto Bridge (`/api/crypto/*`)

Bridge to crypto backend. All require JWT (CLIENT).

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/crypto/subscription` | Crypto subscription management |
| POST | `/api/crypto/keys/submit` | Submit Binance API keys |
| GET | `/api/crypto/keys/status` | API key connection status |
| POST | `/api/crypto/keys/revoke` | Revoke API keys |
| GET/PATCH | `/api/crypto/risk/profile` | Risk profile settings |
| GET/POST | `/api/crypto/risk/kill-switch` | Crypto kill-switch |
| POST | `/api/crypto/strategy/configure` | Strategy configuration |
| GET | `/api/crypto/trading/status` | Live trading status |
| POST | `/api/crypto/positions/[id]/close` | Close crypto position |
| POST | `/api/crypto/telegram/bind` | Bind Telegram for alerts |
| GET/PATCH | `/api/crypto/telegram/lang` | Telegram language preference |
| GET | `/api/crypto/signals/latest` | Latest crypto signals |
| GET | `/api/crypto/audit` | Crypto operation audit trail |

---

## Chat (`/api/chat/*`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/chat` | Optional JWT | AI chat (streaming, skill-routed: forex/crypto/global) |
| POST | `/api/chat/lead` | Public | Chat lead capture (name + email gate) |
| POST | `/api/chat/email-summary` | Optional JWT | Email chat summary to user |

---

## KYC (`/api/kyc/*`)

All require JWT (CLIENT).

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/kyc/upload` | Upload KYC document (ID card, selfie) |
| POST | `/api/kyc/submit` | Submit KYC application |
| GET | `/api/kyc/status` | Check KYC review status |
| GET | `/api/kyc/document` | Retrieve uploaded document |

---

## Portal (`/api/portal/*`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/portal/billing/tiers` | JWT | Available billing tiers |
| GET | `/api/portal/billing/invoice/[orderId]` | JWT | Download PDF invoice |
| POST | `/api/portal/demo/activate` | JWT | Activate demo subscription |

---

## Cron Endpoints (`/api/cron/*`)

All require `CRON_SECRET` header.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/cron/signals` | Ingest signals from VPS1 |
| POST | `/api/cron/trade-events` | Sync trade open/close events |
| POST | `/api/cron/research` | Ingest research data |
| POST | `/api/cron/pair-briefs` | Generate AI pair briefs |
| POST | `/api/cron/blog-articles` | Generate AI blog articles |
| POST | `/api/cron/daily-research` | Daily research pipeline |
| POST | `/api/cron/cleanup-stale-articles` | Clean up unpublished articles |
| POST | `/api/cron/backfill-seo-meta` | Backfill SEO metadata |
| POST | `/api/cron/refresh-article-images` | Regenerate article images |
| POST | `/api/cron/promo-strategist` | AI promo decision engine |
| POST | `/api/cron/seed-articles` | Seed research articles |
| POST | `/api/cron/seed-blog-topics` | Seed blog topic catalog |
| POST | `/api/cron/seed-pricing-tiers` | Seed pricing tiers |
| POST | `/api/cron/seed-site-settings` | Seed site settings |
| POST | `/api/cron/seed-changelog` | Seed changelog entries |

---

## Other Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | Public | Health check (returns `{status: "ok"}`) |
| POST | `/api/webhook/telegram` | Token | Telegram bot webhook receiver |
| POST | `/api/analytics/track` | Public | Pageview + event tracking |
| POST | `/api/notifications/push/subscribe` | JWT | PWA push subscription |
| GET | `/api/notifications/push/vapid-public` | Public | VAPID public key |
| GET | `/api/license/check` | API key | License validation endpoint |
| GET | `/api/v1/recommend-tier` | Public | Tier recommendation by equity |
| GET | `/api/uploads/promotions/[filename]` | Public | Serve promo images |
| GET | `/api/uploads/invoices/[filename]` | JWT | Serve PDF invoices |

---

## Error Response Format

All API errors follow the envelope pattern from `src/lib/api/error-envelope.ts`:

```json
{
  "code": "unauthorized",
  "error": "Human-readable error message"
}
```

HTTP status codes: `400` (validation), `401` (unauthorized), `403` (forbidden), `404` (not found), `429` (rate limited), `500` (server error), `503` (maintenance).
