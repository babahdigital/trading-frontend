#!/bin/bash
# End-to-end test: provision test customer VPS from scratch.
# Requires: TEST_VPS_IP env var (e.g., Contabo trial VPS)
set -euo pipefail

TEST_CUSTOMER_ID="E2E-TEST-$(date +%s)"
TEST_VPS_IP="${TEST_VPS_IP:?TEST_VPS_IP required}"
TEST_SSH_USER="${TEST_SSH_USER:-root}"
TEST_SSH_PORT="${TEST_SSH_PORT:-22}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "Running E2E provisioning test..."
echo "Customer: $TEST_CUSTOMER_ID"
echo "Target: ${TEST_SSH_USER}@${TEST_VPS_IP}:${TEST_SSH_PORT}"

# Provision
time "${TEMPLATE_DIR}/scripts/provision.sh" \
  --customer-id "$TEST_CUSTOMER_ID" \
  --vps-ip "$TEST_VPS_IP" \
  --ssh-user "$TEST_SSH_USER" \
  --ssh-port "$TEST_SSH_PORT" \
  --tier "TRADER" \
  --admin-token "$(openssl rand -hex 32)" \
  --sync-token "$(openssl rand -hex 32)"

# Verify
ssh -p "$TEST_SSH_PORT" -o StrictHostKeyChecking=accept-new \
  "${TEST_SSH_USER}@${TEST_VPS_IP}" "sudo bash -s" < "${TEMPLATE_DIR}/scripts/verify-health.sh"

# Cleanup
"${TEMPLATE_DIR}/scripts/rollback.sh" "$TEST_CUSTOMER_ID" "$TEST_VPS_IP" "$TEST_SSH_USER" "$TEST_SSH_PORT"

echo "✓ E2E provisioning test PASSED"
