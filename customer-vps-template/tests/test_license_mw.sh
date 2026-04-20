#!/bin/bash
# Test license middleware: unit tests + manual 2-minute integration run.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MW_DIR="$(cd "${SCRIPT_DIR}/../license-middleware" && pwd)"

echo "=== Unit tests ==="
cd "$MW_DIR"
python -m pytest tests/ -v

echo ""
echo "=== Manual integration test (2 min watch) ==="
# Build image locally first
docker build -t babahdigital/customer-license-mw:test .

# Run for 2 minutes to observe 2 check cycles (interval=1 min)
docker run --rm --name license-mw-e2e-test \
  -e CUSTOMER_ID=E2E-LICENSE-TEST \
  -e VPS2_LICENSE_URL=https://babahalgo.com/api/license/check \
  -e LICENSE_HMAC_SECRET=test-secret-32chars-abcdefghijkl \
  -e BACKEND_URL=http://localhost:8000 \
  -e BACKEND_TOKEN=test-token \
  -e CHECK_INTERVAL_MIN=1 \
  babahdigital/customer-license-mw:test &

PID=$!
sleep 120  # Watch 2 license checks
kill "$PID" 2>/dev/null || true
docker stop license-mw-e2e-test 2>/dev/null || true

echo "✓ License middleware test complete (review logs above for check cycles)"
