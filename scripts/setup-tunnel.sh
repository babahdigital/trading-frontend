#!/bin/bash
# =============================================================================
# Cloudflare Tunnel Setup for PostgreSQL (Zero Trust)
# Run AFTER setup-server.sh and cloudflared tunnel login
# =============================================================================
set -euo pipefail

TUNNEL_NAME="trading-db"

echo "=== Creating Cloudflare Tunnel ==="
# Create tunnel (if not exists)
cloudflared tunnel list | grep -q "$TUNNEL_NAME" || cloudflared tunnel create "$TUNNEL_NAME"

# Get tunnel ID
TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')
echo "Tunnel ID: $TUNNEL_ID"

echo "=== Writing tunnel config ==="
mkdir -p ~/.cloudflared

cat > ~/.cloudflared/config.yml <<EOF
tunnel: ${TUNNEL_ID}
credentials-file: /home/abdullah/.cloudflared/${TUNNEL_ID}.json

ingress:
  # PostgreSQL TCP tunnel - accessible only via cloudflared on Vercel side
  - hostname: db.babahalgo.com
    service: tcp://127.0.0.1:5432
    originRequest:
      connectTimeout: 10s
  # Next.js API (bridge middleware)
  - hostname: api.babahalgo.com
    service: http://127.0.0.1:3000
  # Health check endpoint
  - hostname: health.babahalgo.com
    service: http://127.0.0.1:3000
  # Catch-all
  - service: http_status:404
EOF

echo "=== Creating DNS routes ==="
cloudflared tunnel route dns "$TUNNEL_NAME" db.babahalgo.com || true
cloudflared tunnel route dns "$TUNNEL_NAME" api.babahalgo.com || true

echo "=== Installing as systemd service ==="
sudo cloudflared service install || true
sudo systemctl enable cloudflared
sudo systemctl restart cloudflared

echo "=== Tunnel Status ==="
sudo systemctl status cloudflared --no-pager

echo ""
echo "=== DONE ==="
echo "Tunnel is running. Services accessible via:"
echo "  Database: db.babahalgo.com"
echo "  API:      api.babahalgo.com"
echo ""
echo "For Vercel, set DATABASE_URL to:"
echo "  postgresql://trading_user:PASSWORD@db.babahalgo.com:5432/trading_commercial?sslmode=disable"
echo ""
echo "IMPORTANT: Configure Cloudflare Zero Trust Access policy to restrict who can use this tunnel."
echo "  - Go to: https://one.dash.cloudflare.com/"
echo "  - Access > Applications > Add Application"
echo "  - Self-hosted, domains: db.babahalgo.com, api.babahalgo.com"
echo "  - Policy: Allow only Vercel IPs or service tokens"
