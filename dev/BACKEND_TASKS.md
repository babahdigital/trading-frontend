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

### TASK C-1: Crypto Notification Endpoint
**File FE**: `src/app/api/crypto/notifications/log/route.ts:29`
**Status**: FE return empty payload "Backend belum configured"

**Yang perlu di backend**:
1. Endpoint `GET /api/tenants/{id}/notifications` — return notification log
2. Events: trade executed, SL hit, TP hit, kill-switch, daily summary
3. FE sudah punya notification hub di portal

---

### TASK C-2: WhatsApp OTP Integration
**File FE**: `src/i18n/messages/id.json:3667`
**Status**: FE show "Masukkan kode 000000 untuk testing" — OTP belum real

**Yang perlu di backend**:
1. Integrate Fonnte API untuk kirim OTP via WhatsApp
2. Endpoint `POST /api/whatsapp/send-otp` — generate + send 6-digit OTP
3. FE sudah punya verify flow, tinggal connect ke real OTP

---

### TASK C-3: Micro Tier SKU
**File FE**: `src/lib/tiers/tier-config.ts:14,80`
**Status**: `monthlyPrice: 0` dengan comment "backend belum ship SKU"

**Yang perlu di backend**:
1. Register SKU `CRYPTO_MICRO` di billing/subscription system
2. Set pricing: ~$4-5/mo, 1 slot, 2x leverage
3. FE sudah punya tier config, tinggal set `monthlyPrice` setelah backend ready

---

## PRIORITAS

### Harus Segera (security + core feature)
1. **F-1**: Per-user tenant token — security risk jika bocor
2. **C-2**: WhatsApp OTP — customer onboarding blocker

### Sebelum Customer Onboarding
3. **F-5**: Tenant audit trail — ops visibility
4. **C-1**: Crypto notification — customer engagement

### Nice-to-Have (bisa setelah launch)
5. **F-2**: AI state per-pair — dashboard polish
6. **F-3**: Max consecutive loss — performance stats
7. **F-4**: Average hold time — performance stats
8. **F-6**: OAuth — convenience login
9. **C-3**: Micro tier — market expansion

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
