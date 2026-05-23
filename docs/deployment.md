# Deployment & Infrastructure

## CI/CD Pipeline

### Workflow: `docker-publish.yml`

```
Push to main (or v* tag)
  |
  v
GitHub Actions (ubuntu-latest)
  |
  +-- 1. Checkout repository
  +-- 2. Setup Docker Buildx
  +-- 3. Login to Docker Hub
  +-- 4. Build multi-stage image (node:20-alpine)
  +-- 5. Push to Docker Hub (babahdigital/babahalgo-frontend)
  |       Tags: latest, sha-<short>, v* (if semver tag)
  v
  +-- 6. SSH into VPS3
  +-- 7. docker compose pull app
  +-- 8. docker compose up -d --force-recreate app
  +-- 9. Post-deploy Docker prune (cleanup old images)
```

### Workflow: `ci.yml`

Quality gate on every push/PR:

```
1. npx prisma generate
2. npx tsc --noEmit        (zero errors)
3. npx next lint            (zero errors)
4. npx next build           (must succeed)
```

### Workflow: `lighthouse-and-a11y.yml`

Lighthouse performance + accessibility checks.

### Workflow: `actions-housekeeping.yml`

GitHub Actions cache and artifact cleanup.

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `DOCKER_USERNAME` | Docker Hub login |
| `DOCKER_PASSWORD` | Docker Hub access token (PAT) |
| `VPS3_SSH_HOST` | 148.230.96.201 |
| `VPS3_SSH_PORT` | 1983 |
| `VPS3_SSH_USER` | abdullah |
| `VPS3_SSH_KEY` | Private key (id_raspi_ed25519, full PEM) |
| `VPS3_DEPLOY_PATH` | /opt/trading-commercial |

---

## Docker Configuration

### Dockerfile (Multi-Stage)

| Stage | Base | Purpose |
|-------|------|---------|
| deps | node:20-alpine | `npm ci` -- dependency installation |
| builder | node:20-alpine | `prisma generate` + `next build` |
| runner | node:20-alpine | Standalone output + minimal runtime |

The runner stage includes:
- Standalone Next.js output (`.next/standalone`)
- Static assets (`.next/static`, `public/`)
- Prisma client binaries (`linux-musl-openssl-3.0.x`)
- Prisma CLI (for startup migrations)
- Sharp (image optimization)
- Non-root user (`nextjs:nodejs`, UID 1001)

### docker-compose.prod.yml

```yaml
services:
  app:
    image: babahdigital/babahalgo-frontend:latest
    ports: ["3000:3000"]
    env_file: .env
    entrypoint: docker-entrypoint.sh
    # Runs: prisma migrate deploy -> node server.js

  db-backup:
    # Nightly pg_dump to /backups volume

  r2-backup:
    # Cloudflare R2 offsite sync (conditional on R2_ENABLED)
```

### docker-entrypoint.sh

Runs automatically at container startup:

1. `npx prisma migrate deploy` -- apply pending migrations
2. `node server.js` -- start Next.js server

---

## Environment Variables

### Core (Required)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://trading_user:pass@host:5432/trading_commercial` |
| `JWT_SECRET` | JWT signing key (HS256) | `openssl rand -base64 64` |
| `ADMIN_EMAIL` | Bootstrap admin email | `admin@babahalgo.com` |
| `ADMIN_PASSWORD` | Bootstrap admin password | (strong password) |
| `NEXT_PUBLIC_APP_URL` | Public-facing URL | `https://babahalgo.com` |
| `LICENSE_MW_MASTER_KEY` | AES-256 key for VPS token encryption | (32-byte hex) |
| `VPS1_BACKEND_URL` | Forex backend URL (via SSH tunnel) | `http://localhost:8101` |

### AI

| Variable | Description |
|----------|-------------|
| `OPENROUTER_API_KEY` | OpenRouter API key (enables all AI features) |

### Payment

| Variable | Description |
|----------|-------------|
| `XENDIT_SECRET_KEY` | Xendit server-side API key |
| `NEXT_PUBLIC_XENDIT_PUBLIC_KEY` | Xendit client-side public key |
| `MIDTRANS_SERVER_KEY` | Midtrans server key (legacy) |

### Notifications

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |
| `FONNTE_TOKEN` | WhatsApp via Fonnte |
| `BREVO_API_KEY` | Brevo email (API transport) |
| `BREVO_SMTP_HOST` | Brevo SMTP host |
| `BREVO_SMTP_PORT` | Brevo SMTP port |
| `BREVO_SMTP_USER` | Brevo SMTP user |
| `BREVO_SMTP_PASS` | Brevo SMTP password |

### Monitoring

| Variable | Description |
|----------|-------------|
| `SENTRY_DSN` | Sentry error tracking DSN |
| `SENTRY_ORG` | Sentry organization |
| `SENTRY_PROJECT` | Sentry project name |

### Workers (Feature Flags)

| Variable | Default | Description |
|----------|---------|-------------|
| `CRON_SECRET` | (required in prod) | Auth for `/api/cron/*` endpoints |
| `ENABLE_SIGNAL_CONSUMER` | `0` | In-process signal consumer |
| `ENABLE_TRADE_EVENTS_CONSUMER` | `0` | Trade events consumer |
| `ENABLE_RESEARCH_INGESTER` | `0` | Research ingester |
| `ENABLE_PAIR_BRIEF_WORKER` | `0` | Pair brief generator |
| `ENABLE_BLOG_GENERATOR` | auto | Blog generator (auto-on with OPENROUTER_API_KEY) |
| `ENABLE_DAILY_RESEARCH` | auto | Daily research (auto-on with OPENROUTER_API_KEY) |
| `ENABLE_CMS_I18N_AUTO` | auto | CMS i18n sync (auto-on with OPENROUTER_API_KEY) |

### Backend Bridges

| Variable | Description |
|----------|-------------|
| `VPS1_BASE_URL` | Forex backend base URL |
| `CRYPTO_BACKEND_URL` | Crypto backend base URL |

### Backup

| Variable | Description |
|----------|-------------|
| `R2_ENABLED` | Enable Cloudflare R2 backup (`true`/`false`) |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET` | R2 bucket name (`babahalgo-backups`) |
| `R2_ENDPOINT` | R2 endpoint URL |

---

## VPS3 Server Details

| Property | Value |
|----------|-------|
| IP | 148.230.96.201 |
| SSH Port | 1983 (NEVER use port 22) |
| SSH User | abdullah |
| SSH Key | id_raspi_ed25519 |
| OS | Ubuntu |
| Deploy Path | /opt/trading-commercial |
| Docker | Container for app only |
| PostgreSQL | Native on host (not Docker) |
| DB Name | trading_commercial |
| DB User | trading_user |
| DB Access | `sudo -u postgres psql` |
| Disk Usage | ~7% used |

---

## Cloudflare Tunnel

```
Client (browser)
  |
  v
Cloudflare CDN (babahalgo.com)
  |  TLS termination, HSTS preload
  |  CF-IPCountry header injection
  v
Cloudflare Tunnel (cloudflared)
  |
  v
VPS3:3000 (Next.js container)
```

Benefits:
- No public port exposure (only SSH 1983)
- Cloudflare DDoS protection
- Automatic TLS certificates
- CF-IPCountry header for geo-IP locale detection

---

## R2 Backup Schedule

Cloudflare R2 bucket: `babahalgo-backups/frontend/`

| Schedule | Type | Content |
|----------|------|---------|
| Daily 02:00 | DB dump | `pg_dump` of trading_commercial |
| Daily 03:00 | Public assets | `/public/uploads/` directory |
| Sunday 04:00 | Full backup | DB + public + config |

---

## Maintenance Mode

Toggle via admin API or admin console.

### Enable

```
PATCH /api/admin/maintenance
{
  "enabled": true,
  "message": "Maintenance in progress",
  "estimatedEnd": "2026-05-24T10:00:00Z"
}
```

### Behavior

- API routes return `503` with JSON `{ code: "maintenance", error: "..." }`
- Page routes redirect to `/maintenance`
- Admin routes are bypassed (operators can toggle it off)
- Health check (`/api/health`) is bypassed
- Fail-open: if maintenance check fails, site stays accessible

---

## Manual Deploy Commands

```bash
# On VPS3
cd /opt/trading-commercial

# Pull latest image
docker compose -f docker-compose.prod.yml pull app

# Recreate container (entrypoint runs migrations)
docker compose -f docker-compose.prod.yml up -d --force-recreate app

# Check logs
docker compose -f docker-compose.prod.yml logs -f app

# Manual migration
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

# Manual seed
docker compose -f docker-compose.prod.yml exec app npx prisma db seed
```

---

## Troubleshooting

### Container fails to start

1. Check logs: `docker compose logs app`
2. Common: `DATABASE_URL` unreachable -- PostgreSQL must be running natively
3. Migration failure: check `prisma/migrations/` for syntax errors

### DNS resolution fails in Docker

Docker daemon configured with multi-DNS (`/etc/docker/daemon.json`):
```json
{ "dns": ["8.8.8.8", "1.1.1.1", "8.8.4.4"] }
```
Root cause: systemd-resolved + Google DNS intermittent timeouts.

### Disk space issues

Post-deploy auto-prune is configured in CI. Manual cleanup:
```bash
docker image prune -a --filter "until=168h" -f
docker builder prune -f
```

### Build cache issues

If build fails with stale cache, trigger manual workflow with `cleanup_cache: true`.

### TypeScript errors not in CLI

Restart VS Code TS Server -- likely stale cache. CLI (`npx tsc --noEmit`) is the source of truth.

### Database connection from host

```bash
sudo -u postgres psql -d trading_commercial
```
