# Integration Spec — License Check Endpoint

**Date**: 2026-05-20
**FE owner**: Abdullah (`db6eb10`)
**Endpoint owner**: trading-apifrontend (FE — `babahalgo.com`)
**Consumer**: Customer VPS license middleware (Python service di `customer-vps-template/`)
**Status**: FE endpoint **LIVE** (`src/app/api/license/check/route.ts`). Middleware sudah reference. Doc ini = consumer integration spec.

---

## TL;DR

`/api/license/check` adalah **enforcement gate** untuk customer-deployed MT5 bots. Setiap customer VPS punya license middleware (Python) yang polling endpoint ini tiap 15 menit. Kalau license expired (+72h grace habis) atau di-revoke → middleware trigger `emergency_pause` di MT5 EA, semua trading berhenti.

**Direction**: Customer VPS (client) → babahalgo.com (server). Auth via HMAC-SHA256 dengan per-customer shared secret.

---

## Architecture

```
Customer VPS (Phase 1 customer-vps-template)
├─ MT5 broker terminal (EA running)
├─ License middleware (Python, polls every 15 min)
│       │ GET https://babahalgo.com/api/license/check
│       │   ?customer_id=<code>
│       │   X-Signature: <hmac-sha256>
│       │   X-Timestamp: <ms-since-epoch>
│       ▼
└─ babahalgo.com FE
    └─ src/app/api/license/check/route.ts
        ├─ Verify HMAC + timestamp (≤5min skew)
        ├─ Lookup VpsInstance by customerCode
        ├─ Find latest ACTIVE License
        ├─ Compute expiry + 72h grace
        └─ Return {valid, expires_at, in_grace_period, tier, enabled_flags}

Middleware action on response:
  valid=true          → keep MT5 EA running
  valid=true + grace  → keep running + show grace warning
  valid=false         → emergency_pause MT5 EA, log incident
  network error       → retry 3× with exponential backoff, then fall back to last cached state
```

---

## Endpoint Contract

### `GET /api/license/check`

```http
GET /api/license/check?customer_id=BABAHALGO-VPS-001 HTTP/1.1
Host: babahalgo.com
X-Signature: 5f3a9b8c2e1d4f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a
X-Timestamp: 1716163800123
Accept: application/json
```

**Query params**:
| Name | Type | Required | Notes |
|---|---|---|---|
| `customer_id` | string | yes | Maps to `VpsInstance.customerCode`. Format: `BABAHALGO-VPS-<6-digit>`. Provisioned saat customer pertama setup. |

**Headers**:
| Name | Type | Required | Notes |
|---|---|---|---|
| `X-Signature` | hex string | yes | HMAC-SHA256 lowercase hex (64 chars) |
| `X-Timestamp` | int (ms epoch) | yes | Current UNIX timestamp di ms. Server reject kalau skew > 5 menit |

**Auth**: HMAC signing — see "Signing Algorithm" section di bawah.

---

## Response — Success (200 OK)

```json
{
  "valid": true,
  "expires_at": "2027-05-20T00:00:00.000Z",
  "in_grace_period": false,
  "grace_expires_at": "2027-05-23T00:00:00.000Z",
  "tier": "VPS_INSTALLATION",
  "enabled_flags": {
    "max_lots": 0.5,
    "allowed_pairs": ["EURUSD", "GBPUSD", "XAUUSD"],
    "ai_advisor_enabled": true,
    "kill_switch_threshold_usd": 500
  }
}
```

**Field meaning**:
| Field | Type | Notes |
|---|---|---|
| `valid` | bool | `true` kalau license aktif ATAU expired tapi masih dalam 72h grace. Middleware honor → keep MT5 running. |
| `expires_at` | ISO-8601 UTC | License hard expiry. Setelah ini masuk grace period. |
| `in_grace_period` | bool | `true` saat ini > expires_at tapi < grace_expires_at. Show warning UI. |
| `grace_expires_at` | ISO-8601 UTC | `expires_at + 72h`. Setelah ini `valid` jadi `false`. |
| `tier` | enum | `VPS_INSTALLATION` \| `PAMM_SUBSCRIBER` \| `SIGNAL_SUBSCRIBER` |
| `enabled_flags` | object | Free-form per-license config (`License.metadata.enabled_flags`). Middleware/EA boleh consume untuk gating fitur (max_lots, allowed_pairs, AI features, kill-switch threshold). Schema NOT fixed — extensible. |

---

## Response — Errors

### 400 Bad Request — MISSING_PARAMS
```json
{ "valid": false, "error": "MISSING_PARAMS" }
```
Salah satu dari `customer_id` / `X-Signature` / `X-Timestamp` tidak ada. Middleware action: log + alert ops (kemungkinan config rusak).

### 401 Unauthorized — TIMESTAMP_EXPIRED
```json
{ "valid": false, "error": "TIMESTAMP_EXPIRED" }
```
`abs(server_now - X-Timestamp) > 5 min`. Customer VPS clock drift → fix via NTP sync. Middleware action: retry sekali setelah `ntpdate`, kalau persistent log critical alert.

### 401 Unauthorized — INVALID_SIGNATURE
```json
{ "valid": false, "error": "INVALID_SIGNATURE" }
```
HMAC mismatch. Possible causes:
- HMAC secret salah di customer VPS `.env`
- Customer di-revoke (admin rotated secret)
- Payload encoding salah (must use UTF-8)

Middleware action: 3× retry, kalau persistent → emergency_pause + critical alert (kemungkinan tampering atau rotated secret).

### 404 Not Found — LICENSE_NOT_FOUND
```json
{ "valid": false, "error": "LICENSE_NOT_FOUND" }
```
Tidak ada `VpsInstance` dengan `customerCode == customer_id` ATAU semua license-nya non-ACTIVE (PENDING/EXPIRED/REVOKED/SUSPENDED). Middleware action: emergency_pause immediately, log incident. Customer kemungkinan di-revoke atau VPS tidak provisioned dengan benar.

### 500 Server Error — SERVER_CONFIG_ERROR / INTERNAL_ERROR
```json
{ "valid": false, "error": "INTERNAL_ERROR" }
```
FE-side issue (DB down, HMAC secret tidak di-set di env). Middleware action: retry 3× exponential backoff, kalau persistent → degrade ke last known good state untuk 72h grace, baru emergency_pause.

---

## Signing Algorithm

**Payload format** (string, UTF-8):
```
{customer_id}:{timestamp_ms}
```

**Algorithm**: HMAC-SHA256, output lowercase hex (64 chars).

### Python reference (sudah ada di `customer-vps-template/license-middleware/hmac_signer.py`)

```python
import hashlib
import hmac
import time

def sign_request(customer_id: str, secret: str) -> tuple[str, str]:
    timestamp = str(int(time.time() * 1000))
    payload = f"{customer_id}:{timestamp}".encode('utf-8')
    signature = hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256,
    ).hexdigest()
    return signature, timestamp
```

### Node.js reference (untuk testing dari FE side)

```js
const crypto = require('crypto');
function signRequest(customerId, secret) {
  const timestamp = String(Date.now());
  const payload = `${customerId}:${timestamp}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  return { signature, timestamp };
}
```

### Bash/curl reference (untuk smoke test)

```bash
CUSTOMER_ID="BABAHALGO-VPS-001"
SECRET="<shared-hmac-secret>"
TS=$(date +%s%3N)
SIG=$(printf "%s:%s" "$CUSTOMER_ID" "$TS" | openssl dgst -sha256 -hmac "$SECRET" -hex | cut -d' ' -f2)

curl -s "https://babahalgo.com/api/license/check?customer_id=$CUSTOMER_ID" \
  -H "X-Signature: $SIG" \
  -H "X-Timestamp: $TS" | jq .
```

---

## Secret Provisioning Lifecycle

| Stage | Who | Action |
|---|---|---|
| 1. License issued | Admin (FE CMS) | Create `License` + `VpsInstance` row, generate `customerCode` + HMAC secret. Store secret encrypted di `License.metadata` atau separate `LicenseSecret` table. |
| 2. Customer onboarding | Ops | Provide `customer_id` + HMAC secret ke customer via secure channel (1Password vault, encrypted PDF, dll). NEVER email plaintext. |
| 3. Customer VPS install | Customer (via provision.sh) | Inject ke `/opt/babahalgo/.env` sebagai `LICENSE_CUSTOMER_ID` + `LICENSE_HMAC_SECRET`. File mode `0600`. |
| 4. Polling | License middleware | Read .env, call `/api/license/check` every 15 min. Cache last good response di `/var/lib/babahalgo/license-cache.json`. |
| 5. Rotation | Admin (FE CMS) | Issue new secret, mark old secret `rotated_at`, give 24h overlap window untuk customer update. Old secret valid sampai overlap habis. |
| 6. Revocation | Admin | Set `License.status = REVOKED`, set `License.revokedAt = now()`. Next poll returns 404 → emergency_pause. |

**Current state (2026-05-20)**: rotation + overlap window logic BELUM ada di FE. Saat ini cuma single static secret per `VpsInstance`. Rotation = manual coordinate dengan customer. Backlog item — track sebagai separate task kalau ada onboarding scale > 5 customers.

---

## Middleware Behavior Reference

(Sudah implemented di `customer-vps-template/license-middleware/service.py` — informational untuk audit)

```
poll loop (every 15 min):
  ├─ sign request (current timestamp)
  ├─ GET /api/license/check
  ├─ if 200 OK + valid=true:
  │     ├─ update cache (license-cache.json)
  │     ├─ if in_grace_period: emit "grace_warning" event
  │     └─ continue (no action)
  ├─ if 200 OK + valid=false:
  │     ├─ log INCIDENT
  │     ├─ trigger emergency_pause via MT5 EA bridge
  │     └─ alert ops via webhook
  ├─ if 401/404 (auth/not-found):
  │     ├─ 3× retry exponential backoff (5s, 30s, 2min)
  │     ├─ if still failing: trigger emergency_pause
  │     └─ alert ops critical
  └─ if 5xx or network error:
        ├─ 3× retry
        ├─ if still failing: keep last cached state for ≤72h
        └─ after 72h cache stale: emergency_pause + alert
```

---

## Validation Checklist

**Customer VPS install side**:
1. ✅ HMAC secret tertanam di `/opt/babahalgo/.env` mode 0600 (not world-readable)
2. ✅ `customer_id` match dengan `VpsInstance.customerCode` di FE DB
3. ✅ NTP sync aktif (`timedatectl status` → `System clock synchronized: yes`)
4. ✅ Smoke test: middleware service starts, log shows successful first poll
5. ✅ Network egress ke `babahalgo.com:443` tidak diblok firewall

**FE side**:
1. ✅ `LICENSE_HMAC_SECRET` di-set di production env (currently `.env` di VPS3, verify dengan `docker compose exec app printenv | grep LICENSE`)
2. ✅ `VpsInstance` row exists dengan correct `customerCode`
3. ✅ `License.status = ACTIVE` dan `expiresAt` future
4. ✅ Endpoint responds 200 OK untuk valid signature (test via curl di atas)

**FE-side health check** (untuk monitoring dashboard):
```bash
# Replace with actual customer ID + secret in production
curl -fsS "https://babahalgo.com/api/license/check?customer_id=BABAHALGO-VPS-TEST" \
  -H "X-Signature: $(openssl dgst -sha256 -hmac "$TEST_SECRET" -hex <<< "BABAHALGO-VPS-TEST:$TS" | cut -d' ' -f2)" \
  -H "X-Timestamp: $TS"
```

---

## Open Questions / Backlog

1. **Secret rotation flow**: belum ada UI di admin CMS untuk rotate HMAC secret + propagate ke customer. Saat ini full manual. Track sebagai Phase 1.x follow-up.
2. **Multi-license per VPS**: schema mendukung 1 VPS → N licenses (mis. trial + paid concurrent). Current endpoint pakai latest ACTIVE only. Konfirmasi business rule kalau scenario ini muncul (e.g., kill-switch threshold OR-merge dari semua aktif?).
3. **`enabled_flags` schema versioning**: free-form JSON saat ini. Saat fields-nya stabil (post 5 customers), formalize ke typed schema + version field (`enabled_flags_version: 1`).
4. **Audit logging**: setiap call belum di-log ke `AuditLog` table. Untuk forensik (siapa polling kapan, dari IP mana), tambahkan log writer. Track sebagai compliance backlog.
5. **Rate limiting**: belum ada per-customer rate limit di endpoint ini. Asumsi normal 1 call / 15 min / customer. Kalau ada anomali (1 call/detik) → kemungkinan middleware crash loop atau attack. Tambahkan rate limit 6/min via middleware ip-based atau customer_id-based.

---

## Reference Code

| Location | Purpose |
|---|---|
| `src/app/api/license/check/route.ts` | FE endpoint handler (live) |
| `customer-vps-template/license-middleware/service.py` | Customer-side polling service |
| `customer-vps-template/license-middleware/hmac_signer.py` | Signing helper (Python reference) |
| `prisma/schema.prisma:93-127` | License + VpsInstance models |
| `src/app/(admin)/admin/licenses/` | Admin UI untuk manage licenses |
| `src/app/api/admin/licenses/` | Admin CRUD API |

---

## Contact

FE owner: Abdullah (`db6eb10` 2026-05-20)
Endpoint live since: 2026-04-20 commit `84afac5` (Phase 1 customer VPS infrastructure)
Related handoff: `docs/BACKEND_HANDOFF_2026-05-20_TRADE_EVENTS_CONTRACT.md`
