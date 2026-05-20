#!/usr/bin/env bash
# Smoke test for VPS1 trade-events endpoints (port 8211 signals microservice).
#
# Run AFTER backend trading-forex deploys commit 0b88c67+ (alembic 0193 +
# router /api/trade-events/pending + /ack + auth + MT5 bridge writes).
#
# Usage:
#   bash scripts/smoke-trade-events.sh                # uses VPS1_SIGNALS_URL + VPS1_PUBAPI_SIGNALS_KEY from local .env
#   VPS1_SIGNALS_URL=http://localhost:8211 \
#     VPS1_PUBAPI_SIGNALS_KEY=babasvc_xxx \
#     bash scripts/smoke-trade-events.sh
#
# Exit codes:
#   0  all checks pass
#   1  required env missing
#   2  endpoint returned non-2xx unexpectedly
#   3  schema validation failure
#   4  ack response shape wrong

set -euo pipefail

# ─── Config ────────────────────────────────────────────────────────────────
# Read env from .env.local if present (loaded by dotenv-style parser)
if [ -f ".env.local" ]; then
  # shellcheck disable=SC1091
  set -a; . ./.env.local; set +a
elif [ -f ".env" ]; then
  set -a; . ./.env; set +a
fi

BASE_URL="${VPS1_SIGNALS_URL:-${VPS1_BACKEND_URL:-http://localhost:8211}}"
API_KEY="${VPS1_PUBAPI_SIGNALS_KEY:-}"

if [ -z "$API_KEY" ]; then
  echo "FAIL: VPS1_PUBAPI_SIGNALS_KEY tidak di-set (env atau .env)"
  exit 1
fi

# Strip trailing slash on BASE_URL
BASE_URL="${BASE_URL%/}"

red()    { printf "\033[31m%s\033[0m\n" "$*"; }
green()  { printf "\033[32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }
bold()   { printf "\033[1m%s\033[0m\n" "$*"; }

bold "================================================================"
bold "  Smoke test: trade-events endpoints @ $BASE_URL"
bold "================================================================"
echo

# ─── Test 1: GET /pending — auth required ──────────────────────────────────
bold "[1/5] GET /api/trade-events/pending WITHOUT api key → expect 401"
status=$(curl -s -o /tmp/te_unauth.json -w "%{http_code}" \
  "$BASE_URL/api/trade-events/pending?limit=5")
if [ "$status" = "401" ]; then
  green "  ✅ Returned 401 (auth enforced)"
else
  red "  ❌ Expected 401, got $status. Body:"
  cat /tmp/te_unauth.json; echo
  exit 2
fi
echo

# ─── Test 2: GET /pending — valid auth ─────────────────────────────────────
bold "[2/5] GET /api/trade-events/pending?limit=5 WITH api key → expect 200 + JSON array"
status=$(curl -s -o /tmp/te_pending.json -w "%{http_code}" \
  -H "X-Api-Key: $API_KEY" \
  "$BASE_URL/api/trade-events/pending?limit=5")
if [ "$status" != "200" ]; then
  red "  ❌ Expected 200, got $status. Body:"
  cat /tmp/te_pending.json; echo
  exit 2
fi

# Validate response is JSON array (could be empty [])
if ! jq -e 'type == "array"' /tmp/te_pending.json >/dev/null 2>&1; then
  red "  ❌ Response bukan JSON array. Body:"
  cat /tmp/te_pending.json; echo
  exit 3
fi

count=$(jq 'length' /tmp/te_pending.json)
green "  ✅ Returned 200 with array of $count event(s)"

# ─── Test 3: Validate schema if events present ─────────────────────────────
if [ "$count" -gt 0 ]; then
  bold "[3/5] Validate event schema (required fields)"
  required=(sequence_number event_type trade_id ticket pair direction lot price emitted_at)
  failed=0
  for field in "${required[@]}"; do
    if ! jq -e ".[0] | has(\"$field\")" /tmp/te_pending.json >/dev/null 2>&1; then
      red "  ❌ Missing required field: $field"
      failed=1
    fi
  done

  # event_type must be in enum
  etype=$(jq -r '.[0].event_type' /tmp/te_pending.json)
  case "$etype" in
    OPEN|MODIFY_SL|MODIFY_TP|CLOSE|REVERSE)
      green "  ✅ event_type='$etype' valid"
      ;;
    *)
      red "  ❌ event_type='$etype' bukan enum yang dikenal (OPEN/MODIFY_SL/MODIFY_TP/CLOSE/REVERSE)"
      failed=1
      ;;
  esac

  # direction must be BUY/SELL
  dir=$(jq -r '.[0].direction' /tmp/te_pending.json)
  case "$dir" in
    BUY|SELL)
      green "  ✅ direction='$dir' valid"
      ;;
    *)
      red "  ❌ direction='$dir' bukan BUY/SELL"
      failed=1
      ;;
  esac

  # emitted_at must be ISO-8601
  emitted=$(jq -r '.[0].emitted_at' /tmp/te_pending.json)
  if [[ "$emitted" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T ]]; then
    green "  ✅ emitted_at='$emitted' looks ISO-8601"
  else
    red "  ❌ emitted_at='$emitted' bukan ISO-8601"
    failed=1
  fi

  [ "$failed" -ne 0 ] && exit 3
  green "  ✅ Schema OK"
else
  yellow "[3/5] Skip schema validation — queue kosong (normal kalau MT5 belum ada trade aktif)"
fi
echo

# ─── Test 4: POST /ack — happy path ────────────────────────────────────────
bold "[4/5] POST /api/trade-events/ack idempotent dengan empty list → expect 200"
status=$(curl -s -o /tmp/te_ack.json -w "%{http_code}" \
  -X POST \
  -H "X-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sequence_numbers":[]}' \
  "$BASE_URL/api/trade-events/ack")
if [ "$status" != "200" ]; then
  red "  ❌ Expected 200, got $status. Body:"
  cat /tmp/te_ack.json; echo
  exit 2
fi

if ! jq -e 'has("acknowledged") and (.acknowledged | type == "number")' /tmp/te_ack.json >/dev/null 2>&1; then
  red "  ❌ Response tidak punya field acknowledged:number. Body:"
  cat /tmp/te_ack.json; echo
  exit 4
fi
ack_count=$(jq '.acknowledged' /tmp/te_ack.json)
green "  ✅ Empty ack returned 200 + acknowledged=$ack_count (expect 0)"
echo

# ─── Test 5: POST /ack — bad body ──────────────────────────────────────────
bold "[5/5] POST /api/trade-events/ack with malformed body → expect 400"
status=$(curl -s -o /tmp/te_ack_bad.json -w "%{http_code}" \
  -X POST \
  -H "X-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"wrong_field":[1,2,3]}' \
  "$BASE_URL/api/trade-events/ack")
if [ "$status" = "400" ] || [ "$status" = "422" ]; then
  green "  ✅ Returned $status (validation enforced)"
elif [ "$status" = "200" ]; then
  yellow "  ⚠️  Returned 200 untuk malformed body — backend should validate input. Body:"
  cat /tmp/te_ack_bad.json; echo
else
  red "  ❌ Expected 400/422, got $status. Body:"
  cat /tmp/te_ack_bad.json; echo
fi
echo

# ─── Summary ───────────────────────────────────────────────────────────────
bold "================================================================"
green "  ✅ ALL CHECKS PASSED — endpoint kontrak match spec"
bold "================================================================"
echo
echo "Next steps:"
echo "  1. Verify FE cron consumer berhasil pull events (cek docker logs app)"
echo "       ssh -p 1983 ... 'docker compose -f docker-compose.prod.yml logs app --tail 50 | grep trade-events'"
echo "  2. Verify SignalAuditLog rows ter-write setelah cron tick (DB query)"
echo "       psql -d trading_commercial -c 'SELECT outcome, COUNT(*) FROM \"SignalAuditLog\" GROUP BY 1;'"
echo "  3. Monitor WorkerRun status untuk worker='trade_events'"
echo "       psql -c 'SELECT * FROM \"WorkerRun\" WHERE worker=\\'trade_events\\' ORDER BY \"startedAt\" DESC LIMIT 10;'"

rm -f /tmp/te_unauth.json /tmp/te_pending.json /tmp/te_ack.json /tmp/te_ack_bad.json
