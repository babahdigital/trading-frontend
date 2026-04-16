# Arsitektur Komersial Zero Trust — Vercel + VPS2 Bridge + VPS1 Backend

> Dokumen ini **menyempurnakan** `frontend.md` (plan v1) dengan topologi 3-node Zero Trust
> yang sudah diputuskan Abdullah: Vercel (frontend SSR) + VPS2 Hostinger (bridge/DB) + VPS1 EPYC (backend trading).
>
> Tanggal: 2026-04-16 | Status: KONSEP v2 | Repo: `D:\Data\Projek\trading-apifrontend`

---

## 1. Perubahan dari Plan v1

| Aspek | Plan v1 (`frontend.md`) | Plan v2 (dokumen ini) |
|-------|------------------------|----------------------|
| Frontend hosting | Nginx di server pusat | **Vercel Edge Network** (CDN global, DDoS built-in, TLS otomatis) |
| Middleware + DB | Same server dengan frontend | **VPS2 terpisah** (`148.230.96.201:1983`, Hostinger) |
| Koneksi Vercel-VPS2 | Direct HTTPS | **Cloudflare Tunnel** (Zero Trust, semua port masuk ditutup) |
| Koneksi VPS2-VPS1 | Belum dibahas | **IP whitelist firewall** (VPS2 static IP satu-satunya yang bisa akses VPS1) |
| Monorepo vs single repo | Monorepo `apps/web + packages/` | **Single repo** (sudah jalan: `trading-apifrontend/`) |

**Mengapa Zero Trust lebih unggul:**
VPS2 bridge TIDAK punya port publik terbuka. `cloudflared` (Cloudflare Tunnel daemon) membuat koneksi keluar ke jaringan Cloudflare, yang kemudian menerima permintaan masuk dari Vercel. Penyerang tidak bisa port-scan VPS2 karena **tidak ada listener di IP publik**. Ini level keamanan setara data center enterprise.

---

## 2. Topologi Produksi (3-Node Zero Trust)

```
                                INTERNET
                                   |
                    +--------------+---------------+
                    |                              |
             Vercel Edge                    Cloudflare Edge
          (Frontend SSR)                   (Tunnel + Access)
          babahdigital.net                 Service Token auth
                    |                              |
                    +----------- HTTPS ------------+
                    |     (Cf-Access-Client-Id      |
                    |      Cf-Access-Client-Secret)  |
                    v                              v
    +-------------------------------------------------+
    |  VPS2 — BRIDGE (148.230.96.201:1983)             |
    |  Hostinger, Ubuntu, SSH user: abdullah            |
    |                                                   |
    |  cloudflared tunnel (NO inbound ports open)       |
    |     |                                             |
    |  PostgreSQL 16 (:5432 localhost only)             |
    |     tables: users, licenses, subscriptions,       |
    |     vps_instances, sessions, audit_logs,           |
    |     kill_switch_events, health_checks              |
    |     |                                             |
    |  Node.js API (Next.js standalone :3000 localhost) |
    |     /api/auth/*        JWT login/refresh          |
    |     /api/admin/*       license CRUD, kill switch  |
    |     /api/client/*      proxy ke VPS1 (filtered)   |
    |     /api/vps/*         VPS registry               |
    |     |                                             |
    |  Cron Worker (node-cron)                          |
    |     00:01 WITA  kill-switch expired licenses      |
    |     */5 *       health check VPS1                 |
    |     0 *         aggregate PAMM metrics            |
    +-------------------------------------------------+
                    |
                    | HTTPS (X-API-Token per-VPS)
                    | Firewall: HANYA dari IP VPS2
                    v
    +-------------------------------------------------+
    |  VPS1 — BACKEND TRADING (tidak disentuh)         |
    |                                                   |
    |  Ubuntu (147.93.156.218:1983)                     |
    |     Docker: trading-backend (:8000)               |
    |     Docker: trading-db (PG16, :5432)              |
    |     Docker: trading-opec-relay (:8010)            |
    |     Docker: openclaw-gateway (:18789)             |
    |                                                   |
    |  Windows (147.93.156.219:1983)                    |
    |     MT5 + ScalperBridge EA                        |
    |     ZMQ PUB :5555, REP :5556                     |
    +-------------------------------------------------+
```

### Alur data klien (Model A — VPS License)

```
Klien browser → Vercel (SSR render) → fetch('/api/client/status')
  → Vercel serverless → POST https://tunnel.babahdigital.net/api/client/status
    → Cloudflare Tunnel → cloudflared di VPS2
      → Next.js API route: verify JWT + cek license ACTIVE
        → proxyToVpsBackend(): decrypt admin_token dari vps_instances
          → HTTPS GET https://vps1-ip:8000/api/scalping/status (X-API-Token: <decrypted>)
            → VPS1 backend respond
          ← filter sensitive fields (signal_data, lot_audit, entry_matrix)
        ← JSON ke Vercel
      ← SSR render HTML
    ← ke browser klien
```

### Alur data klien (Model B — PAMM Subscriber)

```
Klien browser → Vercel → fetch('/api/client/pamm/status')
  → Cloudflare Tunnel → VPS2
    → verify JWT + cek subscription ACTIVE
      → proxy ke MASTER backend (VPS1 milik Abdullah sendiri)
        → GET /api/scalping/status + /api/report/today
      ← filter + aggregate
    ← JSON
  ← SSR render
```

---

## 3. Audit Progress Kode (per 2026-04-16)

### Status keseluruhan: ~30% selesai

| Komponen | Selesai | Sisa |
|----------|---------|------|
| **Prisma schema** (9 model, 6 enum) | 100% | Migration SQL siap deploy |
| **JWT auth** (sign, verify, refresh, cookie) | 95% | Logout route belum ada |
| **Login page** (dual mode: admin + license key) | 100% | UI fungsional |
| **Edge middleware** (role check admin/client) | 100% | License expiry check belum |
| **Admin dashboard** (4 stat cards + API) | 85% | Recent Activity masih placeholder |
| **Admin licenses** (table + generate API) | 80% | Edit/revoke/detail belum, tombol Generate belum wired ke dialog |
| **Admin users** (table + create API) | 80% | Tombol Add User belum wired |
| **Admin VPS** | 5% | Hanya empty state stub |
| **Admin audit / kill-switch / settings** | 5% | Hanya empty state stub |
| **Portal (semua halaman)** | 10% | Semua stub kecuali account (partial) |
| **VPS proxy layer** (`lib/proxy/`) | 0% | Belum ada sama sekali |
| **Kill-switch cron** (`lib/cron/`) | 0% | Belum ada |
| **Cloudflare Tunnel config** | 30% | Script setup ada, config detail belum |
| **Docker** (Dockerfile + compose) | 90% | Siap deploy, tinggal test |
| **Vercel config** | 60% | `vercel.json` ada, env vars belum |
| **Testing** (unit/E2E) | 0% | Tidak ada testing framework |
| **Shadcn/UI components** | 25% | Button, Card, Input ada; Dialog, Tabs, dll belum |

### Bug / issue yang ditemukan

| # | File | Issue | Severity |
|---|------|-------|----------|
| 1 | `src/app/(admin)/admin/page.tsx:112` | Duplikat fungsi `cn()` lokal — seharusnya import `@/lib/utils` | Low |
| 2 | `src/app/(admin)/admin/licenses/page.tsx` | Tombol "Generate License" belum ada `onClick` / dialog | Medium |
| 3 | `src/app/(admin)/admin/users/page.tsx` | Tombol "Add User" belum wired | Medium |
| 4 | `package.json` | 6 Radix UI deps terinstall tapi belum ada komponen Shadcn yang pakai | Low |
| 5 | `src/middleware.ts` | Tidak cek license expiry — klien dengan JWT valid tapi license EXPIRED tetap bisa akses | High |
| 6 | `src/middleware.ts` | Tidak ada rate limiting | Medium |
| 7 | `docker-compose.yml` | DB pakai `host.docker.internal` — asumsi PG16 jalan di host, bukan di container | Info |
| 8 | `.env.example` | `LICENSE_MW_MASTER_KEY` ada tapi `lib/proxy/` (enkripsi/dekripsi) belum ada | Info |
| 9 | Seluruh repo | Belum `npm install`, belum `git init`, belum pernah build | Info |

---

## 4. Masukan Arsitektur

### 4.1 Vercel + Cloudflare Tunnel: Tepat, tapi perlu pemisahan SSR vs API

**Rekomendasi:** Vercel hanya serve halaman SSR + static assets. **Semua API routes (`/api/*`) HARUS jalan di VPS2**, bukan di Vercel serverless functions.

**Alasan:**
- Vercel serverless function punya cold start 250-500ms — buruk untuk polling posisi 3 detik
- Vercel punya batas 10s execution time (Hobby) atau 60s (Pro) — proxy chain ke VPS1 bisa timeout
- Cron worker (node-cron) **tidak bisa jalan di Vercel** — perlu persistent server (VPS2)
- Prisma direct connection ke PostgreSQL VPS2 — harus dari proses yang sama di VPS2

**Solusi arsitektur:**

```
Vercel (babahdigital.net):
  ├── Next.js pages (SSR, RSC) → render HTML
  ├── Server Components fetch data dari VPS2 API
  └── NO API routes di Vercel — redirect /api/* ke VPS2

VPS2 (api.babahdigital.net via Cloudflare Tunnel):
  ├── Next.js standalone (atau Express/Fastify terpisah) → API only
  ├── Prisma → PostgreSQL localhost
  └── Cron worker (same process)
```

**Atau (lebih simple):** Jalankan **SATU Next.js app di VPS2** yang serve SSR + API sekaligus. Vercel **hanya jadi CDN/reverse proxy** via `rewrites` di `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "https://tunnel-id.cfargotunnel.com/$1" }
  ]
}
```

Ini berarti Vercel proxy SEMUA traffic ke VPS2 via Cloudflare Tunnel. Vercel tetap memberikan:
- TLS otomatis di `babahdigital.net`
- DDoS protection
- Global CDN untuk static assets
- Tidak ada cold start (VPS2 always-on)

**Ini pendekatan paling robust. Saya rekomendasikan ini.**

### 4.2 Cloudflare Zero Trust: Konfigurasi detail

**VPS2 setup:**

```bash
# Install cloudflared
curl -L --output cloudflared.deb \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# Login (one-time)
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create trading-bridge

# Config: /etc/cloudflared/config.yml
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json
ingress:
  - hostname: api.babahdigital.net
    service: http://127.0.0.1:3000
    originRequest:
      noTLSVerify: true
  - hostname: trading.babahdigital.net
    service: http://127.0.0.1:3000
  - service: http_status:404

# DNS route
cloudflared tunnel route dns trading-bridge api.babahdigital.net
cloudflared tunnel route dns trading-bridge trading.babahdigital.net

# Run as service
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

**Cloudflare Access Policy (Zero Trust dashboard):**

```
Application: Trading API Bridge
Domain: api.babahdigital.net
Policy:
  - Name: "Vercel Serverless"
    Decision: Allow
    Include:
      - Service Token (Client ID dari Vercel env)
  - Name: "Admin Direct Access"  
    Decision: Allow
    Include:
      - Email: abdullah@babahdigital.net
      - IP: <Abdullah home IP>/32
```

**Vercel env vars:**

```
CF_ACCESS_CLIENT_ID=<dari Cloudflare dashboard>
CF_ACCESS_CLIENT_SECRET=<dari Cloudflare dashboard>
NEXT_PUBLIC_API_URL=https://api.babahdigital.net
```

### 4.3 Firewall VPS1 (backend trading): hanya terima dari VPS2

```bash
# Di VPS1 Ubuntu (147.93.156.218)
# Tutup port 8000 dari publik, buka HANYA dari IP VPS2
sudo ufw default deny incoming
sudo ufw allow from 148.230.96.201 to any port 8000 proto tcp  # VPS2 bridge
sudo ufw allow from 147.93.156.219 to any port 8000 proto tcp  # Windows MT5 (ZMQ)
sudo ufw allow 1983/tcp  # SSH (pertimbangkan whitelist IP juga)
sudo ufw enable
```

### 4.4 Schema Prisma: sudah sinkron 100% dengan plan

Schema di `prisma/schema.prisma` (175 baris, 9 model, 6 enum) **persis sesuai** dengan plan v1. Tidak perlu perubahan schema. Migration SQL juga sudah benar.

Satu catatan: `Subscription.status` pakai enum `LicenseStatus` — ini disengaja (reuse enum), tapi **jika nanti perlu status khusus subscription** (misal `TRIAL`, `GRACE_PERIOD`), akan perlu enum terpisah. Untuk sekarang, cukup.

---

## 5. Prioritas Pekerjaan Tersisa (Urut Kritis)

### Sprint A — Foundation Kritis (1 minggu)

**Tujuan:** Semua jalur kritis berfungsi end-to-end dari browser ke VPS1.

| # | Task | File | Est |
|---|------|------|-----|
| A1 | `lib/proxy/vps-client.ts` — encrypt/decrypt admin token (AES-256-GCM) + proxy fetch ke VPS1 | BARU | 4h |
| A2 | `lib/proxy/filters.ts` — filter field sensitif per endpoint | BARU | 2h |
| A3 | `lib/cron/kill-switch.ts` — cron 00:01 WITA, scan expired, panggil stop | BARU | 3h |
| A4 | `lib/cron/health-check.ts` — cron */5, ping /health VPS1, update HealthCheck | BARU | 2h |
| A5 | `app/api/client/status/route.ts` — proxy /api/scalping/status + filter | BARU | 2h |
| A6 | `app/api/client/positions/route.ts` — proxy /api/positions + filter | BARU | 1h |
| A7 | `app/api/client/equity/route.ts` — proxy /api/equity/history | BARU | 1h |
| A8 | `app/api/auth/logout/route.ts` — revoke session | BARU | 1h |
| A9 | Fix middleware.ts — tambah license expiry check | EDIT | 1h |
| A10 | Tambah rate limiting (sliding window in-memory) | BARU `lib/rate-limit.ts` | 2h |

### Sprint B — Admin Portal Fungsional (1 minggu)

| # | Task | File | Est |
|---|------|------|-----|
| B1 | VPS registry CRUD (list + register + edit + health status) | `app/api/admin/vps/` + `app/(admin)/admin/vps/` | 6h |
| B2 | License generator wizard (dialog multi-step) | `app/(admin)/admin/licenses/new/` + API PATCH | 4h |
| B3 | License detail page (timeline + extend/revoke) | `app/(admin)/admin/licenses/[id]/` | 4h |
| B4 | Kill switch panel (manual trigger + event history) | `app/(admin)/admin/kill-switch/` + API | 4h |
| B5 | Audit log viewer (filter + pagination) | `app/(admin)/admin/audit/` + API | 3h |
| B6 | Shadcn/UI: Dialog, Tabs, Select, Badge, Table, DropdownMenu | `components/ui/` | 3h |
| B7 | Wire "Generate License" + "Add User" tombol yang belum fungsional | EDIT existing | 1h |
| B8 | Fix duplikat `cn()` di admin dashboard | EDIT `page.tsx` | 15m |

### Sprint C — Client Portal Fungsional (1 minggu)

| # | Task | File | Est |
|---|------|------|-----|
| C1 | Install TanStack Query + Lightweight Charts + Recharts | `package.json` | 30m |
| C2 | Portal dashboard: KPI cards + equity curve + bot status live | `app/(portal)/portal/page.tsx` | 6h |
| C3 | Portal positions: live table polling 3s | `app/(portal)/portal/positions/page.tsx` | 3h |
| C4 | Portal history: trade table + filter + CSV export | `app/(portal)/portal/history/page.tsx` | 4h |
| C5 | Portal performance: setup breakdown + heatmap jam | `app/(portal)/portal/performance/page.tsx` | 4h |
| C6 | Portal market: scanner grid simplified | `app/(portal)/portal/market/page.tsx` | 2h |
| C7 | Portal reports: daily summary formatted | `app/(portal)/portal/reports/page.tsx` | 2h |
| C8 | Portal account: license info + countdown timer + payment history | `app/(portal)/portal/account/page.tsx` | 3h |
| C9 | Proxy routes sisa: trades/history, performance, scanner, reports | `app/api/client/*/route.ts` | 3h |

### Sprint D — Deployment + Testing (3-5 hari)

| # | Task | Est |
|---|------|-----|
| D1 | `npm install` + `npm run build` + fix semua TS error | 2h |
| D2 | `git init` + `.gitignore` + commit awal | 30m |
| D3 | Deploy PostgreSQL 16 di VPS2 (`scripts/setup-server.sh` sudah ada) | 1h |
| D4 | Deploy cloudflared di VPS2 (`scripts/setup-tunnel.sh` sudah ada) | 1h |
| D5 | Build Docker image + deploy ke VPS2 | 2h |
| D6 | Konfigurasi Cloudflare Access + Service Token | 1h |
| D7 | Setup Vercel project + env vars + rewrites | 1h |
| D8 | Firewall VPS1: whitelist IP VPS2 only untuk port 8000 | 30m |
| D9 | E2E test: login admin → generate license → cek VPS health → kill switch | 3h |
| D10 | E2E test: login klien → lihat dashboard → posisi live → logout | 2h |
| D11 | Prisma migrate deploy di VPS2 + seed admin user | 30m |

### Sprint E — Backend API Extension di VPS1 (paralel kapan saja)

Perlu ditambahkan di repo **trading** (backend Python) — bukan di repo ini:

| Endpoint | Tabel | Status |
|----------|-------|--------|
| `GET /api/equity/history?days=30` | `equity_snapshots` | BELUM ADA |
| `GET /api/trades/history?days=30&pair=&setup=&status=` | `trades` | BELUM ADA |
| `GET /api/chart/bars/{pair}/{tf}?from=&to=&limit=` | `market_bars` | BELUM ADA |
| `GET /api/performance/summary?days=30` | aggregate | BELUM ADA |

**Catatan:** Klien portal BISA sudah berfungsi dengan endpoint yang SUDAH ADA (`/api/scalping/status`, `/api/positions`, `/api/report/today`, `/api/scanner/status`). Endpoint baru di atas adalah **nice-to-have** untuk chart dan analytics.

---

## 6. Konfigurasi Vercel (Production)

### `vercel.json` (updated)

```json
{
  "buildCommand": "npx prisma generate && next build",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.babahdigital.net/api/:path*"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

**Pendekatan rewrite:** Semua `/api/*` di-proxy ke VPS2 via Cloudflare Tunnel hostname. Vercel serve SSR pages, VPS2 handle semua business logic.

### Environment Variables (Vercel Dashboard)

```
DATABASE_URL=postgresql://trading_user:<pass>@<VPS2_INTERNAL>:5432/trading_commercial
JWT_SECRET=<64 char random>
LICENSE_MW_MASTER_KEY=<32 byte hex untuk AES-256>
NEXT_PUBLIC_APP_URL=https://trading.babahdigital.net
CF_ACCESS_CLIENT_ID=<dari Cloudflare>
CF_ACCESS_CLIENT_SECRET=<dari Cloudflare>
ADMIN_SEED_EMAIL=abdullah@babahdigital.net
ADMIN_SEED_PASSWORD=<bcrypt-hashed di seed, plaintext di env untuk seed saja>
```

---

## 7. Konfigurasi VPS2 Bridge (Docker Production)

### docker-compose.prod.yml (VPS2)

```yaml
services:
  middleware-db:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_DB: trading_commercial
      POSTGRES_USER: trading_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata_mw:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U trading_user -d trading_commercial"]
      interval: 5s
      retries: 5

  app:
    build: .
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      DATABASE_URL: postgresql://trading_user:${DB_PASSWORD}@middleware-db:5432/trading_commercial
      JWT_SECRET: ${JWT_SECRET}
      LICENSE_MW_MASTER_KEY: ${LICENSE_MW_MASTER_KEY}
      NODE_ENV: production
      VPS1_BACKEND_URL: http://147.93.156.218:8000
      VPS1_ADMIN_TOKEN: ${VPS1_ADMIN_TOKEN}
      CLOUDFLARE_TUNNEL_TOKEN: ${CF_TUNNEL_TOKEN}
    depends_on:
      middleware-db:
        condition: service_healthy

volumes:
  pgdata_mw:
```

**Catatan:** `VPS1_ADMIN_TOKEN` adalah fallback untuk master backend (Model B PAMM). Untuk klien Model A, token per-VPS di-decrypt dari `vps_instances.adminTokenCiphertext`.

---

## 8. Keamanan Checklist (Teraupdate)

| Layer | Kontrol | Status Saat Ini | Prioritas |
|-------|---------|----------------|-----------|
| **Network** | Cloudflare Tunnel (no inbound ports VPS2) | Script ada, belum deploy | Sprint D |
| **Network** | UFW firewall VPS1 (whitelist VPS2 IP) | Belum | Sprint D |
| **Network** | Vercel DDoS protection | Otomatis dari Vercel | Done |
| **Transport** | TLS everywhere (Vercel auto + Cloudflare) | Otomatis | Done |
| **Auth** | JWT HS256 + cookie httpOnly | Sudah jalan | Done |
| **Auth** | License expiry check di middleware | **BELUM** | Sprint A (kritis) |
| **Auth** | Rate limiting login | **BELUM** | Sprint A |
| **Auth** | Brute force lockout (5 gagal) | **BELUM** | Sprint A |
| **Auth** | 2FA admin (TOTP) | Schema ready, code belum | Sprint B |
| **Auth** | Session revocation (logout) | Route belum | Sprint A |
| **Data** | Admin token encryption at-rest (AES-256-GCM) | Schema ready, encrypt/decrypt belum | Sprint A |
| **Data** | Response filtering (hide signal_data, lot_audit) | **BELUM** | Sprint A |
| **Data** | Audit log semua mutation | Sebagian (login + user create) | Sprint B |
| **Infra** | CSP headers | Belum | Sprint D |
| **Infra** | HSTS | Via Cloudflare (otomatis) | Done |

---

## 9. Dependency yang Perlu Ditambah

```bash
# Data fetching + caching
npm install @tanstack/react-query

# Charts
npm install lightweight-charts recharts

# Cron (server-side)
npm install node-cron
npm install -D @types/node-cron

# Crypto (admin token encryption)
# Sudah built-in: Node.js crypto module (AES-256-GCM)

# Logging
npm install pino pino-pretty

# Testing (pilih satu)
npm install -D vitest @testing-library/react playwright

# Rate limiting
# Custom in-memory (sudah cukup untuk MVP), atau:
# npm install rate-limiter-flexible
```

---

## 10. Referensi Server Produksi

### VPS1 — Backend Trading (TIDAK DISENTUH)

| Komponen | Alamat | Detail |
|----------|--------|--------|
| Ubuntu backend | `147.93.156.218:1983` (SSH) | Docker: backend :8000, PG16 :5432, OPEC :8010, OpenClaw :18789 |
| Windows MT5 | `147.93.156.219:1983` (SSH) | ZMQ PUB :5555, REP :5556 |
| SSH key | `~/.ssh/id_raspi_ed25519` | Sama untuk kedua server |
| Latency VPS1 internal | ~2ms | Same /22 subnet |

Endpoint backend yang SUDAH ADA dan bisa di-proxy langsung:
- `GET /health` (publik)
- `GET /api/scalping/status` (rich: positions, ai_state, bar_cache, strategy_mode)
- `GET /api/positions` (shortcut posisi terbuka)
- `GET /api/scanner/status` (skor per pair)
- `GET /api/trading/status` (mode engine, setup enable/disable)
- `GET /api/report/today`, `/api/report/yesterday`, `/api/report/daily` (laporan harian)
- `GET /api/config` (runtime config + injected state)
- `GET /api/calendar` (event kalender + session info)
- `GET /api/news` (headline market)
- `GET /api/admin/breaker/status` (catastrophic breaker)
- `GET /api/admin/disparity/today` (advisor vs trade divergence)
- `POST /api/scalping/start`, `POST /api/scalping/stop` (kontrol runtime)
- `PATCH /api/trading/modes` (toggle engine/setup)
- `PATCH /api/config` (patch parameter)

Auth: `X-API-Token: <API_ADMIN_TOKEN>` atau `Authorization: Bearer <API_ADMIN_TOKEN>`
Rate limit backend: 10 calls/60s untuk start, 5/60s untuk breaker reset.

### VPS2 — Bridge (BARU)

| Komponen | Alamat | Detail |
|----------|--------|--------|
| SSH | `148.230.96.201:1983` | User: `abdullah` |
| PostgreSQL | localhost:5432 | DB: `trading_commercial` |
| Next.js app | localhost:3000 | Via Docker atau PM2 |
| Cloudflare Tunnel | `cloudflared` daemon | Hostname: `api.babahdigital.net`, `trading.babahdigital.net` |

### Vercel

| Setting | Nilai |
|---------|-------|
| Domain | `babahdigital.net`, `www.babahdigital.net` |
| Framework | Next.js 14 |
| Build | `npx prisma generate && next build` |
| Rewrite | `/api/*` → `https://api.babahdigital.net/api/*` |

---

## 11. Urutan Eksekusi Ringkas

```
Minggu 1    : Sprint A (foundation kritis: proxy, cron, filter)
Minggu 2    : Sprint B (admin portal fungsional)
Minggu 3    : Sprint C (client portal fungsional)
Minggu 4    : Sprint D (deploy VPS2 + Vercel + Cloudflare + E2E)
Paralel     : Sprint E (backend API extension di VPS1, bisa kapan saja)
```

**Milestone:**
- Akhir Sprint A: proxy VPS1 jalan, kill-switch testable, middleware aman
- Akhir Sprint B: admin bisa generate license + register VPS + trigger kill switch
- Akhir Sprint C: klien bisa login + lihat dashboard real dari VPS1
- Akhir Sprint D: live production di `babahdigital.net` dengan Zero Trust

---

## 12. File yang Dirujuk Dokumen Ini

| File | Fungsi |
|------|--------|
| `dev/frontend.md` | Plan v1 (superseded oleh dokumen ini untuk topologi, tetap valid untuk spec UI) |
| `dev/03-api-endpoints.md` | Referensi endpoint backend Python VPS1 |
| `dev/11-produksi-2-server.md` | Arsitektur produksi VPS1 (Ubuntu + Windows) |
| `prisma/schema.prisma` | Schema DB middleware (9 model, siap deploy) |
| `scripts/setup-server.sh` | Bootstrap PG16 + cloudflared di VPS2 |
| `scripts/setup-tunnel.sh` | Konfigurasi Cloudflare Tunnel |
| `src/middleware.ts` | Edge auth guard (perlu fix: tambah license expiry check) |
| `src/lib/auth/jwt.ts` | JWT sign/verify (sudah fungsional) |
| `docker-compose.yml` | Docker config saat ini (perlu update: pisahkan DB ke container sendiri) |
