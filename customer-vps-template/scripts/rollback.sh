#!/bin/bash
# Rollback customer VPS provisioning.
# Usage: rollback.sh <CUSTOMER_ID> <VPS_IP> [SSH_USER] [SSH_PORT]
set -euo pipefail

CUSTOMER_ID="${1:?Customer ID required}"
VPS_IP="${2:?VPS IP required}"
SSH_USER="${3:-${SSH_USER:-root}}"
SSH_PORT="${4:-${SSH_PORT:-22}}"

echo "Rolling back $CUSTOMER_ID on $SSH_USER@$VPS_IP (port $SSH_PORT)..."

ssh -p "$SSH_PORT" -o StrictHostKeyChecking=accept-new "${SSH_USER}@${VPS_IP}" << 'EOF'
set -eu
if [ -d /opt/babahalgo ]; then
  cd /opt/babahalgo
  sudo docker compose -f docker-compose.customer.yml down -v 2>/dev/null || true
fi
sudo rm -rf /opt/babahalgo
echo "✓ Rollback complete on VPS"
EOF

echo "✓ Customer ${CUSTOMER_ID} rolled back"
