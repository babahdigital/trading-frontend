#!/bin/bash
set -euo pipefail

# ============================================================
# Provision Customer VPS from zero → healthy in < 30 min
# Usage: ./provision.sh --customer-id CUST-001 --vps-ip x.x.x.x --...
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# ─── Logging helpers ────────────────────────────────────
log_info()  { echo -e "\033[0;32m[INFO]\033[0m  $*"; }
log_warn()  { echo -e "\033[0;33m[WARN]\033[0m  $*"; }
log_error() { echo -e "\033[0;31m[ERROR]\033[0m $*" >&2; }
log_step()  { echo -e "\033[0;34m[STEP]\033[0m  $*"; }

# ─── Arg parsing ────────────────────────────────────────
CUSTOMER_ID=""
VPS_IP=""
TIER="TRADER"
ADMIN_TOKEN=""
SYNC_TOKEN=""
SEED_URL=""
TELEGRAM_TOKEN=""
CUSTOMER_LOCALE="id"
SSH_USER="${SSH_USER:-root}"
SSH_PORT="${SSH_PORT:-22}"
GHCR_USER="${GHCR_USER:-}"
GHCR_TOKEN="${GHCR_TOKEN:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --customer-id)    CUSTOMER_ID="$2"; shift 2 ;;
    --vps-ip)         VPS_IP="$2"; shift 2 ;;
    --tier)           TIER="$2"; shift 2 ;;
    --admin-token)    ADMIN_TOKEN="$2"; shift 2 ;;
    --sync-token)     SYNC_TOKEN="$2"; shift 2 ;;
    --seed-url)       SEED_URL="$2"; shift 2 ;;
    --telegram-token) TELEGRAM_TOKEN="$2"; shift 2 ;;
    --locale)         CUSTOMER_LOCALE="$2"; shift 2 ;;
    --ssh-user)       SSH_USER="$2"; shift 2 ;;
    --ssh-port)       SSH_PORT="$2"; shift 2 ;;
    --ghcr-user)      GHCR_USER="$2"; shift 2 ;;
    --ghcr-token)     GHCR_TOKEN="$2"; shift 2 ;;
    -h|--help)
      cat << EOF
Usage: $0 [OPTIONS]

Required:
  --customer-id ID       Customer ID (e.g., CUST-001)
  --vps-ip IP            Target VPS IP address
  --admin-token TOKEN    VPS admin token (will be written to .env)
  --sync-token TOKEN     VPS1 sync token (from VPS2 mint)

Optional:
  --tier TIER            Tier (STARTER|TRADER|PREMIUM|HNWI_CLUB), default: TRADER
  --seed-url URL         Seed bundle URL (tar.gz from VPS1)
  --telegram-token TKN   Telegram bot token
  --locale LOCALE        Customer locale (id|en), default: id
  --ssh-user USER        SSH user (default: root, override with --ssh-user abdullah)
  --ssh-port PORT        SSH port (default: 22)
  --ghcr-user USER       GHCR username for image pulls (or env GHCR_USER)
  --ghcr-token TOKEN     GHCR personal access token (or env GHCR_TOKEN)

Example:
  $0 --customer-id CUST-001 --vps-ip 192.0.2.100 \\
     --admin-token \$ADMIN --sync-token \$SYNC --tier TRADER \\
     --ghcr-user my-user --ghcr-token ghp_xxx
EOF
      exit 0
      ;;
    *)
      log_error "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Validate required args
for var in CUSTOMER_ID VPS_IP ADMIN_TOKEN SYNC_TOKEN; do
  if [ -z "${!var}" ]; then
    log_error "Missing required argument: --${var,,}"
    exit 1
  fi
done

SSH_TARGET="${SSH_USER}@${VPS_IP}"
SSH_CMD="ssh -p ${SSH_PORT} -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new ${SSH_TARGET}"
SCP_CMD="scp -P ${SSH_PORT} -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new"

log_info "=================================================="
log_info "Provisioning customer: $CUSTOMER_ID"
log_info "Target VPS: $SSH_TARGET (port $SSH_PORT)"
log_info "Tier: $TIER"
log_info "=================================================="

# ─── Step 1: SSH connectivity check ──────────────────────
log_step "1/8 SSH connectivity check"
if ! $SSH_CMD "echo 'SSH OK'" >/dev/null 2>&1; then
  log_error "Cannot SSH to ${SSH_TARGET}. Check connectivity + keys."
  exit 1
fi
log_info "✓ SSH working"

# ─── Step 2: Install Docker ──────────────────────────────
log_step "2/8 Install Docker"
$SSH_CMD "sudo bash -s" < "${SCRIPT_DIR}/install-docker.sh"
log_info "✓ Docker installed"

# ─── Step 3: Generate secure passwords ───────────────────
log_step "3/8 Generate secure passwords"
DB_PASSWORD=$(openssl rand -hex 16)
REDIS_PASSWORD=$(openssl rand -hex 16)
LICENSE_HMAC_SECRET=$(openssl rand -hex 32)
REGISTRATION_CODE=$(openssl rand -base64 8 | tr -d '=+/' | head -c 8)
log_info "✓ Passwords generated"

# ─── Step 4: Upload template files ───────────────────────
log_step "4/8 Upload template files"
$SSH_CMD "sudo mkdir -p /opt/babahalgo && sudo chown ${SSH_USER}:${SSH_USER} /opt/babahalgo"
$SCP_CMD \
  "${TEMPLATE_DIR}/Dockerfile.customer-backend" \
  "${TEMPLATE_DIR}/docker-compose.customer.yml" \
  "${TEMPLATE_DIR}/nginx.conf" \
  "${SSH_TARGET}:/opt/babahalgo/"
log_info "✓ Template uploaded"

# ─── Step 5: Generate .env on VPS ────────────────────────
log_step "5/8 Generate .env"
$SSH_CMD "cat > /opt/babahalgo/.env" << EOF
CUSTOMER_ID=${CUSTOMER_ID}
CUSTOMER_LOCALE=${CUSTOMER_LOCALE}
TIER=${TIER}
CODE_VERSION=v1.6.51
LICENSE_MW_VERSION=latest
BOT_VERSION=latest
DB_USER=trader
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=trading
REDIS_PASSWORD=${REDIS_PASSWORD}
ADMIN_TOKEN=${ADMIN_TOKEN}
SYNC_TOKEN=${SYNC_TOKEN}
SYNC_INTERVAL_HOURS=24
LICENSE_HMAC_SECRET=${LICENSE_HMAC_SECRET}
LICENSE_CHECK_INTERVAL_MIN=15
GRACE_PERIOD_HOURS=72
REGISTRATION_CODE=${REGISTRATION_CODE}
TELEGRAM_BOT_TOKEN=${TELEGRAM_TOKEN:-CHANGE_ME}
OPENROUTER_API_KEY=CHANGE_ME_SHARED_BABAHDIGITAL_KEY
VPS1_BASE_URL=https://api.babahalgo.com
VPS2_LICENSE_URL=https://babahalgo.com/api/license/check
MT5_ZMQ_HOST=host.docker.internal
MT5_ZMQ_COMMAND_PORT=5555
MT5_ZMQ_DATA_PORT=5556
FAKE_LIQ_SHADOW_ENABLED=true
CONFLUENCE_TRACKING_ENABLED=true
ADVISOR_DAILY_LESSONS_ENABLED=true
FAKE_LIQ_STAGE_2_ENABLED=true
CONFLUENCE_GATE_ENABLED=false
EOF
$SSH_CMD "chmod 600 /opt/babahalgo/.env"
log_info "✓ .env created"

# ─── Step 6: Pull + start services ───────────────────────
log_step "6/8 Pull images + start services"
if [ -n "$GHCR_USER" ] && [ -n "$GHCR_TOKEN" ]; then
  $SSH_CMD "echo '${GHCR_TOKEN}' | sudo docker login ghcr.io -u '${GHCR_USER}' --password-stdin"
else
  log_warn "No GHCR credentials provided — assuming public images or pre-authenticated VPS"
fi
$SSH_CMD "cd /opt/babahalgo && \
  sudo docker compose -f docker-compose.customer.yml --env-file .env pull && \
  sudo docker compose -f docker-compose.customer.yml --env-file .env up -d"
log_info "✓ Services started"

# ─── Step 7: Apply seed bundle ───────────────────────────
if [ -n "$SEED_URL" ]; then
  log_step "7/8 Apply seed bundle"
  $SSH_CMD "sudo bash -s" -- "$SEED_URL" < "${SCRIPT_DIR}/apply-seed.sh"
  log_info "✓ Seed applied"
else
  log_warn "7/8 No seed URL provided — skipping seed apply"
fi

# ─── Step 8: Verify health ───────────────────────────────
log_step "8/8 Verify health (wait 90s for services to start)"
sleep 90
$SSH_CMD "sudo bash -s" < "${SCRIPT_DIR}/verify-health.sh"

log_info ""
log_info "=================================================="
log_info "✓ PROVISIONING COMPLETE"
log_info "=================================================="
log_info "Customer:       $CUSTOMER_ID"
log_info "VPS IP:         $VPS_IP"
log_info "Tier:           $TIER"
log_info "Registration:   $REGISTRATION_CODE"
log_info ""
log_info "Next steps:"
log_info "1. Send customer the registration code"
log_info "2. Attach MT5 EA (via RDP or customer self-service)"
log_info "3. Send welcome email + portal login link"
log_info "=================================================="
