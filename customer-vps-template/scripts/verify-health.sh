#!/bin/bash
# Verify all customer VPS services healthy.
# Exit 0 if all healthy, 1 otherwise.
set -euo pipefail

cd /opt/babahalgo

echo "=== Container status ==="
docker compose -f docker-compose.customer.yml ps

echo ""
echo "=== Health checks ==="

SERVICES=(trading-db redis trading-backend license-middleware customer-telegram-bot nginx)
ALL_HEALTHY=true

for SVC in "${SERVICES[@]}"; do
  STATUS=$(docker compose -f docker-compose.customer.yml ps --format "{{.Status}}" "$SVC" 2>/dev/null || echo "not-running")
  if echo "$STATUS" | grep -qE "healthy|Up"; then
    echo "  ✓ $SVC: $STATUS"
  else
    echo "  ✗ $SVC: $STATUS"
    ALL_HEALTHY=false
  fi
done

echo ""
echo "=== Backend /health ==="
if curl -sSf --max-time 5 http://localhost:8000/health 2>&1 | head -c 200; then
  echo ""
  echo "✓ Backend responding"
else
  echo "✗ Backend not responding"
  ALL_HEALTHY=false
fi

echo ""
if [ "$ALL_HEALTHY" = "true" ]; then
  echo "✓ ALL SERVICES HEALTHY"
  exit 0
else
  echo "✗ Some services not healthy — investigate with: docker compose logs <service>"
  exit 1
fi
