# TASK-232: Reliability Gate Slow DB Timeout Hardening
# FileName: TASK-232_Reliability_Gate_Slow_DB_Timeout_Hardening.md

**Priority:** High
**Category:** CI/CD + Release Gates + Reliability
**Estimated Effort:** Small
**Dependencies:** TASK-229, TASK-231
**Status:** Done (2026-04-28)

---

## Overview

Stabilize the DB-backed reliability gate on the slower shared Render test
database. `tests/unit/kits/installService.test.ts` exceeded Bun's default
per-test timeout in CI and the cleanup hook could also time out at 5000 ms.

The suite owns install/rollback behavior against mutable shared tables and must
use a timeout budget that matches remote DB latency.

## Sub-Tasks

- [x] Increase DB-backed install service test timeout to 90 seconds.
- [x] Increase DB cleanup hook timeout to 60 seconds.
- [x] Re-run the install service suite against `.env` outside the sandbox.
- [x] Re-run the reliability gate against `.env` outside the sandbox.
- [x] Update release-gate docs, task board, and changelog.

## Files Changed

- `tests/unit/kits/installService.test.ts`
- `_docs/CODERSO_RELEASE_GATES.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/763-2026-04-28-task-232-reliability-gate-slow-db-timeout-hardening.md`
- `_docs/_CHANGELOG/README.md`

## Security Contract

- Visibility: test harness only; no runtime HTTP endpoint is added.
- Auth model: unchanged.
- RBAC: unchanged.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: unchanged.
- Anti-abuse: no security scanner or runtime protection is downgraded; DB-backed
  reliability tests still execute when `DATABASE_URL` is available, only with a
  remote-DB-safe timeout budget.

## Testing Requirements

- `set -a && source .env && set +a && bun test tests/unit/kits/installService.test.ts`
- `set -a && source .env && set +a && bun scripts/coderso-release-gates.ts --gate reliability --report .tmp/coderso-release-gates-reliability-db.json`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint:repo:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/CODERSO_RELEASE_GATES.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

1. `tests/unit/kits/installService.test.ts` passes against the configured
   `.env` database.
2. `bun scripts/coderso-release-gates.ts --gate reliability` passes with
   `DATABASE_URL` configured.
3. Slow DB latency no longer fails the suite at Bun's default 5000 ms timeout.
