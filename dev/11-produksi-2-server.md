# 11 — Produksi 2-Server (Ubuntu + Windows)

Arsitektur produksi memisahkan **MT5 EA** di Windows dan **backend + DB + relay** di Ubuntu Docker.

```
┌─────────────────────────┐         ZMQ tcp://          ┌────────────────────────────┐
│  Windows Server 2025    │  ─────── :5555 PUB ───────▶ │  Ubuntu 24.04 LTS          │
│  147.93.156.219:1983    │  ◀────── :5556 REP ──────── │  147.93.156.218:1983       │
│                         │         (public IP, ~2 ms)  │                            │
│  • MT5 + ScalperBridge  │                             │  Docker Compose:           │
│  • ZMQ bind *:5555/5556 │                             │    trading-db   (PG 16)    │
│  • Auto-logon Trading   │                             │    trading-backend         │
│  • Scheduled Task MT5   │                             │    trading-opec-relay      │
└─────────────────────────┘                             │    trading-openclaw-gateway │
                                                        └────────────────────────────┘
```

## Komponen & Tanggung Jawab

| Server | Komponen | Mode | Persistensi |
| --- | --- | --- | --- |
| **Windows** | MetaTrader 5 | auto-logon + scheduled task | profile & chart tersimpan per user |
| **Windows** | ScalperBridge EA | attach ke chart BTCUSD H1 | persisten via profile MT5 |
| **Ubuntu** | PostgreSQL 16 | Docker container, `restart: always` | volume `pgdata` |
| **Ubuntu** | trading-backend | Docker container, `restart: always` | healthcheck, auto-restart |
| **Ubuntu** | trading-opec-relay | Docker container, `restart: always` | Playwright headless |
| **Ubuntu** | trading-openclaw-gateway | Docker container, `restart: unless-stopped` | Compose terpisah `openclaw/docker-compose.yml` |

## File Konfigurasi

| File | Lokasi | Keterangan |
| --- | --- | --- |
| `docker-compose.prod.yml` | repo root | Compose produksi, default MT5 host 147.93.156.219 |
| `.env.prod` | repo root, **gitignored** | Secrets: DB password, API token, Telegram, OpenRouter |
| `.env` (symlink) | Ubuntu `~/trading/.env` → `.env.prod` | Agar `docker compose` auto-load |
| `openclaw/docker-compose.yml` | repo `openclaw/` | Compose khusus OpenClaw gateway |
| `openclaw/.data/config/openclaw.json` | Ubuntu runtime (gitignored) | Channel Telegram, model default, plugin |
| `openclaw/.data/config/agents/main/agent/auth-profiles.json` | Ubuntu runtime (gitignored) | Kredensial OpenRouter (modern format) |
| `openclaw/.data/config/agents/main/agent/models.json` | Ubuntu runtime (gitignored) | Definisi model OpenRouter |

## Batas Environment

- `.env.prod` adalah source of truth produksi (di-maintain di Ubuntu server).
- **Jangan** sinkronkan token Telegram produksi dari workstation lokal.
- File `.env.prod` lokal (dev) boleh berbeda isinya dari server.
- Telegram demo/lokal dan Telegram produksi wajib dipisah.

---

## Bootstrap Produksi

### A. Ubuntu — Docker Engine

#### 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

#### 2. Upload project

```powershell
# Dari workstation (PowerShell / SSH)
scp -r -P 1983 -i ~/.ssh/key src/ alembic/ db/ opec_relay/ `
  Dockerfile docker-compose.prod.yml requirements.txt alembic.ini `
  user@ubuntu-ip:~/trading/
scp -P 1983 -i ~/.ssh/key .env.prod user@ubuntu-ip:~/trading/
```

#### 3. Buat symlink `.env`

```bash
cd ~/trading && ln -s .env.prod .env
```

#### 4. Start semua container

```bash
cd ~/trading
sudo docker compose -f docker-compose.prod.yml up -d --build
```

#### 5. Restore DB (jika migrasi dari server lama)

```bash
sudo docker cp backup.sql trading-db:/tmp/
sudo docker exec trading-db pg_restore -U trader -d trading -c /tmp/backup.sql
```

### B. Windows — MT5 EA

#### 1. Prasyarat

- MetaTrader 5 terinstall, login akun broker aktif
- **Visual C++ Redistributable 2015-2022 x64** wajib (libzmq.dll butuh `vcruntime140_1.dll`)

#### 2. Install library ZMQ

```
MT5_DATA = %APPDATA%\MetaQuotes\Terminal\<HASH>

Copy:
  MQL5\Include\Mql\Zmq\            ← 8 file .mqh (mql-zmq)
  MQL5\Libraries\libzmq.dll        ← x64
  MQL5\Libraries\libsodium.dll     ← x64
  MQL5\Experts\ScalperBridge.mq5   ← source EA
```

#### 3. Compile EA

Buka MetaEditor → compile `ScalperBridge.mq5` → pastikan 0 error, 0 warning.

#### 4. Attach EA ke chart

- Buka chart apapun (misal BTCUSD H1) — EA stream semua AllowedPairs via OnTimer
- Klik kanan chart → Expert Advisors → ScalperBridge
- Centang **Allow DLL imports** dan **Allow Algo Trading** → OK
- Aktifkan tombol **Algo Trading** di toolbar MT5

#### 5. Konfigurasi headless (tanpa GUI)

```ini
# common.ini → [Experts]
AllowDllImport=1

# chart01.chr → blok <expert> harus ada, expertmode=39
```

`expertmode=39` = 1 (enable) + 2 (live trading) + 4 (DLL) + 32 (auto-enabled).

#### 6. Firewall

```powershell
New-NetFirewallRule -DisplayName "ZMQ PUB 5555" `
  -Direction Inbound -Protocol TCP -LocalPort 5555 `
  -RemoteAddress <ubuntu-ip> -Action Allow
New-NetFirewallRule -DisplayName "ZMQ REP 5556" `
  -Direction Inbound -Protocol TCP -LocalPort 5556 `
  -RemoteAddress <ubuntu-ip> -Action Allow
```

#### 7. Auto-Start MT5 saat Reboot

**Auto-logon** (sesi console aktif tanpa RDP):

```powershell
$reg = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"
Set-ItemProperty $reg -Name AutoAdminLogon -Value "1"
Set-ItemProperty $reg -Name DefaultUserName -Value "Trading"
Set-ItemProperty $reg -Name DefaultPassword -Value "<password>"
```

**Scheduled Task** (ONLOGON, interactive):

```powershell
$action  = New-ScheduledTaskAction -Execute "<path>\terminal64.exe"
$trigger = New-ScheduledTaskTrigger -AtLogon -User "Trading"
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries `
            -DontStopIfGoingOnBatteries -StartWhenAvailable `
            -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName "MT5_AutoStart" -Action $action `
  -Trigger $trigger -Settings $settings -User "Trading" -RunLevel Highest
```

---

## Verifikasi Harian

### Health check backend (dari Ubuntu)

```bash
curl -s http://127.0.0.1:8000/health | python3 -m json.tool | head -5
```

| Field | Nilai sehat | Keterangan |
| --- | --- | --- |
| `zmq.zmq_connected` | `true` | Backend terhubung ke EA |
| `zmq.total_ticks_received` | terus naik | Tick mengalir |
| `zmq.last_tick_age_seconds` | < 2.0 | Tick real-time |
| `zmq.price_reconnects` | 0 atau rendah | Stabil tanpa putus |
| `zmq.pairs_received` | 14 pairs | Semua pair streaming |

### Cek MT5 (dari Windows via SSH)

```powershell
Get-Process terminal64 | Select Id, SessionId, WS
netstat -ano | Select-String "5555|5556"
# Log EA (Print output — di MQL5/Logs, bukan logs/)
Get-Content "$env:APPDATA\MetaQuotes\Terminal\<HASH>\MQL5\Logs\$(Get-Date -f yyyyMMdd).log" -Tail 20
```

### Aktivasi Trading

```bash
curl -X POST http://127.0.0.1:8000/api/scalping/start \
  -H "X-API-Token: <token>" \
  -H "Content-Type: application/json" \
  -d '{"pair": "ALL"}'
```

### Setup Cron Jobs (Otomatis)

Script `ops/setup_openclaw_cron.sh` menginstall semua cron jobs yang dibutuhkan. Idempotent — aman dijalankan berulang.

```bash
cd ~/trading && bash ops/setup_openclaw_cron.sh
```

Jobs yang di-install:

| Waktu UTC | Job | Log |
| --- | --- | --- |
| 00:15 | Adaptive guard (auto-tune parameter) | `tmp/logs/adaptive-guard.log` |
| 08:00 | Disparity audit | `tmp/logs/advisor-disparity-audit.log` |
| 23:59 | Advisor lessons | `tmp/logs/advisor-lessons.log` |

---

## Notifikasi Telegram

Aktif jika `TELEGRAM_BOT_TOKEN` dan `TELEGRAM_CHAT_ID` diisi di `.env.prod`.

| Event | Kapan dikirim |
| --- | --- |
| Backend restart | Hanya jika `scalper_desired_active = true` (bot aktif sebelum restart) |
| EA disconnect | Tick stream hilang > threshold |
| EA reconnect | Tick stream kembali setelah disconnect |
| Trade open/close | Setiap entry/exit |
| Drawdown blocked | Session drawdown guard aktif |
| Order error | Rejection dari broker |
| News alert 1h | 55-65 menit sebelum event high-impact |
| News alert 15m | 12-18 menit sebelum event high-impact |
| News alert result | 3-30 menit setelah release, jika `actual` tersedia dari ForexFactory |
| Adaptive guard | Daily 00:15 UTC, jika parameter di-adjust (via `adaptive-eval` endpoint) |

### Catatan News Alert

- Calendar source: ForexFactory JSON (primary), XML (secondary untuk actual values), TradingEconomics (fallback)
- Calendar refresh interval: 1 jam (default), force-refresh saat ada pending result
- ForexFactory JSON **tidak** menyediakan field `actual` — sistem merge actual dari XML
- Jika actual tidak tersedia dari kedua source setelah 30 menit, result alert dilewati
- Pre-populate saat startup: event yang sudah lewat >30 menit di-mark sent, event <30 menit masuk pending list

> Jika restart Docker tidak menghasilkan notif Telegram, cek `scalper_desired_active` di tabel `scalper_config`. Jika nilainya `false`, bot memang belum aktif sehingga notif restart dilewati — ini **expected behavior**.

---

## Ketahanan Restart Docker

Saat Docker container di-restart atau rebuild, data berikut **tetap aman**:

| Data | Persisten? | Mekanisme |
| --- | --- | --- |
| Candle bars (M5/M15/H1/H4/D1) | ✅ Ya | PostgreSQL `market_bars`, volume `pgdata` |
| Trade history | ✅ Ya | PostgreSQL `trades` |
| Equity snapshots | ✅ Ya | PostgreSQL `equity_snapshots` |
| Runtime config (mode, enabled setups) | ✅ Ya | PostgreSQL `scalper_config` |
| Raw tick data | ❌ Tidak | Memory only, terisi ulang dari tick stream (~menit) |
| In-progress candle (belum close) | ❌ Tidak | Agregasi ulang dari tick stream saat bucket baru dimulai |

Startup flow setelah restart:

1. `load_bar_cache()` — load semua `market_bars` dari DB (~4 detik untuk 35.000+ bar)
2. `_bootstrap_history_from_mt5()` — fetch dari MT5 untuk pair/TF yang kurang dari target
3. Tick stream mulai mengalir — raw tick buffer terisi, candle baru di-persist otomatis

> **Tidak ada warmup block.** Sistem memakai minimum candle guard (M5≥12, M15≥4, H1≥5, H4≥6, D1≥5) dari DB + bootstrap, bukan dari real-time saja. Selama DB punya cukup bar dan MT5 bootstrap berhasil, trading bisa dimulai segera setelah tick pertama.

## Keamanan Timezone

Semua trading logic memakai `datetime.now(timezone.utc)` — tidak ada `datetime.now()` tanpa timezone di path trading:

- `_is_weekend()` → `weekday() >= 5` dari UTC
- `get_market_hours_state()` → konversi ke UTC
- `_weekly_market_open()` → DST-aware forex close (21:00 EDT / 22:00 EST)
- Daily reset → UTC day-of-year
- US market holidays → kalkulasi otomatis per tahun

Container backend menggunakan timezone UTC. Server Ubuntu host memakai `Europe/Berlin (CEST)` tapi **irrelevant** untuk trading logic. Pastikan `System clock synchronized: yes` (`timedatectl`) di host.

---

## Latency & Performa

| Metrik | Nilai | Keterangan |
| --- | --- | --- |
| Network RTT | ~2 ms | Ping antar server (same /22 subnet) |
| Tick age (end-to-end) | 0.2 – 0.5 s | EA → ZMQ → backend |
| EA TickInterval | 500 ms | Rate limiter per pair |
| EA OnTimer | 100 ms | Polling interval |

Tick age 0.2–0.5s optimal untuk scalping intraday. Bottleneck bukan network (~2ms) melainkan EA `TickInterval=500ms` yang sengaja membatasi publish rate per pair.

---

## Troubleshooting

### Backend crash loop (exit code 3)

- Pastikan `docker compose` load `.env.prod` (via symlink `.env` atau flag `--env-file`)
- Tanpa env file → API_ADMIN_TOKEN dan OPENROUTER_API_KEY kosong → crash

### EA `prepare to execution failed`

- `expertmode` di `chart01.chr` harus 39 (termasuk bit DLL)
- `AllowDllImport=1` di `common.ini`
- VC++ Redistributable 2015-2022 x64 harus terinstall

### Port 5555/5556 tidak listen

- MT5 harus jalan di sesi console — cek `query user`
- EA harus terpasang — cek `MQL5/Logs/YYYYMMDD.log`

### Backend connected tapi 0 ticks

- Cek `MT5_PRICE_HOST` di container: harus IP Windows, **bukan** `127.0.0.1`
- Cek firewall Windows: port 5555/5556 open dari IP Ubuntu

### Log backend kosong

- Dockerfile harus punya `ENV PYTHONUNBUFFERED=1`

### News alert tidak kirim notifikasi

- Cek `/api/calendar` → bagian `news_alert`: `running` harus `true`
- Jika `alerts_sent = 0` dan ada event high-impact yang sudah lewat, bot mungkin restart terlalu lama setelah event (>120 menit dari lookback pre-populate = event tidak terlihat)
- ForexFactory sering tidak menyediakan `actual` data — result alert hanya terkirim jika XML source punya actual
- Cek log: `grep -i 'news_alert\|calendar loaded\|Merged' <log>` — "Merged N actual" menandakan XML berhasil melengkapi data

---

## Kebijakan User Windows dan RDP

- User **Trading** khusus untuk MT5 via auto-logon console.
- Jangan pakai user Trading untuk RDP harian — gunakan akun admin terpisah.
- Jika perlu RDP (misal enable Algo Trading pertama kali), logout setelah selesai.

### Audit proses menunjukkan duplicate uvicorn

- audit dengan `check_native_runtime_health.py`
- perhatikan parent-child launcher yang identik; jangan langsung menganggap semua duplikasi sebagai insiden runtime ganda

### Setelah reboot, MT5 hidup tetapi tidak publish semua pair

- cek chart/input EA
- cek `AllowedPairs`
- cek Market Watch dan symbol visibility

## Update Produksi

### Koneksi SSH dari Workstation

```bash
# Ubuntu server
ssh -i ~/.ssh/id_raspi_ed25519 abdullah@147.93.156.218 -p 1983

# Windows server
ssh -i ~/.ssh/id_raspi_ed25519 Trading@147.93.156.219 -p 1983
```

### Upload source ke Ubuntu

```powershell
# Upload file individual
scp -i ~/.ssh/id_raspi_ed25519 -P 1983 src/calendar.py src/news_alert.py `
  abdullah@147.93.156.218:/tmp/

# SSH: copy ke project & rebuild
ssh -i ~/.ssh/id_raspi_ed25519 abdullah@147.93.156.218 -p 1983
cp /tmp/calendar.py ~/trading/src/calendar.py
cp /tmp/news_alert.py ~/trading/src/news_alert.py
cd ~/trading && sudo docker compose -f docker-compose.prod.yml up -d --build trading-backend
```

### Jika hanya kode backend yang berubah

- Upload file yang berubah via `scp` ke Ubuntu server
- Copy ke `~/trading/src/`
- Rebuild & restart:
  ```bash
  cd ~/trading
  sudo docker compose -f docker-compose.prod.yml up -d --build trading-backend
  ```
- Verifikasi:
  ```bash
  # Tunggu ~15 detik untuk startup
  curl -s http://127.0.0.1:8000/health | python3 -m json.tool | head -5
  curl -s -H "Authorization: Bearer <TOKEN>" \
    http://127.0.0.1:8000/api/scalping/status | python3 -m json.tool | head -10
  ```

### Jika perlu re-start bot trading setelah rebuild

```bash
curl -X POST http://127.0.0.1:8000/api/scalping/start \
  -H "X-API-Token: <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"pair": "ALL"}'
```

Bot akan auto-start jika `scalper_desired_active = true` di database. Jika tidak, panggil endpoint start di atas.

### Jika skill atau gateway berubah

```powershell
python openclaw/scripts/restart_gateway_with_env.py
```

### Jika asset MT5 berubah

```powershell
python scripts/manage_mt5_bridge.py --mode repair
python scripts/manage_mt5_bridge.py --mode inspect
```

## Aturan yang Tidak Boleh Dilanggar

1. Jangan jadikan workstation lokal sebagai source of truth Telegram produksi.
2. Jangan gunakan terminal interaktif sebagai launcher permanen produksi.
3. Jangan mengubah user/profile MT5 seenaknya setelah EA attach.
4. Jangan menyimpulkan bridge sehat hanya dari compile sukses; cari `ea_connected=true` atau state inspect yang memang mendukung.
5. Jangan edit `openclaw/.data/config/` langsung dari workstation lokal — selalu edit di server produksi atau via provision script.

---

## OpenClaw Gateway (Container ke-4)

OpenClaw adalah control plane operator: baca status backend, trigger start/stop, kirim report via Telegram. **Bukan** pengambil keputusan entry — itu tetap dari risiko engine Python.

### Arsitektur

- Compose terpisah: `openclaw/docker-compose.yml` (bukan bagian `docker-compose.prod.yml`)
- Image: `ghcr.io/openclaw/openclaw:latest` (pre-built, tidak build lokal)
- Port: `127.0.0.1:18789` (loopback only)
- Skills: bind-mount `openclaw/skills/` ke container (read-only)
- Akses backend: via `host.docker.internal:8000` (`extra_hosts` resolve otomatis di Linux Docker)

### Config Runtime (Production)

```
~/trading/openclaw/.data/config/
├── openclaw.json                          # channel, model, plugin
├── .env                                   # OPENCLAW_GATEWAY_TOKEN (auto-generated)
└── agents/main/agent/
    ├── auth-profiles.json                 # OpenRouter key (modern format)
    └── models.json                        # Model definitions
```

**auth-profiles.json HARUS punya `type` field** — tanpa ini, credential diabaikan tanpa error yang jelas:

```json
{
  "version": 1,
  "profiles": {
    "openrouter:manual": {
      "type": "api_key",
      "provider": "openrouter",
      "key": "sk-or-v1-..."
    }
  }
}
```

### Provision Config (Pertama Kali / Setelah Reset)

```bash
# SSH ke Ubuntu
ssh -i ~/.ssh/id_raspi_ed25519 abdullah@147.93.156.218 -p 1983

# Jalankan provision (baca secret dari .env, tulis config)
cd ~/trading && bash ops/provision_openclaw_config.sh

# Start gateway
sudo docker compose -f openclaw/docker-compose.yml up -d --force-recreate openclaw-gateway
```

### Restart Gateway (Sehari-hari)

```bash
# Dari Ubuntu server
cd ~/trading
sudo docker compose -f openclaw/docker-compose.yml up -d --force-recreate openclaw-gateway
```

Atau via helper Python (dari server atau lokal jika config sudah benar):

```bash
python openclaw/scripts/restart_gateway_with_env.py
```

### Health Check

```bash
# Liveness (unauthenticated)
curl -fsS http://127.0.0.1:18789/healthz

# Status container
sudo docker compose -f openclaw/docker-compose.yml ps

# Logs (cek model dan auth)
sudo docker compose -f openclaw/docker-compose.yml logs --tail=30 openclaw-gateway | grep -iE 'agent model|Missing auth|ready|telegram'

# Deep health (butuh token)
python openclaw/scripts/manage_openclaw_docker.py health
```

**Healthy output** harus menunjukkan:
- `agent model: openrouter/google/gemini-2.5-flash` (BUKAN `openai/gpt-5.4`)
- `Providers w/ OAuth/tokens (1)` (BUKAN `(0)`)
- `telegram` di daftar plugin aktif

### Codex Re-Merge (Known Issue)

Gateway re-merge built-in models (termasuk codex/OpenAI) setiap container recreate. Mitigasi:

1. `provision_openclaw_config.sh` pin `agents.defaults.model.primary` ke OpenRouter
2. `models.json` hanya berisi provider OpenRouter
3. Setelah restart, **verifikasi** log: `agent model: openrouter/...` — jika masih `openai/gpt-5.4`, re-run provision lalu restart lagi

### Rotate OpenRouter Key

```bash
# 1. Update key di .env
nano ~/trading/.env  # edit OPENROUTER_API_KEY

# 2. Re-provision auth
bash ops/provision_openclaw_config.sh

# 3. Restart gateway
sudo docker compose -f openclaw/docker-compose.yml up -d --force-recreate openclaw-gateway

# 4. Verifikasi
sudo docker compose -f openclaw/docker-compose.yml logs --tail=10 openclaw-gateway | grep -i 'Missing auth'
```

**PENTING**: OpenClaw juga menyimpan key di `auth-profiles.json` — key di `.env` environment var **tidak cukup**, harus juga di-update via provision script.

### Troubleshooting OpenClaw

#### Bot Telegram tidak merespons

1. Cek `auth-profiles.json` punya `"type": "api_key"` (bukan format lama tanpa type)
2. Cek `openclaw.json` punya `agents.defaults.model.primary` (bukan fallback ke codex)
3. Cek log: `grep -i 'Missing auth\|invalid_type\|agent model' <log>`
4. Full post-mortem: lihat `docs/report-openclaw-telegram-fix.md`

#### Gateway unhealthy / restart loop

1. Cek RAM server — build/run butuh minimum 2 GB
2. Cek `docker logs trading-openclaw-gateway --tail=50`
3. Cek volume mount permissions: `ls -la ~/trading/openclaw/.data/config/`

#### auth-profiles.json corrupt

```bash
# Re-generate dari provision script
cd ~/trading && bash ops/provision_openclaw_config.sh
# Verify
cat ~/trading/openclaw/.data/config/agents/main/agent/auth-profiles.json | python3 -m json.tool
```

---

## Backtesting di Produksi

Backtesting bisa dijalankan langsung di container backend Ubuntu — tidak perlu install Python atau dependencies di host.

Referensi lengkap: [`docs/13-backtesting.md`](13-backtesting.md)

### Quick Reference

```bash
# SSH ke Ubuntu
ssh -i ~/.ssh/id_raspi_ed25519 abdullah@147.93.156.218 -p 1983

# Backtest satu setup (paling sering dipakai saat tuning)
sudo docker compose -f docker-compose.prod.yml exec -T trading-backend \
  python scripts/backtest_single_setup.py wyckoff_combo --days 7

# Backtest satu setup pada pair tertentu
sudo docker compose -f docker-compose.prod.yml exec -T trading-backend \
  python scripts/backtest_single_setup.py smc --pairs XAUUSD --days 21

# Audit 7D (multi-window 1D + 3D + 7D)
sudo docker compose -f docker-compose.prod.yml exec -T trading-backend \
  python scripts/run_7d_audit.py

# Audit 21D lengkap (no-averaging vs averaging)
sudo docker compose -f docker-compose.prod.yml exec -T trading-backend \
  python scripts/run_21d_audit.py

# Simpan output ke file di container, lalu ambil
sudo docker compose -f docker-compose.prod.yml exec -T trading-backend \
  python scripts/backtest_single_setup.py qm_ao_combo --days 21 \
    --output tmp/qm_ao_21d.json
sudo docker cp trading-backend:/app/tmp/qm_ao_21d.json ~/qm_ao_21d.json
```

### Setup yang Tersedia

`astronacci`, `smc`, `smc_swing`, `qm_ao_combo`, `wyckoff_combo`, `oil_gas`, `ai_momentum`

Alias lama tetap diterima: `sr_retest` → `qm_ao_combo`, `snd_reversal` → `wyckoff_combo`.