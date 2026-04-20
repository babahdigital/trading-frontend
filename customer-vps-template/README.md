# Customer VPS Template

Docker-based template untuk deploy BabahAlgo customer VPS per tier.

## Architecture

6 services per customer VPS:

| Service | Image | Purpose |
|---------|-------|---------|
| `trading-backend` | `ghcr.io/babahdigital/trading-backend:v1.6.51` | FastAPI trading engine |
| `trading-db` | `postgres:15-alpine` | PostgreSQL (seeded from VPS1) |
| `redis` | `redis:7-alpine` | Message broker, cache |
| `license-middleware` | `ghcr.io/babahdigital/customer-license-mw:latest` | Polls VPS2 `/api/license/check` every 15 min |
| `customer-telegram-bot` | `ghcr.io/babahdigital/customer-telegram-bot:latest` | Per-customer Telegram bot (Phase 3) |
| `nginx` | `nginx:alpine` | Reverse proxy + SSL |

## Directory Layout

```
customer-vps-template/
├── Dockerfile.customer-backend     # Overlay on v1.6.51 base image
├── docker-compose.customer.yml     # 6-service orchestration
├── .env.customer.template          # Env template (copy + fill per customer)
├── nginx.conf                      # Reverse proxy config
├── README.md                       # This file
├── license-middleware/             # Python service (built from source)
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── service.py
│   ├── config.py
│   ├── client.py
│   ├── hmac_signer.py
│   ├── logger.py
│   └── tests/
├── scripts/                        # Provisioning scripts
│   ├── provision.sh                # Main orchestrator (zero → healthy < 30 min)
│   ├── install-docker.sh           # Docker install on Ubuntu 22.04
│   ├── apply-seed.sh               # DB seed from VPS1 bundle
│   ├── verify-health.sh            # Post-install health checks
│   └── rollback.sh                 # Cleanup on failure
└── tests/                          # Integration tests
    ├── test_provision_e2e.sh
    ├── test_license_mw.sh
    └── README.md
```

## Quick Start (Dev / Local)

```bash
cd customer-vps-template

# 1. Copy env template
cp .env.customer.template .env.customer

# 2. Fill required variables (open in editor)
#   - DB_PASSWORD, REDIS_PASSWORD, ADMIN_TOKEN
#   - LICENSE_HMAC_SECRET (must match VPS2 setting)
#   - CUSTOMER_ID, TELEGRAM_BOT_TOKEN, etc.

# 3. Start all services
docker compose -f docker-compose.customer.yml --env-file .env.customer up -d

# 4. Check health (wait ~60s for start_period)
docker compose -f docker-compose.customer.yml ps
curl http://localhost:8000/health
```

## Production Deployment

Use `scripts/provision.sh` — SSH-driven automation from admin machine or VPS2:

```bash
./scripts/provision.sh \
  --customer-id CUST-001 \
  --vps-ip 192.0.2.100 \
  --tier TRADER \
  --admin-token "$(openssl rand -hex 32)" \
  --sync-token "$VPS2_MINTED_SYNC_TOKEN" \
  --seed-url https://api.babahalgo.com/seeds/bundle-latest.tar.gz \
  --telegram-token "$BOTFATHER_TOKEN"
```

Target: zero → healthy customer VPS in < 30 min.

## Build & Push License Middleware Image

The license-middleware image is built from source in this repo:

```bash
cd license-middleware
docker build -t ghcr.io/babahdigital/customer-license-mw:latest .
docker push ghcr.io/babahdigital/customer-license-mw:latest
```

Telegram bot image (Phase 3) follows the same pattern once implemented.

## Health Check

Customer VPS exposes `GET /health` via nginx → trading-backend. Expected response:

```json
{"status":"ok","version":"v1.6.51","customer_id":"CUST-001"}
```

## Troubleshooting

- **Backend unhealthy**: `docker compose logs trading-backend --tail 50`
- **License middleware spam "timeout"**: verify VPS2 `https://babahalgo.com/api/license/check` reachable from VPS
- **DB connection refused**: check `pg_isready` in trading-db container, verify `DB_PASSWORD` matches in .env
- **nginx 502**: backend `start_period` is 60s — wait before calling endpoints after `up -d`

## Related Docs

- `docs/user/PHASE1-VSCODE-AGENT-INSTRUCTIONS.md` — build spec + day-by-day plan
- `docs/user/sop-vps2-customer-portal.md` — VPS2 admin/portal side
- `docs/user/sop-vps1-customer-support.md` — VPS1 API contract
