# 03 - API Endpoints

Dokumen ini merangkum endpoint publik yang aktif di `src/main.py`.

## Base URL dan Auth

- Base URL default: `http://localhost:8000`
- Semua endpoint `/api/*` memerlukan salah satu header berikut:

```text
X-API-Token: <API_ADMIN_TOKEN>
Authorization: Bearer <API_ADMIN_TOKEN>
```

- `GET /health` tetap public.

Contoh PowerShell:

```powershell
$env:API_ADMIN_TOKEN = "isi_token"
curl.exe -H "X-API-Token: $env:API_ADMIN_TOKEN" http://localhost:8000/api/scalping/status
```

## Endpoint Control Runtime

| Method | Path | Keterangan |
| --- | --- | --- |
| `POST` | `/api/scalping/start` | Start runtime untuk satu pair atau `ALL`. |
| `POST` | `/api/scalper/start` | Alias kompatibilitas. |
| `POST` | `/api/scalping/stop` | Stop runtime dan tutup posisi yang masih dipegang runtime. |
| `POST` | `/api/scalper/stop` | Alias kompatibilitas. |
| `GET` | `/api/scalping/status` | Status runtime lengkap. |
| `GET` | `/api/scalper/status` | Alias kompatibilitas. |
| `GET` | `/api/trading/status` | Status controller trading, engine, dan entry route. |
| `PATCH` | `/api/trading/modes` | Enable/disable global trading, engine, atau setup tertentu. |
| `GET` | `/api/positions` | Shortcut posisi terbuka dari status runtime. |
| `GET` | `/api/scanner/status` | Snapshot scanner dan pair selection. |

### `POST /api/scalping/start`

Body:

```json
{
  "pair": "EURUSD"
}
```

Aturan penting:

- `pair` boleh salah satu pair streaming atau `ALL`.
- Start akan mempersist `scalping_desired_active=true` dan `scalping_start_pair` ke database.
- Restart backend normal dapat auto-resume dari state ini.

### `POST /api/scalping/stop`

Tanpa body. Stop manual akan mematikan niat auto-resume dengan menyimpan `scalping_desired_active=false`.

### `GET /api/scalping/status`

Contoh payload yang relevan saat ini:

```json
{
  "active": true,
  "pairs": ["BTCUSD", "XAUUSD"],
  "dynamic_pairs": true,
  "open_positions": [
    {
      "ticket": 100084,
      "pair": "BTCUSD",
      "direction": "BUY",
      "lot": 0.02,
      "open_price": 67488.98,
      "mark_price": 67520.15,
      "pnl_pts": 31.2,
      "floating_gross_usd": 0.62,
      "commission_usd": 0.0,
      "floating_net_usd": 0.62,
      "duration_seconds": 240,
      "take_profit": 67650.0,
      "stop_loss": 67380.0,
      "signal_type": "smc",
      "entry_commission_usd": 0.0,
      "lot_audit": {},
      "anchor_tf": "M15",
      "confluence_score": 5
    }
  ],
  "bar_cache": {
    "loaded": true,
    "pairs": 14,
    "counts": {
      "m5": 300,
      "m15": 900,
      "h1": 720,
      "h4": 365,
      "d1": 365
    }
  },
  "strategy_mode": {
    "entry_engine": "shared_ai_runtime",
    "live_entry_whitelist": ["astronacci", "oil_gas", "qm_ao_combo", "smc", "smc_swing", "wyckoff_combo", "ai_momentum"],
    "review_only_entry_types": [],
    "review_intervals_seconds": {
      "flat": 180,
      "with_position": 90
    },
    "structural_thresholds": {
      "htf_wyckoff_override_min_confidence": 0.75
    },
    "scalping_runtime": {
      "entry_matrix": {
        "qm_ao_combo": {
          "intent": "precision_scalp",
          "primary_engine": "quasimodo_plus_ao"
        },
        "smc": {
          "intent": "mechanical_scalp",
          "primary_engine": "smc_price_action"
        }
      }
    },
    "swing_runtime": {
      "entry_matrix": {
        "astronacci": {
          "intent": "timed_swing_reversal",
          "live_entry_enabled": true
        },
        "oil_gas": {
          "intent": "energy_mean_reversion",
          "live_entry_enabled": true
        },
        "ai_momentum": {
          "intent": "continuation",
          "live_entry_enabled": true,
          "mode": "live"
        },
        "wyckoff_combo": {
          "intent": "zone_reversal",
          "live_entry_enabled": true
        },
        "smc_swing": {
          "intent": "htf_structure_entry",
          "live_entry_enabled": true
        }
      },
      "shared_structure_support": {
        "smc": {
          "enabled": true,
          "role": "htf_structure_context"
        }
      }
    }
  },
  "ea_connected": true,
  "ai_state": {
    "last_pair": "BTCUSD",
    "last_action": "HOLD",
    "last_confidence": 0.78,
    "last_entry_type": "smc",
    "last_status": "monitoring",
    "runtime_status": "holding",
    "summary": "AI aktif dan menunggu setup atau aksi berikutnya."
  }
}
```

Hal penting yang perlu diperhatikan:

- `strategy_mode.entry_engine` sekarang selalu `shared_ai_runtime`.
- `live_entry_whitelist` memakai canonical setup key, bukan alias lama.
- Tidak ada lagi field atau telemetry milik lapisan hold lama di payload aktif.
- `open_positions[*].lot_audit` adalah tempat audit lot sizing, bukan field hybrid lama.

### `GET /api/trading/status`

Payload ini berasal dari `src/trading.py` dan lebih cocok untuk audit enable/disable mode.

Contoh ringkas:

```json
{
  "trading_enabled": true,
  "scalping_enabled": true,
  "swing_enabled": true,
  "setups": {
    "astronacci": true,
    "ai_momentum": true,
    "ai_reversion": true,
    "oil_gas": true,
    "wyckoff_combo": true,
    "qm_ao_combo": true,
    "smc": true,
    "smc_swing": true
  },
  "engines": {
    "scalping": {
      "enabled": true,
      "implemented": true,
      "runtime_owner": "shared_ai_runtime",
      "runtime_active": true
    },
    "swing": {
      "enabled": true,
      "implemented": true,
      "runtime_owner": "shared_ai_runtime",
      "runtime_active": true
    }
  },
  "entry_routes": {
    "oil_gas": {
      "engine": "swing",
      "audit_only": false,
      "live_entry_enabled": true,
      "transitional": false
    },
    "ai_momentum": {
      "engine": "swing",
      "audit_only": false,
      "live_entry_enabled": true,
      "transitional": false
    },
    "ai_reversion": {
      "engine": "swing",
      "audit_only": true,
      "live_entry_enabled": false,
      "transitional": false
    },
    "qm_ao_combo": {
      "engine": "scalping",
      "live_entry_enabled": true,
      "audit_only": false
    }
  }
}
```

Current-state normal untuk payload di atas adalah semua setup aktif `true`, kecuali `ai_reversion` yang aktif namun berjalan sebagai `audit_only` (tidak melakukan entry live).

### `PATCH /api/trading/modes`

Body yang didukung:

```json
{
  "trading_enabled": true,
  "scalping_enabled": true,
  "swing_enabled": true,
  "setups": {
    "astronacci": true,
    "oil_gas": true,
    "ai_momentum": false,
    "wyckoff_combo": true,
    "qm_ao_combo": true,
    "smc": true,
    "smc_swing": true
  }
}
```

Catatan:

- `scalper_enabled` masih diterima sebagai alias input untuk `scalping_enabled`.
- Key setup lama seperti `sr_retest` akan dinormalisasi ke canonical key jika valid.

### `GET /api/positions`

Shortcut untuk operator yang hanya perlu posisi terbuka:

```json
{
  "active": true,
  "total_positions": 1,
  "positions": [
    {
      "ticket": 100084,
      "pair": "BTCUSD",
      "direction": "BUY",
      "signal_type": "smc"
    }
  ],
  "equity": 177.63,
  "account_login": 12345678
}
```

## Endpoint Report dan Review

| Method | Path | Keterangan |
| --- | --- | --- |
| `GET` | `/api/report/daily` | Report harian untuk tanggal atau `days_ago`. |
| `GET` | `/api/report/today` | Shortcut report hari ini (WITA). |
| `GET` | `/api/report/yesterday` | Shortcut report kemarin (WITA). |
| `GET` | `/api/report/summary` | Ringkasan harian. |
| `GET` | `/api/report/summary/today` | Shortcut summary hari ini. |
| `GET` | `/api/report/summary/yesterday` | Shortcut summary kemarin. |
| `POST` | `/api/advisor/review` | Review AI berbasis posisi terbuka, recent trades, dan report. |
| `POST` | `/api/advisor/test` | Dummy review AI tanpa MT5, untuk diagnosis prompt/model. |

## Endpoint Config

| Method | Path | Keterangan |
| --- | --- | --- |
| `GET` | `/api/config` | Ambil key-value config persisted + injected active state. |
| `PATCH` | `/api/config` | Patch config tertentu dan reload runtime config. |

Field `PATCH /api/config` yang didukung saat ini:

- `risk_percent`
- `target_pips`
- `max_spread`
- `daily_loss_limit_percent`
- `max_open_positions`
- `min_confidence`
- `pairs`
- `dynamic_pairs`
- `max_active_pairs`
- `scan_interval`

`GET /api/config` juga akan menyuntikkan state runtime berikut agar operator tidak perlu menyusunnya sendiri:

- `scalping_active`
- `scalping_desired_active`
- `scalping_start_pair`
- alias kompatibilitas `scalper_active`, `scalper_desired_active`, `scalper_start_pair`

## Market Context dan Provider

| Method | Path | Keterangan |
| --- | --- | --- |
| `GET` | `/api/calendar` | Snapshot calendar dan session info. |
| `GET` | `/api/news` | Snapshot berita market, opsional filter pair. |
| `GET` | `/api/providers/status` | Status provider calendar, headline, dan relay. |
| `POST` | `/api/news/submit` | Ingest headline dari OpenClaw atau agent eksternal. |

## OpenClaw Runtime Boundary

Backend tidak lagi menyediakan endpoint `POST /api/trade/openclaw`.

Catatan:

- OpenClaw tetap dipakai untuk monitoring, status, report, dan operator control.
- Entry live harus datang dari runtime backend sendiri melalui scanner, AI decision flow, dan guard risk internal.
- Tooling atau skill OpenClaw tidak boleh mengasumsikan lagi adanya jalur one-shot discretionary trade ke backend ini.

## Admin dan Observability

| Method | Path | Keterangan |
| --- | --- | --- |
| `POST` | `/api/advisor/lessons` | Inject daily lesson ke JSONL untuk advisor prompt (gated `advisor_daily_lessons_enabled`). |
| `POST` | `/api/admin/breaker/reset` | Reset catastrophic breaker trip state (gated `catastrophic_breaker_enabled`). |
| `GET` | `/api/admin/disparity/today` | Ambil disparity audit hari ini (advisor decisions vs actual trades). |
| `GET` | `/api/admin/gate-stats` | Gate rejection distribution sejak restart (F2 masukan-25). |
| `POST` | `/api/admin/adaptive-eval` | Trigger adaptive guard evaluation cycle. Auto-adjust 1 parameter berdasarkan 7-day rolling performance (F4 masukan-25). |

### `POST /api/advisor/lessons`

Body:

```json
{
  "date": "2026-04-15",
  "summary": "SMC metals outperformed forex",
  "wins": 5,
  "losses": 2,
  "top_mistake_pattern": "early entry on forex without MTF alignment",
  "confidence": 0.75
}
```

Lesson disimpan sebagai JSONL di `runtime/daily_lessons.jsonl`. Saat `advisor_daily_lessons_enabled=true`, fungsi `load_daily_lessons()` membaca file ini dan menyuntikkan konten ke `user_content` prompt advisor (bukan system prompt).

### `POST /api/admin/breaker/reset`

Tanpa body. Reset trip state catastrophic breaker yang disimpan di `runtime/breaker_state.json`. Hanya perlu dipanggil jika breaker pernah trip (drawdown melewati threshold). Breaker harus diaktifkan dulu via flag `catastrophic_breaker_enabled=true`.

### `GET /api/admin/disparity/today`

Response berisi ringkasan disparitas advisor vs trade aktual 24 jam terakhir:

```json
{
  "period": "24h",
  "total_advisor_decisions": 170,
  "total_trades": 2,
  "agreements": 1,
  "disagreements": 30,
  "agreement_pct": 3.2,
  "pair_stats": {
    "XAUUSD": {"advisor_entries": 45, "actual_trades": 1, "agree": 1, "disagree": 8}
  }
}
```

## Healthcheck

### `GET /health`

Response berisi:

- `status`
- `api_token_configured`
- `scalping_active`
- snapshot `trading`
- status `zmq`
- `pairs_streaming`
- `tick_counts`

Gunakan endpoint ini untuk health probe dasar. Untuk audit strategi dan guard, tetap pakai `/api/scalping/status` atau `/api/trading/status`.