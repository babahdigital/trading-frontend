# Konsep Layout, Chart & Halaman — Guest, Admin, Client Portal

> Dokumen ini mendetailkan **setiap halaman**, **setiap chart**, **setiap komponen data**,
> dan **style responsive** untuk tiga portal: Guest (promosi), Admin, dan Client.
>
> Data source: VPS1 backend Python (30+ endpoint) → VPS2 bridge (proxy+filter) → Frontend SSR.
> Chart library: **Lightweight Charts** (candlestick/equity), **Recharts** (bar/donut/heatmap).

---

## Bagian 1 — Halaman Guest / Promosi (Publik, Tanpa Login)

### Tujuan
Halaman marketing yang menampilkan track record, fitur sistem, dan pricing.
Harus meyakinkan calon klien HNWI bahwa ini **infrastruktur kelas institusional**, bukan bot MT4 biasa.

### Route: `/` (landing page)

#### Layout (top to bottom, full width)

```
┌──────────────────────────────────────────────────────────┐
│  NAVBAR (sticky)                                          │
│  Logo | Features | Performance | Pricing | Login ←btn    │
├──────────────────────────────────────────────────────────┤
│  HERO SECTION (h-screen, gradient dark blue → black)      │
│  ┌──────────────────────────────────────────────────────┐│
│  │ "AI-Powered Quantitative Trading"                     ││
│  │ "Infrastruktur kecerdasan buatan yang menganalisa     ││
│  │  pasar 24/7 dengan presisi institusional."            ││
│  │                                                       ││
│  │ [Lihat Performa →]  [Mulai Sekarang →]               ││
│  │                                                       ││
│  │ 3 metric cards (animated counter):                    ││
│  │ ┌─────────┐ ┌─────────┐ ┌─────────┐                  ││
│  │ │ 14      │ │ 24/7    │ │ <2ms    │                  ││
│  │ │ Pairs   │ │ AI Scan │ │ Latency │                  ││
│  │ └─────────┘ └─────────┘ └─────────┘                  ││
│  └──────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────┤
│  LIVE PERFORMANCE SECTION (#performance)                  │
│  ┌──────────────────────────────────────────────────────┐│
│  │ "Track Record Terverifikasi"                          ││
│  │ subtitle: "Data real-time dari akun produksi"         ││
│  │                                                       ││
│  │ ┌─────────────────────────────────────────────────┐  ││
│  │ │  EQUITY CURVE (Lightweight Charts, area+line)   │  ││
│  │ │  Data: master account equity snapshots 90 hari  │  ││
│  │ │  Overlay: drawdown shading merah transparan     │  ││
│  │ │  Toggle: 30D | 90D | YTD | ALL                 │  ││
│  │ │  Height: 400px desktop, 280px mobile            │  ││
│  │ └─────────────────────────────────────────────────┘  ││
│  │                                                       ││
│  │ 6 KPI cards (2 baris x 3 kolom):                     ││
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐               ││
│  │ │ Win Rate │ │ Profit   │ │ Max DD   │               ││
│  │ │ 67.2%    │ │ Factor   │ │ -8.3%    │               ││
│  │ │ ▲ hijau  │ │ 2.14     │ │ ▼ merah  │               ││
│  │ ├──────────┤ ├──────────┤ ├──────────┤               ││
│  │ │ Total    │ │ Sharpe   │ │ Avg Hold │               ││
│  │ │ Trades   │ │ Ratio    │ │ Duration │               ││
│  │ │ 847      │ │ 1.85     │ │ 47 min   │               ││
│  │ └──────────┘ └──────────┘ └──────────┘               ││
│  │                                                       ││
│  │ MyFxBook embed / link: "Verifikasi independen →"      ││
│  └──────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────┤
│  FEATURES SECTION (#features)                             │
│  ┌──────────────────────────────────────────────────────┐│
│  │ "Teknologi di Balik Setiap Keputusan"                 ││
│  │                                                       ││
│  │ Grid 2x3 feature cards:                               ││
│  │ ┌────────────────┐ ┌────────────────┐ ┌────────────┐ ││
│  │ │ 🧠 AI Advisor │ │ 📊 Multi-TF   │ │ 🛡 Risk    │ ││
│  │ │ Gemini 2.5     │ │ H4→H1→M15→M5  │ │ 12-layer   │ ││
│  │ │ Flash analisa   │ │ confluence     │ │ protection │ ││
│  │ │ setiap pair     │ │ scoring        │ │ system     │ ││
│  │ ├────────────────┤ ├────────────────┤ ├────────────┤ ││
│  │ │ 📈 6 Strategy │ │ 🌐 14 Pairs   │ │ ⚡ <2ms    │ ││
│  │ │ SMC, Wyckoff,  │ │ Forex, Metals, │ │ ZeroMQ     │ ││
│  │ │ Astronacci,    │ │ Energy, Crypto │ │ execution  │ ││
│  │ │ AI Momentum    │ │                │ │ bridge     │ ││
│  │ └────────────────┘ └────────────────┘ └────────────┘ ││
│  └──────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────┤
│  STRATEGY BREAKDOWN SECTION                               │
│  ┌──────────────────────────────────────────────────────┐│
│  │ "Strategi Diversifikasi"                              ││
│  │                                                       ││
│  │ Left: Donut chart (Recharts PieChart)                 ││
│  │   - SMC: 35% trades (hijau)                           ││
│  │   - Wyckoff Combo: 25% (biru)                         ││
│  │   - AI Momentum: 20% (ungu)                           ││
│  │   - Oil & Gas: 10% (oranye)                           ││
│  │   - Astronacci: 5% (cyan)                             ││
│  │   - SMC Swing: 5% (pink)                              ││
│  │                                                       ││
│  │ Right: Horizontal bar chart                            ││
│  │   - Win rate per strategy (67%, 72%, 61%, dll)        ││
│  │   - Color: hijau jika >60%, kuning 50-60%, merah <50% ││
│  └──────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────┤
│  PAIR COVERAGE SECTION                                    │
│  ┌──────────────────────────────────────────────────────┐│
│  │ "14 Instrumen, 4 Kelas Aset"                          ││
│  │                                                       ││
│  │ Grid 4 kolom (kategori):                              ││
│  │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     ││
│  │ │ FOREX   │ │ METALS  │ │ ENERGY  │ │ CRYPTO  │     ││
│  │ │ 7 pairs │ │ 2 pairs │ │ 3 pairs │ │ 2 pairs │     ││
│  │ │ EURUSD  │ │ XAUUSD  │ │ USOIL   │ │ BTCUSD  │     ││
│  │ │ GBPUSD  │ │ XAGUSD  │ │ UKOIL   │ │ ETHUSD  │     ││
│  │ │ USDJPY  │ │         │ │ XNGUSD  │ │         │     ││
│  │ │ AUDUSD  │ │         │ │         │ │         │     ││
│  │ │ USDCHF  │ │         │ │         │ │         │     ││
│  │ │ NZDUSD  │ │         │ │         │ │         │     ││
│  │ │ USDCAD  │ │         │ │         │ │         │     ││
│  │ └─────────┘ └─────────┘ └─────────┘ └─────────┘     ││
│  │                                                       ││
│  │ Di bawah setiap pair: scan window bar (visual)        ││
│  │ contoh: EURUSD ████████░░░░ 07-22 UTC                 ││
│  └──────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────┤
│  RISK MANAGEMENT SECTION                                  │
│  ┌──────────────────────────────────────────────────────┐│
│  │ "12 Lapisan Perlindungan Modal"                       ││
│  │                                                       ││
│  │ Vertical timeline / accordion:                        ││
│  │ 1. Dynamic lot sizing (equity-aware)                  ││
│  │ 2. Catastrophic breaker (auto-stop at -X%)            ││
│  │ 3. Daily loss limit                                   ││
│  │ 4. Max positions per pair                             ││
│  │ 5. Max total positions (tier-based)                   ││
│  │ 6. Protective stop (breakeven ratchet)                ││
│  │ 7. News blackout (high-impact auto-pause)             ││
│  │ 8. Weekend force-close                                ││
│  │ 9. Max hold duration (4 jam hard cap)                 ││
│  │ 10. Cooldown tracker (loss streak pause)              ││
│  │ 11. Spread guard (reject jika spread > threshold)     ││
│  │ 12. Session drawdown guard                            ││
│  └──────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────┤
│  PRICING SECTION (#pricing)                               │
│  ┌──────────────────────────────────────────────────────┐│
│  │ "Pilih Model yang Sesuai"                             ││
│  │                                                       ││
│  │ 3 pricing cards:                                      ││
│  │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   ││
│  │ │ SIGNAL       │ │ PAMM         │ │ VPS LICENSE  │   ││
│  │ │ $49-149/bln  │ │ 20-30%       │ │ $3K-7.5K     │   ││
│  │ │              │ │ profit share │ │ setup fee    │   ││
│  │ │ ✓ Dashboard  │ │ ✓ Dashboard  │ │ ✓ Dedicated  │   ││
│  │ │ ✓ Signals    │ │ ✓ CopyTrade  │ │   VPS        │   ││
│  │ │ ✓ Reports    │ │ ✓ Reports    │ │ ✓ Full bot   │   ││
│  │ │ ✗ Bot access │ │ ✗ Bot access │ │ ✓ Dashboard  │   ││
│  │ │              │ │              │ │ ✓ Support    │   ││
│  │ │ [Daftar →]   │ │ [Daftar →]   │ │ [Hubungi →]  │   ││
│  │ └──────────────┘ └──────────────┘ └──────────────┘   ││
│  │                                                       ││
│  │ * VPS License: +$150-300/bulan maintenance            ││
│  └──────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────┤
│  HOW IT WORKS SECTION                                     │
│  ┌──────────────────────────────────────────────────────┐│
│  │ 4-step visual flow:                                   ││
│  │ 1. Daftar & Pilih Paket                               ││
│  │ 2. Terima Akses Dashboard                             ││
│  │ 3. Bot AI Bekerja 24/7                                ││
│  │ 4. Pantau Profit Real-Time                            ││
│  └──────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────┤
│  FOOTER                                                   │
│  CV Babah Digital | Disclaimer Risiko | Syarat & Ketentuan│
│  "Perdagangan finansial mengandung risiko tinggi..."      │
│  Contact: WhatsApp, Email, Telegram                       │
└──────────────────────────────────────────────────────────┘
```

#### Data yang ditarik (dari VPS1 master account via proxy)

| Komponen | Endpoint VPS1 | Frekuensi | Cache |
|----------|---------------|-----------|-------|
| Equity curve | `GET /api/equity/history?days=90` | ISR 5 menit | Redis/in-memory |
| 6 KPI cards | `GET /api/performance/summary?days=90` | ISR 5 menit | Redis/in-memory |
| Strategy donut | `GET /api/report/daily` (aggregate 90D) | ISR 1 jam | Redis/in-memory |
| Pair coverage | Static (hardcoded dari `SCAN_WINDOWS_UTC`) | Build time | N/A |

**Catatan keamanan:** Halaman guest menggunakan **data yang sudah di-cache dan di-aggregate di VPS2**. Guest TIDAK pernah langsung ke VPS1. Data cache di-refresh oleh cron hourly.

---

## Bagian 2 — Admin Portal (Full Access, Abdullah Only)

### Route: `/admin` — Dashboard Utama

```
┌──────────────────────────────────────────────────────────┐
│  SIDEBAR (240px, collapsible di tablet)                   │
│  Logo                                                     │
│  ─────────                                                │
│  Dashboard      ← active                                  │
│  Licenses                                                 │
│  VPS Instances                                            │
│  Subscriptions                                            │
│  Users                                                    │
│  Audit Log                                                │
│  Kill Switch                                              │
│  Settings                                                 │
│  ─────────                                                │
│  [Logout]                                                 │
├──────────────────────────────────────────────────────────┤
│  MAIN CONTENT                                             │
│                                                           │
│  ┌─── ROW 1: KPI Cards (4 kolom) ────────────────────┐  │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │  │
│  │ │ Active   │ │ VPS      │ │ MRR      │ │ Open   │ │  │
│  │ │ Licenses │ │ Online   │ │ Revenue  │ │ Trades │ │  │
│  │ │ 12/15    │ │ 8/10     │ │ $2,400   │ │ 3      │ │  │
│  │ │ 3 expire │ │ 2 degrad │ │ +12% MoM │ │ +$45   │ │  │
│  │ └──────────┘ └──────────┘ └──────────┘ └────────┘ │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─── ROW 2: 2-col layout ───────────────────────────┐  │
│  │ LEFT (60%): Master Equity Curve                    │  │
│  │ ┌──────────────────────────────────────────────┐   │  │
│  │ │  Lightweight Charts (area + line)             │   │  │
│  │ │  Data: equity_snapshots 30D/90D/YTD           │   │  │
│  │ │  Overlay: drawdown zones merah transparan      │   │  │
│  │ │  Markers: trade entry (▲ hijau) & exit (▼)    │   │  │
│  │ │  Height: 360px                                 │   │  │
│  │ │  Toggle: 7D | 30D | 90D | YTD                 │   │  │
│  │ └──────────────────────────────────────────────┘   │  │
│  │                                                     │  │
│  │ RIGHT (40%): Daily PnL Bar Chart                   │  │
│  │ ┌──────────────────────────────────────────────┐   │  │
│  │ │  Recharts BarChart                            │   │  │
│  │ │  X: tanggal (30 hari terakhir)                │   │  │
│  │ │  Y: USD PnL                                   │   │  │
│  │ │  Color: hijau (profit) / merah (loss)          │   │  │
│  │ │  Hover: tooltip detail (trades, win rate)      │   │  │
│  │ │  Height: 360px                                 │   │  │
│  │ └──────────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─── ROW 3: 2-col layout ───────────────────────────┐  │
│  │ LEFT (50%): Scanner Heatmap (14 pair)              │  │
│  │ ┌──────────────────────────────────────────────┐   │  │
│  │ │  Grid 7x2 atau 4x4                            │   │  │
│  │ │  Setiap cell = 1 pair                          │   │  │
│  │ │  Background: gradient score 0-1                │   │  │
│  │ │    0.0-0.3 = abu/gelap (dormant)               │   │  │
│  │ │    0.3-0.6 = kuning (monitoring)               │   │  │
│  │ │    0.6-0.8 = hijau (ready)                     │   │  │
│  │ │    0.8-1.0 = hijau terang (high conviction)    │   │  │
│  │ │  Inside cell:                                  │   │  │
│  │ │    Pair name (EURUSD)                          │   │  │
│  │ │    Score: 0.78                                 │   │  │
│  │ │    Status dot: ● active / ○ standby            │   │  │
│  │ │  Hover tooltip:                                │   │  │
│  │ │    smc: 0.65 | wyckoff: 0.45 | zone: 0.78     │   │  │
│  │ │    session: active | spread: 1.2 / max 20      │   │  │
│  │ │    reason: "mtf_ready + session_active"         │   │  │
│  │ └──────────────────────────────────────────────┘   │  │
│  │                                                     │  │
│  │ RIGHT (50%): AI State Monitor                      │  │
│  │ ┌──────────────────────────────────────────────┐   │  │
│  │ │  Card per active pair (scrollable vertical)    │   │  │
│  │ │                                                │   │  │
│  │ │  ┌─ XAUUSD ────────────────────────────────┐  │   │  │
│  │ │  │ Status: 🟢 MONITORING                    │  │   │  │
│  │ │  │ Last action: HOLD (conf: 0.78)           │  │   │  │
│  │ │  │ Condition: bullish_mtf                    │  │   │  │
│  │ │  │ Updated: 12s ago                         │  │   │  │
│  │ │  └──────────────────────────────────────────┘  │   │  │
│  │ │  ┌─ EURUSD ────────────────────────────────┐  │   │  │
│  │ │  │ Status: 🟡 BUY SIGNAL (conf: 0.82)      │  │   │  │
│  │ │  │ Entry: smc | TF: M15→M5                 │  │   │  │
│  │ │  │ Updated: 3s ago                          │  │   │  │
│  │ │  └──────────────────────────────────────────┘  │   │  │
│  │ └──────────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─── ROW 4: Live Positions Table ────────────────────┐  │
│  │  Auto-refresh 3 detik (TanStack Query refetchInterval) │
│  │                                                     │  │
│  │  Pair | Dir | Lot | Entry | Mark | PnL $ | PnL pts │  │
│  │  ───────────────────────────────────────────────────│  │
│  │  XAUUSD BUY 0.05 2345.50 2347.80 +$11.50  +230pts │  │
│  │  Duration | SL | TP | Setup | Conf | Risk%          │  │
│  │  12m 34s  2340 2355 smc    0.78   1.2%              │  │
│  │                                                     │  │
│  │  Color row: hijau jika PnL>0, merah jika <0         │  │
│  │  Badge: setup type (SMC=biru, Wyckoff=ungu, dll)    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─── ROW 5: Multi-VPS Status Grid ──────────────────┐  │
│  │  (Hanya muncul jika ada VPS klien terdaftar)       │  │
│  │                                                     │  │
│  │  Grid card per VPS klien:                           │  │
│  │  ┌─ Client A (SG) ─┐ ┌─ Client B (US) ─┐          │  │
│  │  │ 🟢 Online       │ │ 🔴 Offline      │          │  │
│  │  │ Equity: $25,400  │ │ Last seen: 2h   │          │  │
│  │  │ Trades: 2 open   │ │ License: 12d    │          │  │
│  │  │ PnL today: +$120 │ │ [Check →]       │          │  │
│  │  └──────────────────┘ └──────────────────┘          │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─── ROW 6: Upcoming News & Calendar ────────────────┐  │
│  │  Timeline vertical (next 24h high-impact events):   │  │
│  │                                                     │  │
│  │  🔴 14:30 UTC — US CPI (USD) — countdown: 2h 15m   │  │
│  │      Forecast: 3.2% | Previous: 3.5%               │  │
│  │      Pairs affected: EURUSD, GBPUSD, XAUUSD, USOIL │  │
│  │                                                     │  │
│  │  🟡 16:00 UTC — FOMC Minutes (USD) — countdown: 4h  │  │
│  │      Pairs affected: ALL                            │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─── ROW 7: Recent Audit Log (compact) ──────────────┐  │
│  │  Table: Time | User | Action | IP                   │  │
│  │  (sudah ada di kode, tetap pertahankan)             │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

#### Data source mapping

| Komponen | API Route VPS2 | Proxy ke VPS1 | Refresh |
|----------|----------------|---------------|---------|
| KPI cards | `/api/admin/dashboard` | Tidak (query middleware DB) | 60s |
| MRR card | `/api/admin/dashboard` | Tidak (aggregate licenses) | 60s |
| Open Trades card | `/api/client/status` | Ya → `/api/scalping/status` | 10s |
| Equity curve | `/api/client/equity/history` | Ya → `/api/equity/history` | 60s |
| Daily PnL bar | `/api/client/reports/daily` | Ya → `/api/report/daily` (loop 30D) | 5min |
| Scanner heatmap | `/api/client/scanner` | Ya → `/api/scanner/status` | 30s |
| AI state monitor | `/api/client/status` | Ya → `/api/scalping/status` (.ai_state_by_pair) | 5s |
| Live positions | `/api/client/positions` | Ya → `/api/positions` | 3s |
| Multi-VPS grid | `/api/admin/vps` + health | Tidak (middleware DB + health cache) | 30s |
| News calendar | `/api/client/calendar` | Ya → `/api/calendar` | 5min |
| Audit log | `/api/admin/audit` | Tidak (middleware DB) | 30s |

### Route: `/admin/vps/[id]/live` — Live Bot Control (per VPS)

```
┌──────────────────────────────────────────────────────────┐
│  Header: "VPS: Client A (Singapore)" | Status: 🟢 Online │
├──────────────────────────────────────────────────────────┤
│  CONTROL BAR:                                             │
│  [▶ Start Bot]  [⏹ Stop Bot]  [⚙ Config]  [🔴 Kill]    │
├──────────────────────────────────────────────────────────┤
│  SAME layout sebagai admin dashboard ROW 2-7              │
│  TAPI semua data dari VPS klien ini (bukan master)        │
│  Proxy: proxyToVpsBackend(vpsInstanceId, '/api/...')      │
└──────────────────────────────────────────────────────────┘
```

### Route: `/admin/licenses` — Detail Table + Charts

```
┌──────────────────────────────────────────────────────────┐
│  Header: "Licenses" | [+ Generate License] button         │
├──────────────────────────────────────────────────────────┤
│  FILTER BAR: Type [All ▼] | Status [All ▼] | Search      │
├──────────────────────────────────────────────────────────┤
│  ROW 1: 3 mini charts (summary)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                  │
│  │ By Type  │ │ By Status│ │ Expiring │                  │
│  │ Donut    │ │ Donut    │ │ Bar 30D  │                  │
│  │ VPS: 8   │ │ Active:12│ │ ████░░░  │                  │
│  │ PAMM: 5  │ │ Expired:3│ │ per week │                  │
│  │ Signal:2 │ │ Pending:2│ │          │                  │
│  └──────────┘ └──────────┘ └──────────┘                  │
├──────────────────────────────────────────────────────────┤
│  TABLE (sortable, paginated):                             │
│  License Key | Client | Type | Status | Expires | VPS     │
│  TRAD-A1B2.. | Ahmad  | VPS  | 🟢Act  | 30 days | SG-01  │
│  TRAD-C3D4.. | Budi   | PAMM | 🟢Act  | 15 days | -      │
│  TRAD-E5F6.. | Citra  | VPS  | 🔴Exp  | -2 days | JP-03  │
│                                                           │
│  Row click → navigate to /admin/licenses/[id]             │
└──────────────────────────────────────────────────────────┘
```

---

## Bagian 3 — Client Portal (Read-Only, Per Klien)

### Route: `/portal` — Client Dashboard

```
┌──────────────────────────────────────────────────────────┐
│  SIDEBAR (portal version — 7 items)                       │
│  Dashboard | Positions | History | Performance |          │
│  Market | Reports | Account                               │
├──────────────────────────────────────────────────────────┤
│  HEADER BAR:                                              │
│  "Selamat datang, Ahmad" | License: 28 hari tersisa ████░ │
├──────────────────────────────────────────────────────────┤
│  ROW 1: KPI Cards (4 kolom)                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ Bot      │ │ Equity   │ │ Today    │ │ Open     │    │
│  │ Status   │ │          │ │ PnL      │ │ Trades   │    │
│  │ 🟢 Active│ │ $25,400  │ │ +$125.50 │ │ 2        │    │
│  │ 14 pairs │ │ ▲ +2.1%  │ │ 5W / 2L  │ │ +$45.20  │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
│                                                           │
│  Sumber: /api/scalping/status → equity, positions count   │
│  Sumber: /api/report/today → today PnL, wins/losses      │
│  NOTE: Semua data di-filter (tanpa signal_data, lot_audit)│
├──────────────────────────────────────────────────────────┤
│  ROW 2: Equity Curve (full width)                         │
│  ┌──────────────────────────────────────────────────────┐│
│  │  Lightweight Charts — Area chart                      ││
│  │  Data: equity_snapshots 30D (bucketed per 15 menit)   ││
│  │  Color: gradient biru ke transparan                   ││
│  │  Line: #3b82f6 (Tailwind blue-500)                    ││
│  │  Drawdown overlay: merah transparan di bawah garis HWM││
│  │  Toggle: 7D | 30D | 90D                              ││
│  │  Height: 320px desktop, 240px mobile                  ││
│  │                                                       ││
│  │  Tooltip: "15 Apr 14:30 | Equity: $25,400 | DD: -1.2%"│
│  └──────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────┤
│  ROW 3: 2-col                                             │
│  LEFT: Open Positions (compact table)                     │
│  ┌──────────────────────────────────────────────────┐    │
│  │ Pair | Dir | PnL | Duration | Status              │    │
│  │ XAUUSD BUY +$45.20 12m 🟢 Holding                │    │
│  │ EURUSD SELL -$8.50  3m  🟡 Monitoring             │    │
│  │                                                    │    │
│  │ Polling 3s, row flash hijau/merah saat PnL berubah │    │
│  │ NOTE: Lot, SL, TP, commission DISEMBUNYIKAN        │    │
│  └──────────────────────────────────────────────────┘    │
│                                                           │
│  RIGHT: Bot Activity Feed                                 │
│  ┌──────────────────────────────────────────────────┐    │
│  │ Timeline feed (dari ai_state):                     │    │
│  │ 14:32 — XAUUSD: AI mendeteksi peluang beli        │    │
│  │ 14:30 — EURUSD: Memantau struktur pasar            │    │
│  │ 14:25 — BTCUSD: Menunggu konfirmasi multi-timeframe│    │
│  │                                                    │    │
│  │ NOTE: Reasoning detail DISEMBUNYIKAN               │    │
│  │ Label generik dari runtime_status_label             │    │
│  └──────────────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────────┤
│  ROW 4: Daily PnL Mini Bar (7 hari terakhir)              │
│  ┌──────────────────────────────────────────────────────┐│
│  │  Recharts BarChart (compact, h-160px)                 ││
│  │  7 bar: Mon-Sun, hijau/merah                          ││
│  │  Label: "+$125" / "-$30"                              ││
│  └──────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

### Route: `/portal/positions` — Live Positions Detail

```
┌──────────────────────────────────────────────────────────┐
│  Header: "Posisi Terbuka" | Auto-refresh: setiap 3 detik │
├──────────────────────────────────────────────────────────┤
│  TABLE (responsive: card view di mobile):                 │
│                                                           │
│  Desktop columns:                                         │
│  Pair | Arah | Harga Masuk | Harga Saat Ini | PnL ($) |  │
│  PnL (pips) | Durasi | Strategi | Status                 │
│                                                           │
│  Mobile: card per posisi:                                 │
│  ┌─────────────────────────────┐                          │
│  │ XAUUSD — BUY               │                          │
│  │ PnL: +$45.20 (+230 pips)   │                          │
│  │ Durasi: 12 menit           │                          │
│  │ Strategi: Strategi A        │ ← label generik, bukan  │
│  │ Status: 🟢 Holding         │   nama teknis            │
│  └─────────────────────────────┘                          │
│                                                           │
│  Field DISEMBUNYIKAN: lot, SL, TP, commission,            │
│    lot_audit, confluence_score, entry_commission           │
├──────────────────────────────────────────────────────────┤
│  Total Floating PnL: +$36.70 | Posisi: 2                 │
└──────────────────────────────────────────────────────────┘
```

### Route: `/portal/history` — Trade History

```
┌──────────────────────────────────────────────────────────┐
│  Header: "Riwayat Perdagangan"                            │
├──────────────────────────────────────────────────────────┤
│  FILTER BAR:                                              │
│  Periode: [7D | 30D | 90D | Custom]                      │
│  Pair: [Semua ▼]  Strategi: [Semua ▼]  Hasil: [Semua ▼]  │
│  [Export CSV ↓]                                           │
├──────────────────────────────────────────────────────────┤
│  TABLE:                                                   │
│  Tanggal | Pair | Arah | Hasil ($) | Hasil (pips) |      │
│  Durasi | Strategi | Alasan Tutup                         │
│                                                           │
│  Row color: hijau subtle (win), merah subtle (loss)       │
│  Badge alasan: "Take Profit" (hijau), "Stop Loss" (merah) │
│                                                           │
│  Field DISEMBUNYIKAN: lot, open_price, close_price,       │
│    signal_data, commission, equity_before/after            │
├──────────────────────────────────────────────────────────┤
│  CHART di bawah table: Cumulative PnL Line               │
│  ┌──────────────────────────────────────────────────────┐│
│  │  Recharts LineChart                                   ││
│  │  X: trade number (1, 2, 3...)                         ││
│  │  Y: cumulative PnL ($)                                ││
│  │  Color: biru (garis), hijau/merah (fill area)         ││
│  │  Height: 200px                                        ││
│  └──────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

### Route: `/portal/performance` — Analytics

```
┌──────────────────────────────────────────────────────────┐
│  Header: "Analisa Performa"                               │
│  Toggle: [30D | 90D | YTD]                                │
├──────────────────────────────────────────────────────────┤
│  ROW 1: 6 KPI cards                                      │
│  Win Rate | Profit Factor | Avg Win | Avg Loss |          │
│  Best Day | Worst Day                                     │
├──────────────────────────────────────────────────────────┤
│  ROW 2: 2-col                                             │
│                                                           │
│  LEFT: Strategy Donut                                     │
│  ┌──────────────────────────────────┐                     │
│  │  Recharts PieChart (donut)       │                     │
│  │  Segment per strategi:           │                     │
│  │  "Strategi A" (= SMC)     35%   │ ← label generik     │
│  │  "Strategi B" (= Wyckoff) 25%   │   bukan nama teknis │
│  │  "Strategi C" (= Momentum) 20%  │                     │
│  │  "Strategi D" (= Oil&Gas) 10%   │                     │
│  │  "Lainnya"                10%   │                     │
│  │                                  │                     │
│  │  Center: total trades count      │                     │
│  │  Legend: below chart              │                     │
│  └──────────────────────────────────┘                     │
│                                                           │
│  RIGHT: Win Rate per Strategi (horizontal bar)            │
│  ┌──────────────────────────────────┐                     │
│  │  Recharts BarChart (horizontal)  │                     │
│  │  Strategi A ████████████ 72%     │                     │
│  │  Strategi B ██████████░░ 65%     │                     │
│  │  Strategi C ████████░░░░ 58%     │                     │
│  │  Strategi D ██████░░░░░░ 45%     │                     │
│  │                                  │                     │
│  │  Color: hijau >60%, kuning, merah│                     │
│  └──────────────────────────────────┘                     │
├──────────────────────────────────────────────────────────┤
│  ROW 3: Hourly Heatmap                                    │
│  ┌──────────────────────────────────────────────────────┐│
│  │  Grid 24 kolom (jam) x 7 baris (hari minggu)         ││
│  │  Cell color: hijau (profit jam itu) / merah (loss)    ││
│  │  Opacity: semakin gelap = semakin besar PnL           ││
│  │                                                       ││
│  │       00 01 02 03 04 05 06 07 08 09 10 ... 23         ││
│  │  Mon  ░░ ░░ ░░ ░░ ░░ ░░ ░░ ██ ██ ██ ██     ░░        ││
│  │  Tue  ░░ ░░ ░░ ░░ ░░ ░░ ░░ ██ ██ ██ ██     ░░        ││
│  │  ...                                                  ││
│  │                                                       ││
│  │  Data dari: trades.close_time bucketed per jam+hari   ││
│  │  Tooltip: "Tuesday 09:00-10:00 UTC | +$45 | 3 trades"││
│  └──────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────┤
│  ROW 4: Monthly PnL Calendar (GitHub-style)               │
│  ┌──────────────────────────────────────────────────────┐│
│  │  Grid kalender bulan ini                              ││
│  │  Setiap tanggal = kotak kecil                         ││
│  │  Color: hijau (profit hari itu) / merah (loss)        ││
│  │  Opacity: proporsional terhadap magnitude              ││
│  │  Hover: "$125.50 | 5 trades | WR: 80%"               ││
│  │                                                       ││
│  │  ← April 2026 →                                      ││
│  │  Mo Tu We Th Fr Sa Su                                 ││
│  │        1  2  3  4  5  6                               ││
│  │   7  8  9 10 11 12 13                                 ││
│  │  14 15 16 ░░ ░░ ░░ ░░                                 ││
│  └──────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────┤
│  ROW 5: Close Reason Breakdown                            │
│  ┌──────────────────────────────────────────────────────┐│
│  │  Recharts BarChart (vertical):                        ││
│  │  Take Profit: 27 trades (+$1,250)                     ││
│  │  Stop Loss: 8 trades (-$420)                          ││
│  │  Manual Close: 5 trades (+$125)                       ││
│  │  Max Hold Duration: 2 trades (-$50)                   ││
│  └──────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

### Route: `/portal/market` — Scanner & Calendar

```
┌──────────────────────────────────────────────────────────┐
│  Header: "Kondisi Pasar"                                  │
├──────────────────────────────────────────────────────────┤
│  ROW 1: Session Status Bar                                │
│  ┌──────────────────────────────────────────────────────┐│
│  │ Asian: 🟢 Active | London: 🟡 Opening Soon |         ││
│  │ New York: ⚪ Closed | Weekend: ⚪                     ││
│  │ Jam server: 14:32 UTC                                 ││
│  └──────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────┤
│  ROW 2: Pair Grid (simplified untuk klien)                │
│  ┌──────────────────────────────────────────────────────┐│
│  │  Grid 4x4 (14 pair + 2 kosong):                      ││
│  │  Setiap cell:                                         ││
│  │    Pair name: EURUSD                                  ││
│  │    Status: "Aktif" / "Standby" / "Di luar jam"        ││
│  │    Color dot: hijau / kuning / abu                     ││
│  │                                                       ││
│  │  NOTE: Score breakdown (smc, wyckoff, dll)            ││
│  │  DISEMBUNYIKAN — klien hanya lihat status sederhana   ││
│  └──────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────┤
│  ROW 3: Upcoming High-Impact Events (24h)                 │
│  ┌──────────────────────────────────────────────────────┐│
│  │  Card list vertical:                                  ││
│  │  ┌──────────────────────────────────────────────┐    ││
│  │  │ 🔴 US CPI — 14:30 UTC (dalam 2 jam)         │    ││
│  │  │ Currency: USD | Forecast: 3.2% | Prev: 3.5% │    ││
│  │  │ Dampak: EURUSD, XAUUSD, USOIL               │    ││
│  │  └──────────────────────────────────────────────┘    ││
│  └──────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

---

## Bagian 4 — Chart Library & Style Guide

### Chart Library Assignment

| Jenis Chart | Library | Alasan |
|-------------|---------|--------|
| Equity curve (timeseries) | **Lightweight Charts** | Open-source TradingView, optimized untuk financial data, GPU-accelerated, handle 100K+ data points |
| Candlestick (OHLCV) | **Lightweight Charts** | Native support, crosshair, volume histogram |
| Bar chart (PnL, close reason) | **Recharts** | Deklaratif, mudah customize, tooltip built-in |
| Donut/Pie (strategy breakdown) | **Recharts** | PieChart component, label, legend |
| Line chart (cumulative PnL) | **Recharts** | Simple, responsive, area fill |
| Heatmap (hourly, monthly) | **Custom div grid + Tailwind** | Recharts heatmap terlalu rigid; custom grid lebih fleksibel dan ringan |

### Install

```bash
npm install lightweight-charts recharts
npm install -D @types/lightweight-charts
```

### Warna Palette (Dark Mode Default)

```css
/* globals.css — HSL design tokens */
:root {
  /* backgrounds */
  --bg-primary: 222 47% 7%;        /* #0b1120 — main background */
  --bg-card: 222 47% 11%;          /* #141d2e — card surfaces */
  --bg-elevated: 222 47% 14%;      /* #1c2940 — hover, dialogs */
  
  /* text */
  --text-primary: 210 40% 98%;     /* #f8fafc — white text */
  --text-secondary: 215 20% 65%;   /* #94a3b8 — muted text */
  --text-tertiary: 215 14% 45%;    /* #64748b — dimmed */
  
  /* accent: trading colors */
  --profit: 142 76% 50%;           /* #22c55e — green (profit) */
  --loss: 0 84% 60%;               /* #ef4444 — red (loss) */
  --neutral: 213 94% 68%;          /* #60a5fa — blue (neutral/info) */
  --warning: 45 93% 58%;           /* #eab308 — yellow (warning) */
  
  /* chart specific */
  --chart-line: 213 94% 68%;       /* blue-400 — equity line */
  --chart-area: 213 94% 68% / 0.1; /* blue-400 10% opacity — fill */
  --chart-grid: 215 14% 20%;       /* subtle grid lines */
  --chart-crosshair: 215 20% 50%;  /* crosshair color */
}
```

### Tipografi

```css
/* Font: Inter (body) + JetBrains Mono (numbers/code) */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

body { font-family: 'Inter', sans-serif; }
.font-mono, [data-number] { font-family: 'JetBrains Mono', monospace; }

/* Ukuran */
.text-kpi { font-size: 2rem; font-weight: 700; font-variant-numeric: tabular-nums; }
.text-chart-label { font-size: 0.75rem; font-weight: 500; letter-spacing: 0.05em; }
.text-table-cell { font-size: 0.875rem; font-variant-numeric: tabular-nums; }
```

---

## Bagian 5 — Responsive Strategy

### Breakpoints (Tailwind default)

| Breakpoint | Width | Layout |
|------------|-------|--------|
| **Mobile** | < 640px (`sm`) | 1 kolom, sidebar collapse ke bottom nav, chart 240px |
| **Tablet** | 640-1023px (`md`) | 2 kolom, sidebar overlay (hamburger), chart 280px |
| **Desktop** | 1024-1279px (`lg`) | Sidebar + 2-col content, chart 320px |
| **Wide** | 1280px+ (`xl`) | Sidebar + 3-4 col content, chart 400px |

### Mobile Adaptation Rules

1. **Sidebar** → Bottom tab bar (5 icon: Dashboard, Positions, History, Market, Account)
2. **Table** → Card list (setiap row jadi card vertikal)
3. **2-col layout** → Stack vertikal
4. **Scanner heatmap** → Scrollable horizontal, 2 baris
5. **KPI cards** → 2x2 grid (bukan 4 kolom)
6. **Chart height** → 240px (dari 400px)
7. **Equity curve** → Tetap full width, touch-friendly crosshair
8. **Filter bar** → Collapsible accordion

### Implementation Pattern

```tsx
// Contoh responsive grid untuk KPI cards
<div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4">
  {kpiCards.map(card => <KPICard key={card.id} {...card} />)}
</div>

// Contoh responsive chart container
<div className="h-[240px] sm:h-[280px] md:h-[320px] lg:h-[400px]">
  <EquityCurve data={equityData} />
</div>

// Contoh responsive table → card di mobile
<div className="hidden md:block"> {/* Table di desktop */}
  <TradeHistoryTable data={trades} />
</div>
<div className="md:hidden"> {/* Cards di mobile */}
  <TradeHistoryCards data={trades} />
</div>
```

### Sidebar Responsive

```tsx
// Desktop: sidebar tetap
// Tablet: sidebar overlay (toggle via hamburger)
// Mobile: bottom tab bar

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:border-r">
        <SidebarNav />
      </aside>
      
      {/* Main content */}
      <main className="flex-1 overflow-auto pb-16 lg:pb-0">
        {children}
      </main>
      
      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 lg:hidden border-t bg-background">
        <BottomTabBar />
      </nav>
    </div>
  );
}
```

---

## Bagian 6 — Komponen Chart Reusable

### `<EquityCurve />` — Lightweight Charts

```tsx
// Props
interface EquityCurveProps {
  data: { time: number; value: number }[];      // unix timestamp + equity
  drawdown?: { time: number; value: number }[];  // HWM-based drawdown %
  markers?: { time: number; type: 'entry' | 'exit'; label: string }[];
  height?: number;       // default 400
  period?: '7D' | '30D' | '90D' | 'YTD';
  showVolume?: boolean;  // for admin only
}

// Fitur:
// - Area series (gradient fill biru)
// - Drawdown histogram (merah, di bawah)
// - Trade markers (▲ entry, ▼ exit)
// - Crosshair dengan tooltip
// - Period toggle di atas chart
// - Responsive height via container query
```

### `<ScannerHeatmap />` — Custom Grid

```tsx
interface ScannerHeatmapProps {
  pairs: {
    pair: string;
    score: number;        // 0-1
    status: 'active' | 'standby' | 'off';
    breakdown?: {          // admin only, null untuk client
      smc: number;
      wyckoff: number;
      zone: number;
      sr: number;
      session: number;
    };
  }[];
}

// Layout: CSS Grid 4 kolom (desktop), 2 kolom (mobile)
// Cell: rounded-lg, bg-gradient berdasarkan score
// Hover: popover dengan breakdown (admin) atau label sederhana (client)
```

### `<HourlyHeatmap />` — PnL per Jam per Hari

```tsx
interface HourlyHeatmapProps {
  data: { hour: number; day: number; pnl: number; trades: number }[];
}

// Layout: CSS Grid 24 kolom x 7 baris
// Cell: 20x20px desktop, 14x14px mobile
// Color: hijau (profit) / merah (loss), opacity = magnitude
// Tooltip: "Tuesday 09:00 | +$45 | 3 trades"
```

### `<MonthlyCalendar />` — GitHub-style PnL Calendar

```tsx
interface MonthlyCalendarProps {
  data: { date: string; pnl: number; trades: number; winRate: number }[];
  month: number;
  year: number;
}

// Layout: Standard calendar grid 7 kolom
// Cell: rounded-sm, color intensity = |pnl|
// Click: expand detail di bawah calendar
```

### `<LivePositionsTable />` — Auto-refresh

```tsx
interface LivePositionsTableProps {
  positions: Position[];
  mode: 'admin' | 'client';   // admin: full data; client: filtered
  refetchInterval?: number;    // default 3000ms
}

// Fitur:
// - TanStack Query useQuery with refetchInterval: 3000
// - Row flash animation saat PnL berubah (CSS transition)
// - Badge strategi (color-coded)
// - Duration counter (live, client-side setInterval)
// - Mobile: card layout
// - Admin mode: tampilkan lot, SL, TP, commission, lot_audit
// - Client mode: sembunyikan field sensitif
```

---

## Bagian 7 — Data Filter Matrix (Admin vs Client)

| Data | Admin Lihat | Client Lihat | Alasan Disembunyikan |
|------|-------------|--------------|---------------------|
| Equity, balance | Ya | Ya | — |
| Open positions (basic) | Ya | Ya | — |
| Lot size | Ya | **Tidak** | Kekayaan intelektual risk management |
| SL / TP levels | Ya | **Tidak** | Strategi exit = IP |
| Commission breakdown | Ya | **Tidak** | Informasi broker internal |
| `lot_audit` JSON | Ya | **Tidak** | Detail kalkulasi sizing = IP |
| `signal_data` JSON | Ya | **Tidak** | Berisi indicator snapshot = core IP |
| `confluence_score` | Ya | **Tidak** | Scoring internal = IP |
| Scanner score breakdown | Ya (numerik) | **Label saja** (Aktif/Standby) | Algoritma scoring = IP |
| `ai_state.last_reasoning` | Ya | **Tidak** | Prompt engineering = IP |
| `strategy_mode.entry_matrix` | Ya | **Tidak** | Engine architecture = IP |
| Nama strategi teknis | Ya (smc, wyckoff) | **Label generik** (A, B, C) | Metodologi = IP |
| Trade history PnL | Ya (detail) | Ya (USD saja, tanpa pips) | — |
| Entry/exit price | Ya | **Tidak** | Bisa reverse-engineer strategy |
| News calendar | Ya (full) | Ya (high-impact saja) | — |
| Disparity audit | Ya | **Tidak** | Internal quality metric |
| Breaker status | Ya | **Tidak** | Risk parameter internal |
| Config parameters | Ya (editable) | **Tidak** | Operational control |

---

## Bagian 8 — Halaman Guest: Data yang Ditampilkan

### Sumber data (cached di VPS2, refresh tiap jam)

| Metrik | Source Endpoint | Aggregation | Tampilan |
|--------|----------------|-------------|----------|
| Equity curve 90D | `/api/equity/history?days=90` | Bucketed per 4 jam | Area chart |
| Win rate | `/api/performance/summary?days=90` | `.win_rate` | Percentage card |
| Profit factor | Sama | `.profit_factor` | Number card |
| Max drawdown | Sama | `.max_drawdown_pct` | Percentage card (merah) |
| Total trades | Sama | `.total_trades` | Counter card |
| Sharpe ratio | Sama | `.sharpe_approx` | Number card |
| Avg hold duration | Sama | `.avg_trade_duration_minutes` | Time card |
| Strategy breakdown | `/api/report/daily` 90D aggregate | `.entry_type_stats` | Donut + bar chart |
| Strategy win rates | Sama | Per entry_type `.win_rate` | Horizontal bar |

**Catatan penting:**
- Data guest di-cache agresif (ISR 1 jam di VPS2)
- TIDAK ADA real-time data di halaman guest
- Equity curve di-downsample ke ~500 titik (1 per 4 jam x 90 hari)
- MyFxBook embed via iframe atau link eksternal
- Semua angka di-round (win rate: 67%, bukan 67.23%)

---

## Referensi File Terkait

| File | Fungsi |
|------|--------|
| `dev/arsitektur-komersial-zero-trust.md` | Topologi 3-node, proxy, keamanan |
| `dev/frontend.md` | Plan v1, spec UI detail per halaman |
| `dev/03-api-endpoints.md` | Referensi endpoint VPS1 |
| `src/app/(admin)/admin/page.tsx` | Admin dashboard saat ini (perlu upgrade) |
| `src/app/(portal)/portal/page.tsx` | Client dashboard saat ini (stub) |
