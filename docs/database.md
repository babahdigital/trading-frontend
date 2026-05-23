# Database Schema Reference

PostgreSQL 16 via Prisma 5. Schema at `prisma/schema.prisma` (~1300 lines, 42+ models).

Database: `trading_commercial`, user: `trading_user`, hosted natively on VPS3 (not Docker).

---

## Auth & Users

### User

Core identity model. Links to all subscription, license, and session data.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | Primary key |
| email | String | Unique, login identifier |
| passwordHash | String | bcrypt hash |
| role | Role enum | SUPER_ADMIN, ADMIN, OPERATOR, CLIENT |
| permissions | Json | RBAC scopes array (e.g. `["customers.view"]`) |
| isActive | Boolean | Soft-disable for operators/admins |
| forexTenantId | String? | Forex backend tenant link |
| forexApiToken | String? | Machine-to-machine bridge token (never exposed to browser) |
| twoFaEnabled | Boolean | TOTP 2FA status |
| locale | String | Persistent locale preference (default `id`) |
| emailVerifiedAt | DateTime? | Email verification timestamp |

**Relations**: Session[], License[], Subscription[], CryptoBotSubscription?, UserKyc?, PushSubscription[], EmailVerificationToken[]

### Session

JWT session with refresh token rotation.

| Field | Type | Notes |
|-------|------|-------|
| jwtId | String | Unique JWT ID for revocation |
| refreshToken | String | Hashed refresh token |
| expiresAt | DateTime | Session expiry |
| revokedAt | DateTime? | Revocation timestamp |

**Index**: `[userId]`

### PasswordResetToken / EmailVerificationToken

Token-based auth flows. Tokens stored as SHA-256 hashes, never plaintext.

**Indexes**: `[userId]`, `[expiresAt]`

---

## Licensing

### License

VPS/signal/PAMM license keys with lifecycle management.

| Field | Type | Notes |
|-------|------|-------|
| licenseKey | String | Unique license key |
| type | LicenseType | VPS_INSTALLATION, PAMM_SUBSCRIBER, SIGNAL_SUBSCRIBER |
| status | LicenseStatus | PENDING, ACTIVE, EXPIRED, REVOKED, SUSPENDED, CANCELLED |
| startsAt / expiresAt | DateTime | License validity period |
| vpsInstanceId | String? | Linked VPS instance |

**Indexes**: `[status, expiresAt]`, `[userId]`

### Subscription

Tier-based subscriptions for forex signal access.

| Field | Type | Notes |
|-------|------|-------|
| tier | SubscriptionTier | DEMO, FREE, SIGNAL_STARTER/PRO/VIP, CRYPTO_* |
| status | LicenseStatus | Reuses license status enum |
| profitSharePct | Decimal? | Profit share percentage |
| monthlyFeeUsd | Decimal? | Monthly subscription fee |

**Tiers**: DEMO, FREE, SIGNAL_STARTER, SIGNAL_PRO, SIGNAL_VIP, CRYPTO_BASIC, CRYPTO_STARTER, CRYPTO_ACTIVE, CRYPTO_PRO, CRYPTO_HNWI

### CryptoBotSubscription

Crypto-specific subscription with Binance integration.

| Field | Type | Notes |
|-------|------|-------|
| tier | CryptoSubscriptionTier | CRYPTO_BASIC through CRYPTO_HNWI |
| cryptoTenantId | String? | Crypto backend tenant ID |
| apiKeyConnected | Boolean | Binance API key status |
| maxLeverage | Int | Leverage limit per tier |
| maxPairs | Int | Trading pair slot limit |

**Indexes**: `[status]`, `[nextBillingAt]`

---

## Billing

### Invoice

Payment invoice with PDF generation support.

| Field | Type | Notes |
|-------|------|-------|
| number | String | Unique invoice number |
| amountUsd | Decimal | Invoice amount |
| currency | String | IDR or USD |
| status | InvoiceStatus | DRAFT, DUE, PAID, OVERDUE, CANCELLED, REFUNDED |
| pdfUrl | String? | Generated PDF path |

**Indexes**: `[userId, issuedAt]`, `[status, dueAt]`

### PricingTier

CMS-managed pricing tiers displayed on public pricing page.

| Field | Type | Notes |
|-------|------|-------|
| slug | String | Unique identifier (e.g. `crypto-pro`) |
| category | PricingCategory | SIGNAL, CRYPTO, VPS, DEMO, INSTITUTIONAL |
| priceIdr / priceUsd | Int? | Numeric price for checkout |
| features | Json | Feature list (string[]) |
| metadata | Json | Tier-specific data (slots, leverage, risk) |
| en_synced_at | DateTime? | i18n staleness tracking |

**Indexes**: `[sortOrder]`, `[category, isVisible]`, `[en_synced_at]`

---

## CMS Content

### LandingSection

Hero, features, pricing, FAQ, and other landing page sections.

| Key Fields | `slug` (unique), `title`/`title_en`, `content`/`content_en` (Json), `sortOrder`, `isVisible`, `en_synced_at` |
|------------|---|

### Article / BlogTopic

AI-generated research content pipeline.

- **Article**: Published research with bilingual content, SEO metadata, category classification
- **BlogTopic**: Topic catalog driving the auto-generation pipeline (prompt template, data sources, scheduling)

**Article categories**: RESEARCH, STRATEGY, EXECUTION, RISK, OPERATIONS, MARKET_ANALYSIS, EDUCATION, CASE_STUDY, COMPLIANCE

**BlogTopic statuses**: PENDING -> GENERATING -> GENERATED -> PUBLISHED (or FAILED)

### Faq

Categorized FAQ with bilingual auto-sync. Categories: GENERAL, PRICING, TECHNICAL, SECURITY.

### Banner / Popup

Marketing display components with scheduling (startsAt/endsAt) and activation rules.
- **Banner positions**: TOP, BOTTOM, FLOATING
- **Popup triggers**: DELAY, EXIT_INTENT, SCROLL, PAGE_LOAD

### Other CMS Models

| Model | Purpose |
|-------|---------|
| Testimonial | Social proof with rating (1-5) |
| PageMeta | SEO metadata per route (title, description, OG tags, structured data) |
| PageContent | Static page content (sections as JSON array) |
| SiteSetting | Key-value configuration + feature flags |
| EmailTemplate | Bilingual email templates with `{{variable}}` interpolation |
| Changelog | Versioned release notes (FEATURE, IMPROVEMENT, FIX, SECURITY, BREAKING) |

---

## Promotions & Revenue

### Promotion

AI-strategist-driven promotions with discount engine.

| Field | Type | Notes |
|-------|------|-------|
| discountType | DiscountType | PERCENT or FIXED_IDR |
| discountValue | Decimal | Discount amount |
| applicableTiers | Json | Tier slugs this promo applies to |
| maxUsage / currentUsage | Int | Usage limits |
| status | PromoStatus | DRAFT, SCHEDULED, ACTIVE, EXPIRED, PAUSED, REJECTED |
| aiGenerated | Boolean | Created by AI strategist |
| confidence | Int | AI confidence score (auto-publish >= 80) |

### CalendarEvent

Indonesia + international calendar for promo timing. Fields: `eventDate`, `leadDays` (days before event to start promo), `country` (ID/INTL).

### RevenueSnapshot

Daily MRR tracking for strategist input: `mrrIdr`, `activeSubscribers`, `newSignups24h`, `churned24h`, `healthScore` (0-100).

---

## Trading & Signals

### SignalAuditLog

Signal tracking with full lifecycle.

| Field | Type | Notes |
|-------|------|-------|
| sourceId | BigInt | VPS1 signal ID (dedup key) |
| pair | String | Trading pair (e.g. "XAUUSD") |
| direction | String | BUY/SELL |
| outcome | SignalOutcome | PENDING, OPEN, WIN, LOSS, BREAKEVEN, CANCELLED |
| profitUsd | Decimal? | Realized P&L |

**Indexes**: `[pair, emittedAt]`, `[outcome, emittedAt]`

### PairBrief

AI-generated pair intelligence briefs with structured ground truth from VPS1.

| Key Fields | `pair`, `session` (ASIAN/LONDON/NEW_YORK), `date`, structured data (support/resistance/SND zones), AI `narrative`/`narrative_en`, `tradeIdeas` (Json), `accessTier` |
|------------|---|

### ConsumerState

Cursor tracking for VPS1 data consumers. Fields: `scope`, `lastSeenId`, `lastRunAt`, `runCount`.

### KillSwitchEvent

Kill-switch trigger audit trail linked to License.

---

## Notifications

### NotificationLog

Multi-channel notification history. Channels: TELEGRAM, EMAIL, WHATSAPP, INAPP.

### NotificationPreference

Per-user channel/timezone preferences. Fields: `channels` (Json), `timezone`, `quietHoursStart/End`.

### WhatsappVerification

OTP verification records. Fields: `e164` (phone), `otpHash` (SHA-256), `expiresAt`, `attempts`.

### PushSubscription

PWA push notification subscriptions with topic opt-in (`signal_alerts`, `kill_switch`, `account_security`, `payment_status`).

---

## Infrastructure

### VpsInstance

VPS fleet management with encrypted admin tokens (AES-256).

| Field | Type | Notes |
|-------|------|-------|
| customerCode | String? | Unique customer code |
| backendBaseUrl | String | Backend API URL |
| adminToken* | String | AES-256 encrypted credentials (cipher + IV + tag) |
| status | VpsStatus | PROVISIONING, ONLINE, OFFLINE, SUSPENDED |

### HealthCheck

Periodic VPS health metrics: `httpStatus`, `responseTimeMs`, `zmqConnected`, `dbOk`, `lastTickAge`.

### AuditLog

Tamper-evident audit trail with SHA-256 chain verification. Fields: `action`, `metadata` (Json), `ipAddress`, `userAgent`.

---

## KYC

### UserKyc

KYC document + risk profile submission.

| Field | Type | Notes |
|-------|------|-------|
| status | KycStatus | NOT_SUBMITTED, PENDING_REVIEW, ADDITIONAL_INFO_REQUIRED, APPROVED, REJECTED |
| documentType | KycDocumentType | KTP, PASSPORT, SIM, NPWP, NATIONAL_ID, DRIVER_LICENSE |
| investmentExperience | String? | novice / intermediate / advanced / professional |
| riskTolerance | String? | conservative / moderate / aggressive |

---

## Workers & Analytics

### WorkerRun

Background worker execution log. Fields: `worker`, `status` (RUNNING/COMPLETED/FAILED), `itemsProcessed`.

### AiCallLog

AI API call tracking for cost analysis. Fields: `purpose`, `model`, `inputTokens`, `outputTokens`, `latencyMs`, `success`.

### AnalyticsEvent

Self-hosted pageview + funnel tracking. Event types: pageview, cta_click, register_start/step/complete, checkout_start/success, engagement.

### CryptoAuditTrail

Crypto bot operation audit linked to CryptoBotSubscription.

---

## Marketing & Leads

| Model | Purpose |
|-------|---------|
| ChatLead | Pre-chat lead capture (name + email gate) |
| Subscriber | Newsletter subscribers with source attribution |
| Inquiry | Sales inquiry form submissions |

**Subscriber sources**: FOOTER, CHAT_LEAD, CONTACT_FORM, RESEARCH_INLINE, EXIT_INTENT, IMPORT
