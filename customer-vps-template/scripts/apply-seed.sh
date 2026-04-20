#!/bin/bash
# Apply seed bundle to customer VPS database.
# Usage: apply-seed.sh <SEED_URL>
set -euo pipefail

SEED_URL="${1:?Seed URL required}"
TEMP_DIR=$(mktemp -d)
SEED_FILE="${TEMP_DIR}/seed.tar.gz"

trap 'rm -rf "$TEMP_DIR"' EXIT

echo "Downloading seed from: $SEED_URL"
curl -sSLo "$SEED_FILE" "$SEED_URL"

echo "Verifying checksum (if .sha256 available)..."
if curl -sSLfo "${SEED_FILE}.sha256" "${SEED_URL}.sha256" 2>/dev/null; then
  cd "$TEMP_DIR"
  sha256sum -c seed.tar.gz.sha256 || { echo "Checksum FAILED"; exit 1; }
  cd - >/dev/null
  echo "✓ Checksum verified"
else
  echo "No .sha256 file found — skipping checksum verification"
fi

echo "Extracting seed..."
tar -xzf "$SEED_FILE" -C "$TEMP_DIR"
SEED_DIR=$(find "$TEMP_DIR" -mindepth 1 -maxdepth 1 -type d | head -1)

if [ -z "$SEED_DIR" ]; then
  echo "ERROR: seed archive did not contain a top-level directory"
  exit 1
fi

echo "Applying seed to database from: $SEED_DIR"
cd /opt/babahalgo

# Apply CSVs in FK-safe order
for TABLE in scanner_config auto_tune_baselines market_bars fake_liquidity_shadow confluence_trades; do
  CSV="${SEED_DIR}/${TABLE}.csv"
  if [ -f "$CSV" ]; then
    echo "  Applying: $TABLE ($(wc -l < "$CSV") rows)"
    docker compose -f docker-compose.customer.yml exec -T trading-db \
      psql -U trader -d trading -c "\COPY $TABLE FROM STDIN WITH (FORMAT csv, HEADER true)" < "$CSV"
  else
    echo "  Skipping $TABLE (no CSV)"
  fi
done

echo "✓ Seed applied successfully"
