# Phase 1 Integration Tests

End-to-end validation for the customer-vps-template deliverables.

## Prerequisites

- Docker running locally (for license-middleware image build + run)
- SSH access to a test VPS (Contabo trial, DigitalOcean droplet, etc.) — used by `test_provision_e2e.sh`
- Python 3.11+ with `pytest` installed (for license-middleware unit tests)

## Test Inventory

| Script | Type | Scope | Runtime |
|--------|------|-------|---------|
| `test_provision_e2e.sh` | E2E | Full provisioning: zero → healthy VPS → rollback | 20–30 min |
| `test_license_mw.sh` | Unit + Manual Integration | License middleware pytest + 2-min live run | 3–5 min |
| `test_seed_apply.sh` | Smoke | Validate seed bundle tooling + checksums | < 30s |

## Run All Tests

```bash
# Set test VPS IP (required for E2E provisioning test)
export TEST_VPS_IP=x.x.x.x
export TEST_SSH_USER=root   # or abdullah
export TEST_SSH_PORT=22     # or 1983 for babahdigital VPS

cd customer-vps-template

# 1. Seed apply smoke test (no VPS required)
./tests/test_seed_apply.sh

# 2. License middleware (requires Docker locally)
./tests/test_license_mw.sh

# 3. Full E2E provisioning (requires TEST_VPS_IP)
./tests/test_provision_e2e.sh
```

## Expected Results

All tests should pass with green output.

- `test_seed_apply.sh` — completes in < 30s
- `test_license_mw.sh` — 13 pytest tests pass, docker image builds, 2-min run logs 2 license check attempts
- `test_provision_e2e.sh` — provisions fresh VPS in < 30 min, verify-health reports all 6 services healthy, rollback leaves VPS clean

Total runtime for full suite: 45–60 min (dominated by `test_provision_e2e.sh`).

## Phase 1 Gate Criteria

Phase 1 is complete when:

1. ✅ `docker compose -f docker-compose.customer.yml config` validates without errors
2. ✅ `pytest` in `license-middleware/tests/` reports 100% pass
3. ✅ All 5 scripts in `scripts/` pass `bash -n` syntax check
4. ✅ `test_provision_e2e.sh` completes end-to-end on a fresh VPS
5. ✅ License middleware image builds and polls VPS2 at the configured interval
