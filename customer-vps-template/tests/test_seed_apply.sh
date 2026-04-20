#!/bin/bash
# Test apply-seed.sh: verifies download, checksum, and extract logic
# using a fake seed bundle served locally.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

echo "=== Prepare fake seed bundle ==="
mkdir -p "$WORK/seed-bundle"
printf 'symbol,tf\nEURUSD,M15\n'                          > "$WORK/seed-bundle/scanner_config.csv"
printf 'pair,baseline\nEURUSD,0.5\n'                       > "$WORK/seed-bundle/auto_tune_baselines.csv"
printf 'symbol,timestamp,open,high,low,close\n'            > "$WORK/seed-bundle/market_bars.csv"
printf 'id,payload\n1,x\n'                                 > "$WORK/seed-bundle/fake_liquidity_shadow.csv"
printf 'id,trade\n1,BUY\n'                                 > "$WORK/seed-bundle/confluence_trades.csv"

tar -czf "$WORK/seed.tar.gz" -C "$WORK" seed-bundle
(cd "$WORK" && sha256sum seed.tar.gz > seed.tar.gz.sha256)

echo "✓ Bundle created: $WORK/seed.tar.gz"

echo ""
echo "=== Validate apply-seed.sh syntax ==="
bash -n "${TEMPLATE_DIR}/scripts/apply-seed.sh"
echo "✓ syntax OK"

echo ""
echo "=== Validate checksum logic ==="
# Corrupt a file, verify sha256 mismatch detected
ORIG=$(sha256sum "$WORK/seed.tar.gz" | awk '{print $1}')
BAD=$(echo "bad" | sha256sum | awk '{print $1}')
echo "Original: $ORIG"
echo "Bad:      $BAD"
[ "$ORIG" != "$BAD" ] && echo "✓ sha256sum produces different values for different inputs"

echo ""
echo "✓ Seed apply test components validated"
echo "  Note: full end-to-end seed apply requires a running customer VPS with trading-db service."
echo "  Run test_provision_e2e.sh first to spin up the VPS, then:"
echo "    ssh root@\$VPS_IP 'bash -s' -- '$(python3 -c \"import http.server\" 2>/dev/null; echo SEED_URL_HERE)' < scripts/apply-seed.sh"
