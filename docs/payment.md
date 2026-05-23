# Payment Integration

## Overview

Primary payment processor: **Xendit** (inline checkout with Card, QRIS, VA, E-wallet).
Legacy fallback: **Midtrans**.

All payment logic lives under:
- API routes: `src/app/api/billing/*`
- Components: `src/components/checkout/*`
- Utilities: `src/lib/payment/*`

---

## Xendit Inline Checkout Flow

### Architecture

```
Browser                          Server                         Xendit
  |                                |                              |
  |  1. Select tier + promo        |                              |
  |  --------------------------->  |                              |
  |                                |                              |
  |  2. GET /api/billing/preview   |                              |
  |  <--  { amount, discount }     |                              |
  |                                |                              |
  |  3. GET /api/billing/xendit-config                            |
  |  <--  { publicKey }            |                              |
  |                                |                              |
  |  4. User enters payment info   |                              |
  |     (InlineCheckout component) |                              |
  |                                |                              |
  |  5. POST /api/billing/checkout |                              |
  |  --------------------------->  |  Create charge/invoice       |
  |                                |  --------------------------> |
  |                                |  <-- { id, status, urls }    |
  |  <--  { orderId, actions }     |                              |
  |                                |                              |
  |  6. Display payment method     |                              |
  |     (QR/VA/redirect)           |                              |
  |                                |                              |
  |  7. Poll status                |                              |
  |  GET /api/billing/poll-status  |                              |
  |  --------------------------->  |                              |
  |  <--  { status: PAID }         |                              |
  |                                |                              |
  |                     8. Webhook |  <------------------------   |
  |                                |  POST /api/billing/webhook/xendit
  |                                |  Verify signature            |
  |                                |  Update Invoice status       |
  |                                |  Activate subscription       |
```

### Payment Methods

| Method | Component | Flow |
|--------|-----------|------|
| **Card** | `checkout/card-form.tsx` | Xendit.js tokenization -> charge API |
| **QRIS** | `checkout/qris-display.tsx` | QR code display with countdown timer |
| **Virtual Account** | `checkout/va-display.tsx` | Bank VA number display with copy |
| **E-wallet** | `checkout/ewallet-display.tsx` | Redirect/deeplink to e-wallet app |

### InlineCheckout Component

`src/components/checkout/inline-checkout.tsx` -- main orchestrator:

1. Loads Xendit.js (`js.xendit.co`) for client-side tokenization
2. Renders payment method tabs (Card / QRIS / VA / E-wallet)
3. Handles form submission to `/api/billing/checkout`
4. Displays payment instructions based on method
5. Polls `/api/billing/poll-status` for completion
6. Redirects to success/failure/pending pages

---

## Webhook Handling

### Xendit Webhook (`/api/billing/webhook/xendit`)

```
Xendit POST
  |
  v
1. Verify x-callback-token (timingSafeEqual)
  |
  v
2. Parse event type + status
  |
  v
3. Status mapping:
     PAID/SETTLED  -> Invoice.PAID  -> activate subscription
     EXPIRED       -> Invoice.CANCELLED
     FAILED        -> Invoice.CANCELLED
  |
  v
4. Update Invoice record
  |
  v
5. Activate/extend subscription if PAID
  |
  v
6. Send notification (email + Telegram)
  |
  v
7. Return 200 OK
```

### Midtrans Webhook (`/api/billing/webhook/midtrans`)

```
Midtrans POST
  |
  v
1. Verify SHA-512 signature
     SHA512(order_id + status_code + gross_amount + server_key)
  |
  v
2. Status mapping:
     capture/settlement -> PAID
     pending           -> DUE
     deny/cancel/expire -> CANCELLED
  |
  v
3. Update Invoice + subscription
  |
  v
4. Return 200 OK
```

---

## Invoice Lifecycle

```
DRAFT  ->  DUE  ->  PAID
                 ->  OVERDUE  ->  CANCELLED
                 ->  CANCELLED
                 ->  REFUNDED
```

| Status | Description |
|--------|-------------|
| DRAFT | Invoice created, not yet issued |
| DUE | Issued, awaiting payment |
| PAID | Payment confirmed via webhook |
| OVERDUE | Past due date, not yet cancelled |
| CANCELLED | Payment failed, expired, or manually cancelled |
| REFUNDED | Payment reversed |

### Invoice Fields

- `number`: Unique invoice number (auto-generated)
- `amountUsd`: Invoice amount (Decimal)
- `currency`: IDR or USD
- `periodStart` / `periodEnd`: Subscription billing period
- `pdfUrl`: Generated PDF invoice path
- `metadata`: Payment processor response data (Json)

---

## PDF Invoice Generation

Built with `pdf-lib` (`src/lib/payment/` + checkout route handler).

### Features

- Institutional-grade design
- WinAnsi character sanitizer (PDF compatibility for Indonesian characters)
- Payment method label mapping (e.g. QRIS, VA, Card brand)
- Company info from `CompanySettings`
- Bilingual support
- Stored at `/uploads/invoices/{filename}.pdf`
- Served via `/api/uploads/invoices/[filename]` (JWT required)

---

## Promo / Discount Engine

### Flow

```
1. User selects tier on pricing page
2. Promo auto-applied via active Promotion
   OR user enters promo code (future)
3. GET /api/billing/preview
   -> { originalAmount, discountAmount, finalAmount, promoSlug }
4. Checkout uses finalAmount
5. Invoice records discount in metadata
6. Promotion.currentUsage incremented
```

### Discount Types

| Type | Description | Example |
|------|-------------|---------|
| PERCENT | Percentage off | 20 = 20% off |
| FIXED_IDR | Fixed IDR amount off | 50000 = Rp 50K off |

### Promotion Rules

- `applicableTiers`: Which pricing tier slugs the promo applies to (empty = all)
- `maxUsage`: Maximum usage count (0 = unlimited)
- `currentUsage`: Incremented per checkout
- `startsAt` / `endsAt`: Active date range
- `status`: DRAFT -> SCHEDULED -> ACTIVE -> EXPIRED

Active promotions fetched via `GET /api/cms/promotions/active`.

---

## Multi-Currency Support

| Currency | Context |
|----------|---------|
| IDR | Primary -- Indonesian customers, QRIS, VA |
| USD | International customers, card payments |

Exchange rate handling at `src/lib/payment/rates.ts`. Pricing tiers store both `priceIdr` and `priceUsd` in the `PricingTier` model.

Locale-based currency selection:
- Indonesian users (geo-IP `ID`) -> IDR pricing
- International users -> USD pricing

---

## Billing API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/billing/checkout` | JWT (CLIENT) | Create Xendit charge/invoice |
| POST | `/api/billing/charge` | JWT (CLIENT) | Direct card charge (tokenized) |
| GET | `/api/billing/preview` | JWT (CLIENT) | Price preview with promo |
| GET | `/api/billing/poll-status` | JWT (CLIENT) | Poll payment status |
| GET | `/api/billing/xendit-config` | JWT (CLIENT) | Xendit public key for client |
| POST | `/api/billing/webhook/xendit` | Webhook | Xendit callback |
| POST | `/api/billing/webhook/midtrans` | Webhook | Midtrans callback |
| POST | `/api/billing/webhook/stripe` | Webhook | Stripe callback |

---

## Testing with Xendit Sandbox

Xendit provides sandbox/test mode credentials.

### Test Cards

| Number | Result |
|--------|--------|
| 4000000000000002 | Successful charge |
| 4000000000000010 | Declined |
| 4000000000000077 | 3DS authentication required |

### Test VA

Any VA number in sandbox mode auto-settles after creation.

### Test QRIS

Sandbox QRIS codes are scannable but auto-settle.

### Configuration

- Set `XENDIT_SECRET_KEY` to sandbox key (prefix `xnd_development_`)
- Set `NEXT_PUBLIC_XENDIT_PUBLIC_KEY` to sandbox public key
- Webhook URL must be configured in Xendit dashboard (development mode)

---

## Portal Billing Pages

| Route | Purpose |
|-------|---------|
| `/checkout` | Main checkout page (InlineCheckout component) |
| `/portal/billing/upgrade` | Subscription upgrade (UpgradePanel component) |
| `/portal/billing/success` | Payment success confirmation |
| `/portal/billing/failure` | Payment failure notification |
| `/portal/billing/pending` | Payment pending status |

---

## Forex Billing Bridge

`/api/forex/billing/checkout` -- proxy checkout to VPS1 forex backend:

1. FE creates checkout session via forex backend
2. Backend returns payment URL/instructions
3. FE redirects user to payment
4. Backend webhook handles fulfillment
5. FE polls forex backend for status update
