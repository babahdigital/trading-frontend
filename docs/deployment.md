# Deployment Guide

**Trading API Frontend — CV Babah Digital**

Server: VPS2 — 148.230.96.201 | OS: Ubuntu 24.04 LTS | Port: 1983 (SSH)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Environment Variables](#2-environment-variables)
3. [Docker Build](#3-docker-build)
4. [Docker Compose](#4-docker-compose)
5. [Server Setup (Ubuntu 24.04)](#5-server-setup-ubuntu-2404)
6. [PostgreSQL Setup](#6-postgresql-setup)
7. [Cloudflare Tunnel Setup](#7-cloudflare-tunnel-setup)
8. [Database Migrations and Seeding](#8-database-migrations-and-seeding)
9. [First Deployment](#9-first-deployment)
10. [Updating the Application](#10-updating-the-application)
11. [Health Checks and Monitoring](#11-health-checks-and-monitoring)
12. [Troubleshooting](#12-troubleshooting)
13. [Backup Procedures](#13-backup-procedures)

---

## 1. Prerequisites

### Local Development Machine

- Node.js 20+
- Docker Desktop or Docker Engine
- Git
- Access to VPS2 via SSH: `ssh -p 1983 ubuntu@148.230.96.201`

### VPS2 Requirements

- Ubuntu 24.04 LTS
- Minimum 2 vCPU, 4 GB RAM, 40 GB SSD
- Docker Engine 24+
- PostgreSQL 16 (installed on host, not containerized)
- Cloudflare account with tunnel configured for `babahalgo.com`

---

## 2. Environment Variables

Create a `.env` file in the project root. Never commit this file to version control.

```bash
cp .env.example .env
```

### Complete Variable Reference

| Variable | Required | Example | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | `postgresql://trading_user:pass@localhost:5432/trading_commercial` | PostgreSQL connection string |
| `JWT_SECRET` | Yes | 64-char random hex | HS256 signing key for JWT tokens |
| `ADMIN_EMAIL` | Yes | `admin@babahalgo.com` | Initial admin account email |
| `ADMIN_PASSWORD` | Yes | `SecurePass123!` | Initial admin account password |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://babahalgo.com` | Public URL (used in CORS, redirects) |
| `LICENSE_MW_MASTER_KEY` | Yes | 64-char hex string | AES-256-GCM master key for VPS token encryption |
| `VPS1_BACKEND_URL` | Yes | `http://host.docker.internal:18000` | VPS1 base URL reachable from the app container (host-internal tunnel recommended) |
| `VPS1_ADMIN_TOKEN` | Yes | 64-char hex | Last-resort admin token — VPS1 rejects this on scoped endpoints; used only for `healthz` and as a defensive fallback |
| `VPS1_TOKEN_SIGNALS` | Yes | 64-char hex | Scoped token for `/api/signals/*` |
| `VPS1_TOKEN_TRADE_EVENTS` | Yes | 64-char hex | Scoped token for `/api/trade-events/*` |
| `VPS1_TOKEN_RESEARCH` | Yes | 64-char hex | Scoped token for `/api/research/*` (required for Pair Brief worker) |
| `VPS1_TOKEN_PAMM` | Yes | 64-char hex | Scoped token for `/api/pamm/*` |
| `VPS1_TOKEN_STATS` | Yes | 64-char hex | Scoped token for `/api/stats/*` |
| `OPENROUTER_API_KEY` | Yes | `sk-or-v1-…` | Single AI provider credential — powers Pair Briefs, translations, Babah chat, admin i18n. See [ai-integration.md](./ai-integration.md) |
| `CRON_SECRET` | Yes | 64-char hex | Protects `/api/cron/*` manual trigger endpoints |
| `ENABLE_SIGNAL_CONSUMER` | Optional | `1` | Enables 30s signal-consumer interval |
| `ENABLE_TRADE_EVENTS_CONSUMER` | Optional | `1` | Enables 20s trade-events-consumer interval |
| `ENABLE_RESEARCH_INGESTER` | Optional | `1` | Enables 6h research-ingester + 30s startup kickoff |
| `ENABLE_PAIR_BRIEF_WORKER` | Optional | `true` | Enables 4h pair-brief worker + 45s startup kickoff |
| `BREVO_API_KEY` | Optional | `xkeys-…` | Brevo transactional email API — used for welcome/renewal emails |
| `TELEGRAM_BOT_TOKEN` | Optional | `123:ABC…` | Telegram Bot token for VIP brief notifications |
| `POSTGRES_DB` | Yes | `trading_commercial` | PostgreSQL database name |
| `POSTGRES_USER` | Yes | `trading_user` | PostgreSQL user |
| `POSTGRES_PASSWORD` | Yes | `SecureDbPass!` | PostgreSQL password |
| `CF_ACCESS_CLIENT_ID` | Optional | `xxxxx.access` | Cloudflare Access client ID (if using service auth) |
| `CF_ACCESS_CLIENT_SECRET` | Optional | `xxxxxxx` | Cloudflare Access client secret |

> **On rotation.** `docker compose restart` does **not** re-read `.env`.
> After editing a value, always `docker compose up -d` so the container
> is recreated with the new environment. See
> [bugs-and-fixes.md](./bugs-and-fixes.md) entry 2026-04-19.03 for the
> incident where this tripped us up.

### Generating Secure Keys

```bash
# Generate JWT_SECRET (64 hex chars = 256-bit key)
openssl rand -hex 32

# Generate LICENSE_MW_MASTER_KEY (64 hex chars = 256-bit key)
openssl rand -hex 32
```

---

## 3. Docker Build

The Dockerfile uses a **3-stage multi-stage build**:

```
Stage 1: deps       — install npm dependencies (node:20-alpine)
Stage 2: builder    — run prisma generate + next build (node:20-alpine)
Stage 3: runner     — copy standalone output only (node:20-alpine)
```

### Manual Build

```bash
docker build -t trading-apifrontend:latest .
```

### What Each Stage Does

**Stage 1 (deps):**
```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci 2>/dev/null || npm install
```

**Stage 2 (builder):**
```dockerfile
FROM node:20-alpine AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate        # generates Prisma client with linux-musl binaries
RUN npm run build              # produces .next/standalone
```

**Stage 3 (runner):**
```dockerfile
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl   # required for Prisma
RUN addgroup --system nodejs && adduser --system nextjs
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

The standalone output contains only the files needed to run in production, significantly reducing the final image size.

---

## 4. Docker Compose

The production `docker-compose.yml`:

```yaml
services:
  app:
    build: .
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"    # Bound to localhost only — Cloudflare Tunnel connects here
    environment:
      - DATABASE_URL=postgresql://trading_user:${DB_PASSWORD}@host.docker.internal:5432/trading_commercial?schema=public
      - JWT_SECRET=${JWT_SECRET}
      - LICENSE_MW_MASTER_KEY=${LICENSE_MW_MASTER_KEY}
      - VPS1_BACKEND_URL=${VPS1_BACKEND_URL}
      - VPS1_ADMIN_TOKEN=${VPS1_ADMIN_TOKEN}
      - NODE_ENV=production
      - NEXT_PUBLIC_APP_URL=${APP_URL}
    extra_hosts:
      - "host.docker.internal:host-gateway"    # Allows container to reach host PostgreSQL
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
```

**Key design decisions:**
- Port `3000` is bound to `127.0.0.1` only — no direct public access
- `host.docker.internal:host-gateway` maps to the host machine for PostgreSQL access
- Health check runs every 30s; Docker will restart the container after 3 consecutive failures

---

## 5. Server Setup (Ubuntu 24.04)

Run the automated setup script (requires root/sudo):

```bash
chmod +x scripts/setup-server.sh
sudo ./scripts/setup-server.sh
```

### What the Script Installs

```bash
# System updates
apt-get update && apt-get upgrade -y

# Docker Engine
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add ubuntu user to docker group (no sudo required)
usermod -aG docker ubuntu

# PostgreSQL 16
apt-get install -y postgresql-16 postgresql-client-16

# Cloudflared (Cloudflare Tunnel daemon)
curl -L https://pkg.cloudflare.com/cloudflare-main.gpg | gpg --dearmor -o /usr/share/keyrings/cloudflare-main.gpg
apt-get install -y cloudflared

# Enable services
systemctl enable docker postgresql
systemctl start docker postgresql
```

### Manual SSH Hardening (Recommended)

```bash
# Change SSH port to 1983
sed -i 's/#Port 22/Port 1983/' /etc/ssh/sshd_config
systemctl restart sshd

# UFW firewall — only allow SSH
ufw allow 1983/tcp
ufw enable
# No rules needed for 80/443 — Cloudflare Tunnel handles ingress
```

---

## 6. PostgreSQL Setup

### Create Database and User

```bash
sudo -u postgres psql
```

```sql
CREATE USER trading_user WITH PASSWORD 'YourSecurePassword';
CREATE DATABASE trading_commercial OWNER trading_user;
GRANT ALL PRIVILEGES ON DATABASE trading_commercial TO trading_user;
\q
```

### Configure PostgreSQL to Accept Docker Connections

Edit `/etc/postgresql/16/main/pg_hba.conf`:

```
# Allow connections from Docker host gateway
host    trading_commercial    trading_user    172.17.0.0/16    md5
host    trading_commercial    trading_user    127.0.0.1/32     md5
```

Edit `/etc/postgresql/16/main/postgresql.conf`:

```
listen_addresses = '127.0.0.1,172.17.0.1'
```

Restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

### Verify Connection from Docker Container

```bash
docker run --rm --add-host=host.docker.internal:host-gateway postgres:16-alpine \
  psql "postgresql://trading_user:password@host.docker.internal:5432/trading_commercial" -c '\l'
```

---

## 7. Cloudflare Tunnel Setup

### Prerequisites

- Cloudflare account with `babahalgo.com` domain added
- Cloudflare Zero Trust dashboard access

### Step 1: Authenticate Cloudflared

```bash
cloudflared tunnel login
```

This opens a browser for OAuth authentication and saves credentials to `~/.cloudflared/cert.pem`.

### Step 2: Create a Named Tunnel

```bash
cloudflared tunnel create trading-app
```

Note the tunnel UUID output. It will be needed in the config file.

### Step 3: Create DNS Record

```bash
cloudflared tunnel route dns trading-app babahalgo.com
```

This creates a CNAME record: `babahalgo.com` → `<tunnel-uuid>.cfargotunnel.com`

### Step 4: Configure the Tunnel

Run the tunnel setup script:

```bash
chmod +x scripts/setup-tunnel.sh
./scripts/setup-tunnel.sh
```

Or create the config manually at `~/.cloudflared/config.yml`:

```yaml
tunnel: <tunnel-uuid>
credentials-file: /root/.cloudflared/<tunnel-uuid>.json

ingress:
  - hostname: babahalgo.com
    service: http://localhost:3000
  - service: http_status:404
```

### Step 5: Install as System Service

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

### Verify Tunnel Status

```bash
cloudflared tunnel info trading-app
sudo systemctl status cloudflared
```

---

## 8. Database Migrations and Seeding

### First-time Setup

```bash
# Apply all migrations
docker compose exec app npx prisma migrate deploy

# Seed initial data (admin user, sample VPS, demo license)
docker compose exec app npx prisma db seed
```

### Checking Migration Status

```bash
docker compose exec app npx prisma migrate status
```

### Creating New Migrations (Development Only)

```bash
# On local machine — generates SQL migration file
npx prisma migrate dev --name add_new_field
```

Commit the generated migration file to version control. Deploy using `migrate deploy` on the server.

---

## 9. First Deployment

Complete sequence for a fresh server:

```bash
# 1. SSH into VPS2
ssh -p 1983 ubuntu@148.230.96.201

# 2. Clone the repository
git clone https://github.com/babahdigital/trading-apifrontend.git
cd trading-apifrontend

# 3. Run server setup (installs Docker, PostgreSQL, cloudflared)
sudo ./scripts/setup-server.sh

# 4. Configure PostgreSQL
sudo -u postgres psql -c "CREATE USER trading_user WITH PASSWORD 'YourPass';"
sudo -u postgres psql -c "CREATE DATABASE trading_commercial OWNER trading_user;"

# 5. Configure environment
cp .env.example .env
nano .env   # Fill in all required values

# 6. Build and start the application
docker compose up -d --build

# 7. Wait for container to be healthy
docker compose ps
docker compose logs -f app

# 8. Run migrations and seed
docker compose exec app npx prisma migrate deploy
docker compose exec app npx prisma db seed

# 9. Set up Cloudflare Tunnel
./scripts/setup-tunnel.sh
sudo systemctl start cloudflared

# 10. Verify
curl https://babahalgo.com/api/health
```

---

## 10. Updating the Application

```bash
# SSH into VPS2
ssh -p 1983 ubuntu@148.230.96.201
cd trading-apifrontend

# Pull latest code
git pull origin main

# Rebuild and restart (zero-downtime via Docker restart policy)
docker compose up -d --build

# Apply any new migrations
docker compose exec app npx prisma migrate deploy

# Check logs
docker compose logs -f app --tail=50
```

### Rollback

```bash
# Revert to previous image (if tagged)
docker compose down
docker tag trading-apifrontend:latest trading-apifrontend:rollback
git checkout <previous-commit>
docker compose up -d --build
```

---

## 11. Health Checks and Monitoring

### Application Health

```bash
# Docker health status
docker compose ps

# Application health endpoint
curl http://localhost:3000/api/health

# Container logs
docker compose logs app --tail=100 -f
```

### PostgreSQL Health

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname='trading_commercial';"
```

### Cloudflare Tunnel Health

```bash
# Systemd service status
sudo systemctl status cloudflared

# Tunnel connection log
sudo journalctl -u cloudflared -f

# Test public endpoint
curl -I https://babahalgo.com/api/health
```

### Docker Container Stats

```bash
docker stats trading-apifrontend_app_1
```

---

## 12. Troubleshooting

### Container Fails to Start

**Symptom:** `docker compose ps` shows container as `Exit 1` or `Restarting`

```bash
# View startup logs
docker compose logs app

# Common causes:
# 1. DATABASE_URL incorrect — verify PostgreSQL is running and credentials match
# 2. JWT_SECRET missing — ensure .env is loaded
# 3. Prisma client not generated — run: docker compose exec app npx prisma generate
```

### Cannot Connect to PostgreSQL

**Symptom:** `Error: connect ECONNREFUSED` in container logs

```bash
# Verify PostgreSQL is listening
sudo ss -tlnp | grep 5432

# Check pg_hba.conf allows Docker subnet (172.17.0.0/16)
sudo cat /etc/postgresql/16/main/pg_hba.conf

# Test from container
docker compose exec app sh -c 'nc -zv host.docker.internal 5432'
```

### Cloudflare Tunnel Not Routing Traffic

**Symptom:** `babahalgo.com` returns 1016 error

```bash
# Check tunnel is running
sudo systemctl status cloudflared

# Check config file
cat ~/.cloudflared/config.yml

# Re-authenticate if cert expired
cloudflared tunnel login

# Restart service
sudo systemctl restart cloudflared
```

### Prisma Migrations Failing

**Symptom:** `ERROR: There is 1 unapplied migration`

```bash
# View pending migrations
docker compose exec app npx prisma migrate status

# Apply pending migrations
docker compose exec app npx prisma migrate deploy

# If schema drift detected (dev only):
docker compose exec app npx prisma migrate reset --force
```

### JWT Verification Errors

**Symptom:** Clients getting 401 after deployment

Cause: `JWT_SECRET` changed between deployments. All existing tokens are invalidated.

```bash
# Ensure JWT_SECRET in .env matches previous value
# If intentionally rotated, all users must log in again
```

### Rate Limit Store Fills Up

The in-memory rate limit store accumulates entries but cleans stale ones every 5 minutes. Under heavy load, memory can grow temporarily. Mitigations:

- Rate limit is per-process; acceptable for single Docker container deployment
- For multi-container deployments, replace in-memory store with Redis

---

## 13. Backup Procedures

### PostgreSQL Backup

```bash
# Automated daily backup
sudo -u postgres pg_dump trading_commercial | gzip > /backups/trading_$(date +%Y%m%d).sql.gz

# Recommended: add to cron
echo "0 2 * * * postgres pg_dump trading_commercial | gzip > /backups/trading_\$(date +\%Y\%m\%d).sql.gz" \
  | sudo tee /etc/cron.d/pg-backup
```

### Restore from Backup

```bash
gunzip -c /backups/trading_20260416.sql.gz | sudo -u postgres psql trading_commercial
```

### Environment File Backup

The `.env` file contains all secrets. Store a copy in a secure vault (e.g., Bitwarden, Vault) separately from the server.

```bash
# Never commit .env to git
# Store securely: encrypt with GPG before any backup
gpg --symmetric --cipher-algo AES256 .env
```
