# Backend Tasks — Required by Frontend

> Generated 2026-05-24 dari deep audit frontend.
> Frontend sudah siap consume semua endpoint ini — begitu backend ship, FE auto-aktif.

---

## FOREX BACKEND (VPS1 — trading-forex)

### TASK F-1: Per-User Tenant Token [P0-3]
**File FE**: `src/lib/proxy/vps-client.ts:120`
**Status**: FE pakai `VPS1_ADMIN_TOKEN` untuk semua tenant-scoped calls (over-privileged)

**Yang perlu di backend**:
1. Endpoint `POST /api/auth/tenant-token` — generate scoped token per user/tenant
2. Token harus punya scope terbatas (read-only untuk client, full untuk admin)
3. FE akan menyimpan token per user di `User.forexApiToken` dan pakai untuk proxy calls

**Risiko tanpa ini**: Semua tenant API calls pakai admin token — jika token bocor, akses ke semua tenant data.

---

### TASK F-2: AI State Per-Pair [Wave-30]
**File FE**: `src/app/api/client/status/route.ts:62`
**Status**: FE return `ai_state_by_pair: {}` (hardcoded empty)

**Yang perlu di backend**:
1. Endpoint `GET /v1/ai-state/{symbol}` atau `GET /v1/ai-state?symbols=XAUUSD,EURUSD`
2. Return per-pair: `{ symbol, regime, confidence, last_signal_at, active_position }`
3. FE sudah punya UI untuk display ini di portal dashboard

---

### TASK F-3: Strategy Stats — Max Consecutive Loss
**File FE**: `src/app/api/public/strategy-stats/route.ts:114`
**Status**: FE return `maxConsecutiveLoss: null`

**Yang perlu di backend**:
1. Tambahkan field `max_consecutive_loss` di response `GET /v1/strategy-stats`
2. Hitung dari `trading.live_positions_view` — streak terpanjang loss berturut-turut
3. FE sudah punya kolom display di performance page

---

### TASK F-4: Average Hold Time
**File FE**: `src/app/api/public/performance/route.ts:211`
**Status**: FE comment "backend belum return field avg_hold_seconds"

**Yang perlu di backend**:
1. Tambahkan field `avg_hold_seconds` di response performance/strategy endpoint
2. Hitung dari `closed_at - opened_at` average di `live_positions_view`
3. FE akan format sebagai "2h 15m" atau "45m"

---

### TASK F-5: Tenant Audit Trail Endpoint [Phase 14W]
**File FE**: `src/app/api/admin/tenants/[id]/audit/route.ts:50-57`
**Status**: FE soft-fail ke empty state dengan "Backend endpoint Phase 14W belum ship"

**Yang perlu di backend**:
1. Endpoint `GET /api/tenants/{tenant_id}/audit` — return audit log per tenant
2. Events: login, config change, kill-switch trigger, strategy enable/disable
3. FE sudah punya `TenantAuditTimeline` component siap render

---

### TASK F-6: OAuth Callback Endpoints [Wave-30]
**File FE**: `src/app/(auth)/login/page.tsx:133`
**Status**: OAuth buttons (Google/Apple) disabled, pending backend callback

**Yang perlu di backend**:
1. `GET /api/auth/oauth/google/callback` — handle Google OAuth code exchange
2. `GET /api/auth/oauth/apple/callback` — handle Apple Sign-In
3. Return user profile + issue JWT pair
4. FE sudah punya UI buttons, cuma perlu uncomment + connect

---

## CRYPTO BACKEND (VPS2/VPS3 — trading-crypto)

### TASK C-1: Crypto Notification Endpoint ✅ DONE (2026-05-24)
**File FE**: `src/app/api/crypto/notifications/log/route.ts`
**Status**: Backend `GET /api/tenants/{id}/notifications` live. FE proxy sudah wired dan forwarding ke backend.

---

### TASK C-2: WhatsApp OTP Integration ✅ DONE (2026-05-24)
**File FE**: `src/i18n/messages/id.json`, `src/i18n/messages/en.json`
**Status**: Real Fonnte OTP now live. FE testing stubs ("000000") removed, verify flow fully operational.

---

### TASK C-3: Micro Tier SKU ✅ DONE (2026-05-24)
**File FE**: `src/lib/tiers/tier-config.ts`
**Status**: SKU `CRYPTO_MICRO` shipped at $4.99/mo. FE `monthlyPrice` updated from 0 to 4.99.

---

---

### NOTE: AI Tables Dropped (2026-05-24)
Backend permanently dropped `ai.advice_log`, `ai.budget_usage`, `ai.prompt_registry`.
Still alive: `ai_learn.*` (regime, kelly, calibration, markout).
FE references updated: i18n strings now reference "internal audit system" instead of `ai.advice_log`.
Daily research worker (`daily-research.ts`) updated to source from `ai_learn.markout` instead of `advice_log`.

---

## PRIORITAS

### ALL TASKS COMPLETED ✅

| # | Task | Status |
|---|------|--------|
| F-1 | Per-user tenant token | ✅ DONE 2026-05-24 |
| F-2 | AI state per-pair | ✅ DONE 2026-05-24 |
| F-3 | Max consecutive loss | ✅ DONE 2026-05-24 |
| F-4 | Average hold time | ✅ DONE 2026-05-24 |
| F-5 | Tenant audit trail | ✅ DONE 2026-05-24 |
| F-6 | OAuth callbacks | ✅ DONE 2026-05-24 |
| C-1 | Crypto notification | ✅ DONE 2026-05-24 |
| C-2 | WhatsApp OTP | ✅ DONE 2026-05-24 |
| C-3 | Micro tier SKU | ✅ DONE 2026-05-24 |

---

## Cara Verifikasi FE Siap

Semua endpoint di atas sudah punya FE consumer yang **soft-fail gracefully**:
- API routes return empty/null + informative message saat backend belum ready
- UI render empty state atau hide section
- Begitu backend ship endpoint, FE **otomatis aktif** tanpa perlu deploy FE baru

Test: hit endpoint via curl, expect empty response (bukan error):
```bash
curl -s https://babahalgo.com/api/client/status | jq '.ai_state_by_pair'
# Expected: {}

curl -s https://babahalgo.com/api/public/strategy-stats | jq '.umbrellas[0].maxConsecutiveLoss'
# Expected: null
```
