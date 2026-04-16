# Rencana Komersialisasi Trading Bot — Arsitektur Tiga Lapis (Next.js SSR + License Middleware + Backend Tak Tersentuh)

## Context

Backend trading bot v1.6.46+ sudah matang (95 file Python, 28K LOC, 30+ endpoint API, 5 tabel PostgreSQL, 432+ tes hijau). Mesin kecerdasan — pipeline SMC/Wyckoff/QM/AO + AI advisor via OpenRouter — sudah proven dan sedang akumulasi track record.

Abdullah ingin mengkomersialkan sistem ini **tanpa menyentuh satu baris pun** logika scalper/advisor/risk (lapis Mesin Utama = "angsa bertelur emas"). Rencana ini membangun dua lapis tambahan di atas backend yang ada:

1. **License Middleware** — gerbang keamanan, autentikasi multi-user, billing, kill-switch otomatis, proxy data terfilter.
2. **Next.js SSR Frontend** — dua portal (Admin untuk Abdullah, Client read-only untuk pelanggan).

Model bisnis target = **gabungan Model 1 + Model 2**:
- **Model A (Lisensi VPS Instalasi Tertutup)** — klien HNWI mendapat VPS dengan backend Python yang di-obfuscate (PyArmor), OpenRouter key milik klien. Setup USD 3K–7.5K + pemeliharaan USD 150–300/bulan.
- **Model B (PAMM/Signal Sentral)** — klien retail subscribe ke master account Abdullah untuk view-only dashboard + CopyTrade. Profit sharing 20–30% atau langganan USD 49–149/bulan.

Satu middleware, satu database user, satu Next.js app — melayani kedua model secara paralel lewat `subscription_type` enum yang extensible.

**Prasyarat pra-launch (WAJIB diselesaikan SEBELUM membuka penjualan):**
- 3–6 bulan live trading di akun real, terverifikasi publik via MyFxBook atau MQL5 Signals
- Maximum drawdown terdokumentasi < 15%
- Stress test 3 bulan kontinu untuk deteksi kebocoran memori (pytest + uvicorn stress + tracemalloc)
- Kontrak SLA + disclaimer risiko finansial dari pengacara (via CV Babah Digital)

---

## Arsitektur Target

```
╔══════════════════════════════════════════════════════════════╗
║  SERVER PUSAT ABDULLAH (babahdigital.net — IP publik baru)  ║
║                                                              ║
║  ┌────────────────────────────────────────────────────────┐ ║
║  │  Nginx (TLS via Let's Encrypt, reverse proxy, HSTS)    │ ║
║  └────────────────────────────────────────────────────────┘ ║
║           ↓                                                  ║
║  ┌────────────────────────────────────────────────────────┐ ║
║  │  Next.js 14 App (SSR, App Router)                      │ ║
║  │  ├── Frontend Pages (SSR + RSC)                        │ ║
║  │  │   ├── /admin/*   (Portal Admin, protected)          │ ║
║  │  │   └── /portal/*  (Portal Klien, read-only)          │ ║
║  │  └── API Routes (License Middleware)                   │ ║
║  │      ├── /api/auth/*         (JWT login/refresh)       │ ║
║  │      ├── /api/licenses/*     (CRUD Model A)            │ ║
║  │      ├── /api/subscriptions/* (CRUD Model B)           │ ║
║  │      ├── /api/vps/*          (VPS registry)            │ ║
║  │      ├── /api/proxy/*        (Forward ke backend klien)│ ║
║  │      └── /api/admin/*        (Kill-switch, audit)      │ ║
║  └────────────────────────────────────────────────────────┘ ║
║           ↓ (Prisma ORM)                                    ║
║  ┌────────────────────────────────────────────────────────┐ ║
║  │  PostgreSQL 16 — Middleware DB (terpisah total)        │ ║
║  │  users, licenses, subscriptions, vps_instances,        │ ║
║  │  audit_logs, login_sessions, kill_switch_events        │ ║
║  └────────────────────────────────────────────────────────┘ ║
║                                                              ║
║  ┌────────────────────────────────────────────────────────┐ ║
║  │  Cron Worker (node-cron dalam Next.js server)          │ ║
║  │  ├── 00:01 WITA — kill-switch lisensi expired          │ ║
║  │  ├── tiap 5 menit — health check VPS klien             │ ║
║  │  └── tiap jam — aggregate PAMM metrics                 │ ║
║  └────────────────────────────────────────────────────────┘ ║
║                                                              ║
║  ┌────────────────────────────────────────────────────────┐ ║
║  │  Master Trading Backend (untuk Model B / PAMM)         │ ║
║  │  docker-compose.yml EXISTING (tidak diubah)            │ ║
║  │  Backend Python + PostgreSQL trading + OPEC relay      │ ║
║  │  MT5 EA di 147.93.156.219 (Windows ZMQ)                │ ║
║  └────────────────────────────────────────────────────────┘ ║
╚══════════════════════════════════════════════════════════════╝
        ↓ (HTTPS, admin_token per-VPS)
╔══════════════════════════════════════════════════════════════╗
║  PER-KLIEN VPS (Model A, 1 instance per klien HNWI)         ║
║  ┌────────────────────────────────────────────────────────┐ ║
║  │  Nginx (TLS, IP whitelist: hanya server pusat + klien) │ ║
║  └────────────────────────────────────────────────────────┘ ║
║  ┌────────────────────────────────────────────────────────┐ ║
║  │  Docker: trading-backend (PyArmor obfuscated .py)      │ ║
║  │  Docker: trading-db (PostgreSQL untuk data trading)    │ ║
║  │  Docker: trading-opec-relay                            │ ║
║  │  MT5 EA (Windows VM atau instance Windows terpisah)    │ ║
║  └────────────────────────────────────────────────────────┘ ║
╚══════════════════════════════════════════════════════════════╝
```

**Kunci desain:**
- Mesin Utama Python **tidak disentuh** di semua VPS — hanya di-obfuscate dengan PyArmor, Dockerfile multistage.
- License Middleware mengakses backend klien pakai `API_ADMIN_TOKEN` yang di-generate per-VPS (tersimpan terenkripsi di `vps_instances.admin_token_ciphertext`, AES-256-GCM dengan kunci master di Vault / env `LICENSE_MW_MASTER_KEY`).
- Klien **tidak pernah dapat admin_token** — semua panggilan ke backend klien di-proxy via middleware yang menyuntikkan token.
- Frontend klien **hanya bicara dengan middleware**, bukan langsung ke backend.

---

## Phase 0 — Prasyarat Non-Teknis (Paralel dengan Phase 1–5)

| Aktivitas | Deliverable | Status Awal |
|-----------|-------------|-------------|
| Daftar MyFxBook, hubungkan akun produksi | URL publik track record | Belum |
| Akumulasi 90+ hari live data | Equity curve, DD, PF, Sharpe | Sedang berlangsung v1.6.46+ |
| Legal review (CV Babah Digital) | Kontrak SLA, risk disclaimer, terms of service | Belum |
| Domain + DNS (babahdigital.net) | A record, MX record | Sudah aktif sebagian |
| Sertifikat TLS (Let's Encrypt wildcard) | Certbot deployment | Belum |

---

## Phase 1 — Backend API Extension (1–2 minggu)

Target: menambah 4 endpoint data yang dibutuhkan dashboard. **Tidak ada perubahan logika trading** — hanya query ke tabel yang sudah ada.

### File yang dimodifikasi

- `src/main.py` — tambah 4 route baru
- `src/reports.py` — extend `build_daily_report()` menjadi `build_performance_summary()` untuk agregasi multi-hari

### Endpoint yang ditambahkan

| Endpoint | Query dari tabel | Fields utama |
|----------|------------------|--------------|
| `GET /api/equity/history?days=30` | `equity_snapshots` | `[{recorded_at, equity, balance, free_margin, open_trades}]` |
| `GET /api/trades/history?days=30&pair=XAUUSD&setup=ai_momentum&status=closed` | `trades` | Full trade row + computed `duration_minutes`, `r_multiple` |
| `GET /api/chart/bars/{pair}/{tf}?from=<iso>&to=<iso>&limit=500` | `market_bars` | `[{time: unix, open, high, low, close, volume}]` format Lightweight Charts |
| `GET /api/performance/summary?days=30` | aggregate `trades` + `equity_snapshots` | `{win_rate, profit_factor, total_pnl, max_drawdown_pct, total_trades, best_day, worst_day, sharpe_approx, avg_trade_duration_minutes, pair_breakdown, setup_breakdown, hourly_heatmap}` |

Semua endpoint tetap protected oleh `X-API-Token` (reuse `require_api_token` di [src/security.py:31](src/security.py:31)).

### Reuse yang tersedia

- `EquitySnapshot` ORM model — sudah ada di [src/models.py](src/models.py)
- `Trade` ORM model — sudah ada
- `MarketBar` ORM model — sudah ada dengan index `(pair, timeframe, start_time)` UNIQUE
- `reports.build_daily_report()` di [src/reports.py:749](src/reports.py:749) — refactor untuk range multi-hari, tambah parameter `days`

### Tes regresi

- `tests/test_api_equity_history.py` — cek pagination, filter days, sort kronologis
- `tests/test_api_trades_history.py` — cek filter kombinasi (pair+setup+status), computed fields
- `tests/test_api_performance_summary.py` — cek angka aggregate sesuai manual calculation
- Semua 432+ tes existing WAJIB tetap hijau (non-regression).

---

## Phase 2 — License Middleware Foundation (2 minggu)

### Stack

- Next.js 14 (App Router) + TypeScript 5
- Prisma ORM 5 (migration + query)
- PostgreSQL 16 (instance terpisah, bukan pakai DB trading)
- NextAuth.js v5 (beta) untuk session management
- `jose` untuk JWT signing/verification
- `node-cron` untuk scheduled worker di dalam Next.js server
- `bcrypt` untuk password hashing, `speakeasy` untuk 2FA TOTP (opsional Admin)
- `zod` untuk schema validation
- `pino` untuk structured logging

### Struktur monorepo

```
C:\Users\Lenovo\Projek\trading-commercial\
├── apps/
│   └── web/                    # Next.js 14 (frontend + middleware API)
│       ├── app/
│       │   ├── (admin)/        # Admin portal routes
│       │   ├── (portal)/       # Client portal routes
│       │   ├── (auth)/         # Login, register
│       │   └── api/            # License Middleware API routes
│       ├── lib/
│       │   ├── auth/           # JWT, NextAuth config
│       │   ├── db/             # Prisma client
│       │   ├── proxy/          # VPS proxy + token encryption
│       │   ├── cron/           # kill-switch worker
│       │   └── pyarmor/        # Deployment script generator
│       ├── prisma/
│       │   └── schema.prisma
│       └── middleware.ts       # Edge-level auth guard
├── packages/
│   ├── shared-types/           # Zod schemas + TS types
│   └── ui/                     # Shadcn/UI components
├── docker/
│   ├── vps-client/             # Dockerfile untuk VPS klien (dengan PyArmor)
│   └── master/                 # Dockerfile untuk master backend (Model B)
└── pnpm-workspace.yaml
```

### Database schema (Prisma)

```prisma
// prisma/schema.prisma
model User {
  id             String   @id @default(cuid())
  email          String   @unique
  passwordHash   String
  role           Role     @default(CLIENT)  // ADMIN | CLIENT
  mt5Account     String?  @unique           // Untuk klien Model A
  twoFaSecret    String?  // TOTP (opsional admin)
  createdAt      DateTime @default(now())
  lastLoginAt    DateTime?
  licenses       License[]
  subscriptions  Subscription[]
  sessions       Session[]
}

enum Role { ADMIN CLIENT }

model License {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  licenseKey      String   @unique       // format: TRAD-XXXX-XXXX-XXXX-XXXX
  type            LicenseType            // VPS_INSTALLATION | PAMM_SUBSCRIBER | SIGNAL_SUBSCRIBER
  vpsInstanceId   String?                // Null untuk PAMM/Signal
  vpsInstance     VpsInstance? @relation(fields: [vpsInstanceId], references: [id])
  status          LicenseStatus @default(PENDING)  // PENDING | ACTIVE | EXPIRED | REVOKED | SUSPENDED
  startsAt        DateTime
  expiresAt       DateTime
  autoRenew       Boolean  @default(false)
  metadata        Json     // setup_fee, monthly_fee, payment_history, MT5 account details
  createdAt       DateTime @default(now())
  revokedAt       DateTime?
  killSwitchEvents KillSwitchEvent[]
  auditLogs       AuditLog[]
  @@index([status, expiresAt])
}

enum LicenseType { VPS_INSTALLATION PAMM_SUBSCRIBER SIGNAL_SUBSCRIBER }
enum LicenseStatus { PENDING ACTIVE EXPIRED REVOKED SUSPENDED }

model VpsInstance {
  id                  String   @id @default(cuid())
  name                String   // contoh: "client-a-vps-sg"
  host                String   // IP atau hostname
  port                Int      @default(8000)
  backendBaseUrl      String   // https://vps-clientA.babahdigital.net
  adminTokenCiphertext String  // AES-256-GCM terenkripsi dengan LICENSE_MW_MASTER_KEY
  adminTokenIv        String   // IV untuk AES
  adminTokenTag       String   // auth tag GCM
  sshHost             String?  // untuk deployment & maintenance
  sshPort             Int?     @default(1983)
  sshUser             String?
  status              VpsStatus @default(PROVISIONING)  // PROVISIONING | ONLINE | OFFLINE | SUSPENDED
  lastHealthCheckAt   DateTime?
  lastHealthStatus    String?  // "ok" | "degraded" | "unreachable"
  notes               String?  @db.Text
  licenses            License[]
  healthChecks        HealthCheck[]
  createdAt           DateTime @default(now())
}

enum VpsStatus { PROVISIONING ONLINE OFFLINE SUSPENDED }

model Subscription {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  tier            SubscriptionTier  // PAMM_BASIC | PAMM_PRO | SIGNAL_BASIC | SIGNAL_VIP
  status          LicenseStatus
  startsAt        DateTime
  expiresAt       DateTime
  profitSharePct  Decimal?  @db.Decimal(5, 2)  // untuk PAMM
  monthlyFeeUsd   Decimal?  @db.Decimal(10, 2) // untuk Signal
  brokerAccountId String?   // bila PAMM, akun broker subscriber
  metadata        Json
  createdAt       DateTime @default(now())
}

enum SubscriptionTier { PAMM_BASIC PAMM_PRO SIGNAL_BASIC SIGNAL_VIP }

model KillSwitchEvent {
  id          String   @id @default(cuid())
  licenseId   String
  license     License  @relation(fields: [licenseId], references: [id])
  triggeredBy String   // "cron_expiry" | "admin_manual" | "compliance" | "payment_failure"
  triggeredAt DateTime @default(now())
  apiResponse Json     // response dari POST /api/scalping/stop
  success     Boolean
  errorMessage String?
}

model HealthCheck {
  id              String   @id @default(cuid())
  vpsInstanceId   String
  vpsInstance     VpsInstance @relation(fields: [vpsInstanceId], references: [id])
  checkedAt       DateTime @default(now())
  httpStatus      Int?
  responseTimeMs  Int?
  zmqConnected    Boolean?
  dbOk            Boolean?
  lastTickAge     Float?
  raw             Json?
}

model AuditLog {
  id          String   @id @default(cuid())
  userId      String?
  licenseId   String?
  license     License? @relation(fields: [licenseId], references: [id])
  action      String   // "login" | "license_created" | "vps_provisioned" | "backend_stop" | ...
  ipAddress   String?
  userAgent   String?
  metadata    Json
  createdAt   DateTime @default(now())
  @@index([userId, createdAt])
  @@index([licenseId, createdAt])
}

model Session {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  jwtId        String   @unique
  refreshToken String   @unique
  ipAddress    String?
  userAgent    String?
  createdAt    DateTime @default(now())
  expiresAt    DateTime
  revokedAt    DateTime?
}
```

### Flow autentikasi

**Model A (VPS Klien) login:**
1. Klien submit `{licenseKey, mt5Account, password}`
2. Middleware verify: license aktif + user.mt5Account cocok + bcrypt password match
3. Issue JWT: `{sub: userId, role: "CLIENT", licenseId, vpsInstanceId, scope: ["read:status", "read:trades", "read:equity"], exp: +15m}` + refresh token 7 hari
4. Session row dibuat, simpan hashed refresh token
5. Audit log: `login`

**Model B (PAMM) login:**
1. Klien submit `{email, password, subscriptionId}`
2. Middleware verify subscription aktif
3. Issue JWT: `{sub: userId, role: "CLIENT", subscriptionId, scope: ["read:pamm_stats"], exp: +15m}`

**Admin login:**
1. Submit `{email, password, totpCode}`
2. Middleware verify 2FA
3. Issue JWT: `{sub: userId, role: "ADMIN", scope: ["*"], exp: +15m}`

### Proxy pattern ke backend klien (Model A)

File: `lib/proxy/vps-client.ts`

```typescript
// Pseudocode structure
export async function proxyToVpsBackend(
  vpsInstanceId: string,
  path: string,
  init: RequestInit
): Promise<Response> {
  const vps = await prisma.vpsInstance.findUniqueOrThrow({ where: { id: vpsInstanceId } });
  if (vps.status !== 'ONLINE') throw new Error('VPS not online');
  
  const adminToken = decryptAdminToken(vps);  // AES-256-GCM decrypt
  
  const url = `${vps.backendBaseUrl}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      ...init.headers,
      'X-API-Token': adminToken,
      'User-Agent': 'license-middleware/1.0',
    },
    signal: AbortSignal.timeout(10_000),
  });
  
  // Audit log setiap panggilan sensitif (stop/start/config patch)
  if (['POST', 'PATCH', 'DELETE'].includes(init.method ?? 'GET')) {
    await auditLog({ licenseId, action: `backend_${init.method}_${path}`, response: response.clone() });
  }
  
  return response;
}
```

### Cron Worker (Kill Switch)

File: `lib/cron/kill-switch.ts`

Jadwal: **00:01 WITA setiap hari**.

Logika:
```
1. Query licenses WHERE status = 'ACTIVE' AND expiresAt <= now()
2. Untuk setiap license:
   a. IF type = VPS_INSTALLATION:
      - proxy POST /api/scalping/stop ke vps.backendBaseUrl
      - update license.status = 'EXPIRED'
      - create KillSwitchEvent
      - kirim notifikasi Telegram ke admin
   b. IF type = PAMM_SUBSCRIBER atau SIGNAL_SUBSCRIBER:
      - update subscription.status = 'EXPIRED'
      - revoke semua JWT session aktif untuk user tsb
      - kirim email warning "akses dashboard Anda berakhir"
3. Log audit summary
```

Tambahan cron 5 menit: health check semua `VpsInstance.status = 'ONLINE'` → simpan ke `HealthCheck` table.

Tambahan cron jam: aggregate PAMM metrics dari master backend → cache di Redis atau in-memory untuk responsivitas dashboard.

### API Routes utama (License Middleware)

```
POST   /api/auth/login              → {licenseKey|email, password, totpCode?} → JWT + refresh
POST   /api/auth/refresh            → refresh JWT
POST   /api/auth/logout             → revoke session

# Admin only
GET    /api/admin/licenses          → list (filter, pagination)
POST   /api/admin/licenses          → generate new license
PATCH  /api/admin/licenses/:id      → update (extend expiry, suspend, revoke)
POST   /api/admin/licenses/:id/revoke → kill switch manual

GET    /api/admin/vps               → list VPS instances
POST   /api/admin/vps               → register new VPS
PATCH  /api/admin/vps/:id           → update (host, status, notes)
POST   /api/admin/vps/:id/rotate-token → rotate admin_token di VPS + update ciphertext

GET    /api/admin/users             → list
POST   /api/admin/users             → create (usually auto-created from license flow)
PATCH  /api/admin/users/:id         → update

GET    /api/admin/audit             → audit log viewer
GET    /api/admin/kill-switch-events → history kill switch
POST   /api/admin/kill-switch/trigger/:licenseId → manual kill

GET    /api/admin/dashboard/overview → aggregate metrics (jumlah klien aktif, expiring 7-hari, total MRR, bot status)

# Client (scoped per license/subscription)
GET    /api/client/status           → proxy /api/scalping/status (filtered)
GET    /api/client/positions        → proxy /api/positions (filtered: sembunyikan lot_audit, commission breakdown)
GET    /api/client/equity/history   → proxy /api/equity/history
GET    /api/client/trades/history   → proxy /api/trades/history (sembunyikan internal signal_data)
GET    /api/client/performance      → proxy /api/performance/summary
GET    /api/client/scanner          → proxy /api/scanner/status (disederhanakan: status aktif/standby/off, tanpa score breakdown)
GET    /api/client/reports/today    → proxy /api/report/today (mode: summary default)

# Public
GET    /api/health                  → middleware health (bukan backend health)
```

### Filtering data untuk klien

File: `lib/proxy/filters.ts` — lapisan penyaring yang menghapus field sensitif sebelum kirim ke klien:

| Endpoint | Field yang DISEMBUNYIKAN |
|----------|-------------------------|
| `/api/client/positions` | `lot_audit`, `entry_commission_usd`, `confluence_score` (internal) |
| `/api/client/trades/history` | `signal_data` (JSON indicator snapshot yang berisi strategy IP), `commission_usd` (gabungkan ke `net_pnl` saja) |
| `/api/client/scanner` | Raw score breakdown (smc_score, wyckoff_score, dll) — ganti dengan label "AKTIF/STANDBY/OFF" |
| `/api/client/status` | `strategy_mode.entry_matrix` (detail engine — IP), `ai_state.last_reasoning` (prompt engineering — IP) |

### Keamanan middleware (checklist)

- [ ] HTTPS only (HSTS, redirect HTTP→HTTPS di Nginx)
- [ ] Rate limit per IP: 10 login/menit, 100 request/menit per session
- [ ] CSRF token pada semua mutation (NextAuth default)
- [ ] Content-Security-Policy strict (nonce-based untuk script)
- [ ] Argon2id atau bcrypt cost 12 untuk password
- [ ] JWT signing pakai ES256 (asymmetric), public key di frontend untuk verify ringan
- [ ] Admin token encryption at rest: AES-256-GCM, master key di `LICENSE_MW_MASTER_KEY` env
- [ ] Audit log append-only (trigger DB untuk reject UPDATE/DELETE)
- [ ] IP whitelist admin portal (opsional, env `ADMIN_IP_WHITELIST`)
- [ ] Session fixation prevention (regenerate session on login)
- [ ] Brute force protection (exponential backoff + account lockout setelah 5 gagal)

---

## Phase 3 — PyArmor + Docker Template untuk VPS Klien (1 minggu, paralel dengan Phase 2)

Target: template deployment otomatis untuk instance VPS klien Model A. Semua kode Python di-obfuscate, kunci lisensi juga diperiksa di level runtime backend (defense-in-depth, tidak ganggu logika trading).

### File baru di repo trading existing

- `docker/Dockerfile.client-vps` — multistage build dengan PyArmor di stage builder
- `docker/docker-compose.client-vps.yml` — varian compose untuk klien (hanya service backend, db, opec-relay + reverse nginx)
- `scripts/build-pyarmor-image.sh` — build image obfuscated, tag `trading-backend-client:<version>`
- `scripts/deploy-to-vps.sh` — SSH ke VPS klien, pull image dari private registry, boot stack

### PyArmor strategi

- PyArmor Pro (lisensi USD 160/tahun — dibayar Abdullah, satu lisensi bisa untuk unlimited target)
- Mode: `--restrict 4 --platform linux.x86_64` + runtime expiration optional
- Obfuscate `src/*.py` kecuali `__init__.py` kosong dan `main.py` (entry point tetap readable untuk uvicorn)
- Include bundle: `pyarmor gen --pack onefile src/` untuk build artifact
- Smoke test wajib: semua endpoint harus tetap berjalan identik dengan plain code → pipeline CI otomatis compare response JSON

### Dockerfile sketch

```dockerfile
# docker/Dockerfile.client-vps
FROM python:3.11-slim AS builder
RUN pip install pyarmor==9.* --no-cache-dir
WORKDIR /build
COPY src/ ./src/
COPY pyproject.toml ./
RUN pyarmor gen \
    --output /pyarmor-out \
    --recursive \
    --restrict 4 \
    --enable-jit \
    src/

FROM python:3.11-slim AS runtime
WORKDIR /app
COPY --from=builder /pyarmor-out /app/src
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY alembic.ini .
COPY alembic/ ./alembic/
# entrypoint yang cek license expiry sebelum start uvicorn
COPY scripts/entrypoint-client.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Defense-in-depth (opsional, tidak mengubah logika scalper)

`scripts/entrypoint-client.sh` — pra-boot:
1. HTTP GET `https://license.babahdigital.net/api/vps/heartbeat?id=<VPS_ID>&fingerprint=<MACHINE_ID>` dengan `VPS_HEARTBEAT_TOKEN`
2. Response berisi `{license_status: "ACTIVE"|"EXPIRED", hard_kill: bool}`
3. IF `hard_kill=true` → exit 1 (container tidak boot)
4. Kalau middleware tidak bisa dijangkau selama >48 jam → fallback ke cached license file dengan expiry
5. Proceed uvicorn

**Catatan:** Ini adalah lapisan pengamanan TAMBAHAN di luar kill-switch via API — supaya klien yang mencoba blokir middleware via firewall tetap kena pemutusan.

### File license dalam VPS klien

- `/app/runtime/license.json` — `{license_key, expires_at, issued_at, machine_fingerprint}`, ditandatangani dengan private key Abdullah (Ed25519), klien tidak bisa edit tanpa detection.
- Verifikasi signature di entrypoint dengan embedded public key (hardcoded dalam PyArmor bundle).

---

## Phase 4 — Admin Portal (2 minggu)

### Pages

| Route | Purpose |
|-------|---------|
| `/admin/login` | Login + 2FA |
| `/admin` | Overview dashboard |
| `/admin/licenses` | Daftar lisensi + filter (type, status, expiring) |
| `/admin/licenses/new` | Generator lisensi (wizard: pilih type → input data klien → generate key) |
| `/admin/licenses/[id]` | Detail + timeline + actions (extend, suspend, revoke, rotate token) |
| `/admin/vps` | Registry VPS instances (status, health, last check) |
| `/admin/vps/[id]` | Detail VPS + control panel (kill switch, restart, rotate token) |
| `/admin/vps/[id]/live` | Live bot control (mirror `/api/scalping/*` + `/api/config`) |
| `/admin/subscriptions` | PAMM + Signal subscriber list |
| `/admin/users` | User management |
| `/admin/audit` | Audit log viewer (filter + search) |
| `/admin/kill-switch` | History semua kill-switch event |
| `/admin/billing` | Placeholder untuk integrasi payment gateway (Phase 6+) |
| `/admin/settings` | 2FA enrollment, IP whitelist, master backend config |

### Komponen kritis

- `<MultiVpsOverview />` — grid card semua VPS klien, real-time status
- `<LicenseGeneratorWizard />` — multistep form (type → user → duration → pricing → confirm)
- `<KillSwitchPanel />` — tombol merah dengan confirmation dialog + pengetikan "KILL-{licenseId}"
- `<EquityCurve />` — Lightweight Charts (open source TradingView)
- `<LivePositionsTable />` — polling 3 detik, status badge per pair
- `<ScannerHeatmap />` — grid 14 pair dengan color-code score
- `<ConfigEditor />` — form dinamis dari schema `/api/config`

### Komponen desain

- Shadcn/UI + Tailwind CSS
- Dark mode default (trading dashboard convention)
- Responsif (minimum target: iPad 1024px, desktop primary)

### State & data fetching

- TanStack Query untuk polling + cache invalidation
- Server Components untuk halaman yang tidak butuh real-time (audit, license list)
- Server Actions untuk mutation (Next.js 14 native)
- WebSocket untuk live positions (opsional Phase 4.5 — masih polling aman sampai 10+ klien)

---

## Phase 5 — Client Portal (2 minggu)

### Pages (Model A — klien VPS)

| Route | Purpose |
|-------|---------|
| `/portal/login` | Login (license key + MT5 account + password) |
| `/portal` | Ringkasan bot + KPI + countdown lisensi |
| `/portal/positions` | Posisi terbuka live |
| `/portal/history` | Riwayat trade + filter + export CSV |
| `/portal/performance` | Analytics (equity curve, setup breakdown disederhanakan jadi "Strategi A/B/C", heatmap jam) |
| `/portal/market` | Scanner status (aktif/standby) + kalender news |
| `/portal/reports` | Daily summary readable |
| `/portal/account` | Info lisensi, riwayat pembayaran, contact support |

### Pages (Model B — klien PAMM/Signal)

| Route | Purpose |
|-------|---------|
| `/portal/pamm` | Ringkasan kinerja master account (equity curve Abdullah) |
| `/portal/pamm/copytrade` | Instruksi setup CopyTrade di broker mereka |
| `/portal/signals` | Feed signal real-time (kalau SIGNAL_SUBSCRIBER) |

### Restriction (role-based)

Middleware `middleware.ts` cek:
- Route `/admin/*` → WAJIB `role=ADMIN`
- Route `/portal/*` → WAJIB `role=CLIENT` + license/subscription ACTIVE
- Semua `/api/admin/*` → WAJIB `role=ADMIN` (double check di route handler)
- Semua `/api/client/*` → WAJIB role CLIENT + scope check + valid license

### Klien TIDAK PUNYA akses ke:

- `POST /api/scalping/start|stop` (hanya admin)
- `PATCH /api/trading/modes` (hanya admin)
- `PATCH /api/config` (hanya admin)
- `POST /api/admin/*` (hanya admin)
- Data internal: `signal_data` JSON, `lot_audit`, `strategy_mode.entry_matrix` detail

---

## Phase 6 — Nginx + TLS + Deployment (3 hari)

### Nginx config (server pusat)

```nginx
server {
    server_name babahdigital.net www.babahdigital.net;
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/babahdigital.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/babahdigital.net/privkey.pem;
    
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    
    location / {
        proxy_pass http://127.0.0.1:3000;  # Next.js
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_http_version 1.1;
    }
    
    # Admin portal hanya boleh dari IP whitelist
    location /admin {
        allow 203.0.113.0/24;  # Abdullah's IP range
        deny all;
        proxy_pass http://127.0.0.1:3000;
    }
}

server {
    listen 80;
    server_name babahdigital.net www.babahdigital.net;
    return 301 https://$host$request_uri;
}
```

### Nginx config per VPS klien

```nginx
server {
    server_name vps-<client_id>.babahdigital.net;
    listen 443 ssl http2;
    
    # HANYA izinkan IP server pusat Abdullah (license middleware)
    allow 147.x.x.x;  # Server pusat IP
    deny all;
    
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
    }
    
    location /health {
        proxy_pass http://127.0.0.1:8000;
    }
}
```

### Deployment

- Server pusat: `docker-compose.yml` dengan `nextjs-app`, `middleware-db` (postgres), `nginx`, `cron-worker` (kalau pisah dari app).
- VPS klien: script `deploy-to-vps.sh` — SSH, pull image dari private Docker registry Abdullah, boot stack.
- CI/CD: GitHub Actions (opsional) atau manual dengan `ansible-playbook` untuk provisioning VPS baru.

---

## File Kritis yang Dibuat / Dimodifikasi

### Modifikasi di repo trading existing (`D:\Data\Projek\trading`)

- [src/main.py](src/main.py) — tambah 4 endpoint baru (equity/history, trades/history, chart/bars, performance/summary)
- [src/reports.py](src/reports.py:749) — extend `build_daily_report()` → `build_performance_summary(days)`
- `tests/test_api_equity_history.py` — BARU
- `tests/test_api_trades_history.py` — BARU
- `tests/test_api_performance_summary.py` — BARU
- `tests/test_api_chart_bars.py` — BARU
- `docker/Dockerfile.client-vps` — BARU (PyArmor multistage)
- `docker/docker-compose.client-vps.yml` — BARU
- `scripts/build-pyarmor-image.sh` — BARU
- `scripts/deploy-to-vps.sh` — BARU
- `scripts/entrypoint-client.sh` — BARU
- `docs/13-komersial-arsitektur.md` — BARU (dokumentasi arsitektur 3-lapis)
- `docs/14-deployment-vps-klien.md` — BARU (runbook provisioning)

### Repo baru (`C:\Users\Lenovo\Projek\trading-commercial`)

Struktur monorepo lengkap di Phase 2 section "Struktur monorepo" di atas. Ringkasan direktori kritis:
- `apps/web/prisma/schema.prisma` — schema database middleware
- `apps/web/app/api/**/*.ts` — semua API routes middleware
- `apps/web/lib/proxy/vps-client.ts` — proxy ke backend klien
- `apps/web/lib/cron/kill-switch.ts` — worker kill switch
- `apps/web/lib/auth/jwt.ts` — JWT issuance/verify
- `apps/web/middleware.ts` — Edge-level auth guard
- `apps/web/app/(admin)/**/*.tsx` — admin portal pages
- `apps/web/app/(portal)/**/*.tsx` — client portal pages

---

## Verification Plan

### Phase 1 (Backend extension)

1. `pytest tests/` → 432+ tes hijau plus 4 tes baru
2. `ruff check src/` → no lint errors
3. Manual test setiap endpoint baru dengan `curl` + token dev, cek struktur JSON
4. Cek kinerja query: `EXPLAIN ANALYZE` untuk `/api/trades/history?days=90` harus <100ms di DB produksi

### Phase 2 (License Middleware)

1. Unit test Prisma schema (seed + query test)
2. Unit test `decryptAdminToken` / `encryptAdminToken` round-trip
3. Unit test JWT sign + verify + expiry
4. Integration test: mock VPS dengan FastAPI dummy → call `proxyToVpsBackend()` → cek token injected + response forwarded
5. Integration test: simulasi cron kill-switch → license expired → cek POST /api/scalping/stop dipanggil + audit log terbuat
6. Security test: try akses `/api/admin/licenses` dengan CLIENT role → 403
7. Rate limit test: 11 login attempts dalam 1 menit → 429

### Phase 3 (PyArmor)

1. Build image: `./scripts/build-pyarmor-image.sh`
2. Smoke test: jalankan container, call semua 30+ endpoint, bandingkan response dengan versi plain
3. Decompile resistance test: `python -c "import dis; dis.dis('src/scalper.pyc')"` harus gagal atau produksi garbage
4. Performa: timing `/api/scalping/status` harus tidak lebih lambat >5% dari plain version
5. Expiry defense test: set `license.json` expired → container gagal start

### Phase 4 (Admin Portal)

1. `npm run build` → no TS errors
2. E2E test dengan Playwright: login admin → generate license → view dashboard → kill switch
3. Visual regression test (Chromatic atau Percy) untuk semua halaman
4. Mobile responsive check (iPad viewport minimum)

### Phase 5 (Client Portal)

1. E2E test login klien Model A → cek tidak bisa akses `/admin/*` (redirect 403)
2. E2E test login klien Model B → cek hanya lihat PAMM data
3. Cek semua field sensitif benar-benar tersembunyi (inspect network response)
4. Test expired license → auto logout + redirect ke renewal page

### Phase 6 (Deployment)

1. TLS A+ di SSL Labs
2. Security headers A+ di securityheaders.com
3. Lighthouse score: Performance ≥90, Accessibility ≥95, Best Practices ≥95
4. Load test dengan `k6`: 50 concurrent users, sustain 10 menit, p95 latency <500ms
5. Disaster recovery test: kill middleware DB → cek backend klien tetap jalan (graceful degradation), cek reconnect otomatis setelah DB up

### End-to-End Scenario Test

**Skenario 1: Onboard klien VPS baru**
1. Admin generate license di `/admin/licenses/new` → dapat licenseKey
2. Provisioning VPS klien (manual atau ansible) + register di `/admin/vps`
3. Deploy backend obfuscated ke VPS klien via `deploy-to-vps.sh`
4. Start backend, verifikasi via health check
5. Klien login di `/portal/login` dengan licenseKey
6. Klien lihat dashboard dengan data live dari VPS mereka sendiri
7. Admin kirim POST start dari `/admin/vps/[id]/live` → bot jalan di VPS klien
8. Tunggu 10 menit, cek equity curve updated

**Skenario 2: License expiry auto kill**
1. Set license `expiresAt = now + 1 menit` di test
2. Tunggu cron 00:01 (atau trigger manual)
3. Cek API call POST `/api/scalping/stop` ke VPS klien
4. Cek license status berubah EXPIRED
5. Cek klien login → ditolak, redirect ke halaman "lisensi berakhir"
6. Cek backend VPS klien: posisi terbuka ditutup rapi sesuai protokol existing

**Skenario 3: Klien PAMM subscribe**
1. Admin generate PAMM subscription
2. Klien login di `/portal/login` dengan email + password
3. Dashboard menampilkan kinerja master account (bukan bot klien — mereka tidak punya bot sendiri)
4. Klien lihat instruksi CopyTrade di `/portal/pamm/copytrade`
5. Expired subscription → dashboard auto disabled, tapi master bot tetap jalan

---

## Risks & Mitigations

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| Middleware DB down → tidak ada auth → semua klien offline | Tinggi | Primary-replica PostgreSQL + health probe + graceful degradation (cached JWT valid selama 15 menit) |
| Master key `LICENSE_MW_MASTER_KEY` bocor → semua admin_token VPS bisa di-decrypt | Kritis | HSM atau AWS KMS, rotasi berkala, monitoring akses master key, audit log |
| Klien reverse engineer PyArmor | Sedang | PyArmor Pro mode restrict 4 + machine fingerprint + runtime license check + legal NDA |
| Abdullah IP blocked oleh klien (mereka blokir middleware dari firewall VPS) | Sedang | Entrypoint heartbeat dengan grace period 48 jam, setelah itu hard kill defensif di entrypoint |
| Backend klien crash, klien marah tidak bisa lihat dashboard | Rendah | Client portal punya state "Backend tidak dapat dijangkau" dengan last-known-good data dari cache middleware |
| Bill shock di OpenRouter dari klien | Tinggi bagi klien | `/portal/account` tampilkan budget monitor per OpenRouter API call, kirim alert email di 80% budget |
| Lisensi di-share antar klien | Sedang | Machine fingerprint hardware + IP klien tracking + 1 license = 1 concurrent session |
| Kompetitor copy Next.js UI | Rendah | UI bukan moat — algoritma + track record adalah moat. Kompetitor tidak punya 3-6 bulan MyFxBook Abdullah |
| Regulator Indonesia (OJK) anggap ini "manajer investasi" tanpa izin | Tinggi (Model B) | Konsultasi legal via CV Babah Digital sebelum launch Model B. Model A relatif aman karena klien eksekusi sendiri di akun mereka |

---

## Sequencing Ringkas

```
Minggu 1-2    : Phase 1 (Backend API extension)           [repo trading existing]
Minggu 3-4    : Phase 2 (License Middleware foundation)   [repo trading-commercial baru]
Minggu 3-4    : Phase 3 (PyArmor Dockerfile)              [repo trading existing, paralel]
Minggu 5-6    : Phase 4 (Admin Portal)
Minggu 7-8    : Phase 5 (Client Portal)
Minggu 9      : Phase 6 (Nginx + TLS + deployment)
Minggu 10     : End-to-end testing + onboard klien pertama
```

Paralel Phase 0 (track record MyFxBook + legal review) sepanjang 10 minggu.

**Milestone go/no-go:**
- Akhir Minggu 2: Phase 1 selesai, 4 endpoint baru live di dev
- Akhir Minggu 4: Middleware dapat issue JWT, kill switch cron tes pass di staging
- Akhir Minggu 6: Admin portal MVP bisa generate license + control VPS dummy
- Akhir Minggu 8: Client portal bisa login + lihat dashboard real
- Akhir Minggu 10: Klien pertama onboarded (demo internal atau beta user)

---

## Keputusan yang Belum Dikunci (Untuk Diskusi Lanjutan Saat Eksekusi)

1. **Payment gateway** — Midtrans, Xendit, atau Stripe? (Phase 6+, setelah MVP live)
2. **Email provider** — Resend, SendGrid, atau AWS SES? Untuk notifikasi + magic link login
3. **Private Docker registry** — GitHub Container Registry, Docker Hub private, atau self-hosted Harbor?
4. **Monitoring stack** — Grafana Cloud free tier cukup untuk awal, atau self-host Prometheus + Loki?
5. **CDN untuk frontend** — Cloudflare (gratis), atau Vercel Edge, atau Nginx sendiri?
6. **Backup strategy** — wal-g untuk PostgreSQL, frekuensi harian + off-site?
7. **2FA untuk klien** — wajibkan TOTP, atau opsional SMS/email OTP? (trade-off keamanan vs UX)
8. **Master account funding untuk Model B** — berapa modal awal Abdullah deposit? Ini load-bearing untuk kredibilitas PAMM.

Semuanya bisa ditunda sampai MVP Phase 1–5 selesai. Tidak memblokir jalur kritis.