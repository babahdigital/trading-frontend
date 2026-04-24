#!/usr/bin/env bash
# Sync backend contract docs dari repo trading-forex ke trading-apifrontend/docs/backend-contract/.
# Source of truth: D:/Data/Projek/trading-forex/docs/
# Jalankan setiap kali backend ship update docs (weekly atau post-PR merge).
#
# Usage:
#   bash scripts/sync-backend-docs.sh
#
# Tingkatan docs:
#   01-primary: API contract foundation (WAJIB untuk build)
#   02-context: UI decision support (kualitas UX)
#   03-adr:     architectural rationale (4 ADR relevant FE)
#   04-legal:   legal docs (copy saat counsel review selesai — saat ini kosong)

set -euo pipefail

SRC="D:/Data/Projek/trading-forex/docs"
DST="D:/Data/Projek/trading-apifrontend/docs/backend-contract"

if [[ ! -d "$SRC" ]]; then
  echo "ERROR: backend docs not found at $SRC" >&2
  exit 1
fi

mkdir -p "$DST/01-primary" "$DST/02-context" "$DST/03-adr" "$DST/04-legal"

echo "[sync] Tier 1 — Primary (7 files)"
cp "$SRC/BABAHALGO_INTEGRATION.md"   "$DST/01-primary/"
cp "$SRC/PUBLIC_API.md"              "$DST/01-primary/"
cp "$SRC/COMMERCIAL_LICENSING.md"    "$DST/01-primary/"
cp "$SRC/API_VERSIONING_POLICY.md"   "$DST/01-primary/"
cp "$SRC/TIMEZONE_BRIDGE.md"         "$DST/01-primary/"
cp "$SRC/EXECUTION_CLOUD.md"         "$DST/01-primary/"
cp "$SRC/INDEX.md"                   "$DST/01-primary/"

echo "[sync] Tier 2 — Context (8 files)"
cp "$SRC/MULTI_BROKER.md"            "$DST/02-context/"
cp "$SRC/MARKET_DATA_CATALOG.md"     "$DST/02-context/"
cp "$SRC/INDICATOR_CATALOG.md"       "$DST/02-context/"
cp "$SRC/NEWS_DB_DESIGN.md"          "$DST/02-context/"
cp "$SRC/MONETIZATION_STRATEGY.md"   "$DST/02-context/"
cp "$SRC/PAMM_AFFILIATE_STRATEGY.md" "$DST/02-context/"
cp "$SRC/INSTITUTIONAL_ALIGNMENT.md" "$DST/02-context/"
cp "$SRC/AI_INTEGRATION.md"          "$DST/02-context/"

echo "[sync] Tier 3 — ADR (4 files)"
cp "$SRC/adr/ADR-005-microservices-extraction.md"        "$DST/03-adr/"
cp "$SRC/adr/ADR-009-idempotency-key-pattern.md"         "$DST/03-adr/"
cp "$SRC/adr/ADR-013-multi-broker-abstraction-pattern.md" "$DST/03-adr/"
cp "$SRC/adr/ADR-014-paper-trading-mode.md"              "$DST/03-adr/"

echo "[sync] Tier 4 — Legal (conditional — skip jika source belum ada)"
for f in Privacy.md Affiliate_Disclosure.md Risk_Disclosure.md Cookie_Policy.md; do
  if [[ -f "$SRC/$f" ]]; then
    cp "$SRC/$f" "$DST/04-legal/"
    echo "  + $f"
  fi
done
if [[ -d "$SRC/legal" ]]; then
  cp -r "$SRC/legal/." "$DST/04-legal/legal/" 2>/dev/null || mkdir -p "$DST/04-legal/legal" && cp -r "$SRC/legal/." "$DST/04-legal/legal/"
fi

TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
cat > "$DST/.sync-manifest.txt" <<EOF
Last sync: $TS
Source: $SRC
Script: scripts/sync-backend-docs.sh
Files: $(find "$DST" -name "*.md" | wc -l)
EOF

echo "[sync] Done. Synced $(find "$DST" -name "*.md" | wc -l) files at $TS"
echo "[sync] Manifest: $DST/.sync-manifest.txt"
