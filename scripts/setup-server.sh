#!/bin/bash
# =============================================================================
# Server Setup: PostgreSQL 16 + Cloudflare Tunnel for Trading Commercial
# Target: Ubuntu 24.04 (148.230.96.201:1983)
# =============================================================================
set -euo pipefail

echo "=== [1/5] Installing PostgreSQL 16 ==="
sudo apt-get update -qq
sudo apt-get install -y postgresql-16 postgresql-client-16

echo "=== [2/5] Configuring PostgreSQL ==="
# Start and enable
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Create database and user
sudo -u postgres psql <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'trading_user') THEN
    CREATE ROLE trading_user WITH LOGIN PASSWORD 'CHANGEME_DB_PASSWORD';
  END IF;
END $$;

SELECT 'CREATE DATABASE trading_commercial OWNER trading_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'trading_commercial')\gexec

GRANT ALL PRIVILEGES ON DATABASE trading_commercial TO trading_user;

-- Connect to trading_commercial and grant schema permissions
\c trading_commercial
GRANT ALL ON SCHEMA public TO trading_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO trading_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO trading_user;
SQL

# Allow password auth for local TCP connections
PG_HBA=$(sudo -u postgres psql -t -c "SHOW hba_file" | xargs)
if ! grep -q "trading_user" "$PG_HBA"; then
  echo "# Trading Commercial app user" | sudo tee -a "$PG_HBA"
  echo "host trading_commercial trading_user 127.0.0.1/32 scram-sha-256" | sudo tee -a "$PG_HBA"
  sudo systemctl reload postgresql
fi

echo "=== [3/5] Testing PostgreSQL connection ==="
PGPASSWORD=CHANGEME_DB_PASSWORD psql -h 127.0.0.1 -U trading_user -d trading_commercial -c "SELECT 1 AS connection_ok;"

echo "=== [4/5] Installing Cloudflare Tunnel (cloudflared) ==="
if ! command -v cloudflared &>/dev/null; then
  curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cloudflared.deb
  sudo dpkg -i /tmp/cloudflared.deb
  rm /tmp/cloudflared.deb
fi
cloudflared --version

echo "=== [5/5] Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Run: cloudflared tunnel login"
echo "  2. Run: cloudflared tunnel create trading-db"
echo "  3. Configure tunnel (see setup-tunnel.sh)"
echo "  4. Set DATABASE_URL in Vercel env vars using tunnel hostname"
echo ""
echo "PostgreSQL is listening on 127.0.0.1:5432 (local only, not exposed to internet)"
echo "Database: trading_commercial"
echo "User: trading_user"
echo "IMPORTANT: Change the password 'CHANGEME_DB_PASSWORD' in this script before running!"
