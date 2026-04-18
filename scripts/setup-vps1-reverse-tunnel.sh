#!/bin/bash
# =============================================================================
# VPS 2 → VPS 1 SSH reverse tunnel setup (local forward 18000 → VPS1:8000)
# Runs on VPS 2. Creates keypair if missing, prepares systemd service.
# You must still paste the pubkey into VPS 1 ~/.ssh/authorized_keys manually.
# =============================================================================
set -euo pipefail

REMOTE_USER="${REMOTE_USER:-abdullah}"
REMOTE_HOST="${REMOTE_HOST:-147.93.156.218}"
REMOTE_PORT="${REMOTE_PORT:-1983}"
LOCAL_PORT="${LOCAL_PORT:-18000}"
REMOTE_BACKEND_PORT="${REMOTE_BACKEND_PORT:-8000}"
KEY_PATH="${KEY_PATH:-$HOME/.ssh/vps1_tunnel}"
SERVICE_NAME="vps1-tunnel"

echo "=== [1/5] Ensure autossh is installed ==="
if ! command -v autossh >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo apt-get install -y autossh
fi

echo "=== [2/5] Generate dedicated tunnel keypair (if missing) ==="
if [ ! -f "$KEY_PATH" ]; then
  ssh-keygen -t ed25519 -N "" -f "$KEY_PATH" -C "vps2-tunnel-$(hostname)"
fi
chmod 600 "$KEY_PATH"
chmod 644 "${KEY_PATH}.pub"

echo
echo "=== [3/5] Public key (add to VPS 1 ~/.ssh/authorized_keys) ==="
echo "----- BEGIN PUBKEY -----"
cat "${KEY_PATH}.pub"
echo "----- END PUBKEY -----"
echo

echo "=== [4/5] Write systemd unit ==="
sudo tee "/etc/systemd/system/${SERVICE_NAME}.service" >/dev/null <<EOF
[Unit]
Description=VPS2 → VPS1 SSH reverse tunnel (commercial API)
After=network-online.target
Wants=network-online.target

[Service]
User=${USER}
Environment="AUTOSSH_GATETIME=0"
ExecStart=/usr/bin/autossh -M 0 -N \\
  -o "ServerAliveInterval=30" \\
  -o "ServerAliveCountMax=3" \\
  -o "ExitOnForwardFailure=yes" \\
  -o "StrictHostKeyChecking=accept-new" \\
  -o "UserKnownHostsFile=$HOME/.ssh/known_hosts" \\
  -i ${KEY_PATH} \\
  -L ${LOCAL_PORT}:127.0.0.1:${REMOTE_BACKEND_PORT} \\
  -p ${REMOTE_PORT} \\
  ${REMOTE_USER}@${REMOTE_HOST}
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

echo "=== [5/5] Reload systemd ==="
sudo systemctl daemon-reload
echo
echo "Next steps:"
echo "  1. Copy the pubkey above into VPS1 ~/.ssh/authorized_keys (for user ${REMOTE_USER})"
echo "  2. Test manually:  ssh -i ${KEY_PATH} -p ${REMOTE_PORT} ${REMOTE_USER}@${REMOTE_HOST} 'echo ok'"
echo "  3. Enable service: sudo systemctl enable --now ${SERVICE_NAME}"
echo "  4. Verify forward: curl -sf http://127.0.0.1:${LOCAL_PORT}/health"
