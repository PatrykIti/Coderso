# 763 - TASK-232 Reliability Gate Slow DB Timeout Hardening

- Date: 2026-04-28
- Version: Unreleased
- Tasks: TASK-232

## Key Changes

### Release Gates

- Increased the DB-backed install service test timeout to 90 seconds.
- Increased install service cleanup hook timeout to 60 seconds.
- Documented that remote DB-backed release-gate suites may need explicit timeout
  budgets instead of relying on Bun's default 5000 ms timeout.

## Validation

- Passed:
  - `set -a && source .env && set +a && bun test tests/unit/kits/installService.test.ts`
  - `set -a && source .env && set +a && bun scripts/coderso-release-gates.ts --gate reliability --report .tmp/coderso-release-gates-reliability-db.json`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run lint:repo:types`
  - `git diff --check`
