# TASK-231: CI Security and Release Gate Fixes
# FileName: TASK-231_CI_Security_and_Release_Gate_Fixes.md

**Priority:** High
**Category:** CI/CD + Security + Release Gates
**Estimated Effort:** Small
**Dependencies:** TASK-217, TASK-229, TASK-230
**Status:** Done (2026-04-28)

---

## Overview

Fix the next CI failures surfaced by PR #1:

- `security-gate` failed while uploading SARIF because the job had
  `security-events: write` but not `actions: read`, and the workflow still used
  deprecated `github/codeql-action/upload-sarif@v3`.
- `coderso-release-gates` failed in the DB-backed
  `tests/unit/server/publicBookingApi.test.ts` suite on the shared Render test
  database. The test file used one global cleanup against shared booking tables
  while DB tests could run in parallel, so tests deleted each other's service,
  resource, and schedule rows. On the slower remote DB this also hit Bun's
  default 5000 ms per-test timeout.

## Sub-Tasks

- [x] Add `actions: read` to the security gate job permissions.
- [x] Upgrade all SARIF uploads from `github/codeql-action/upload-sarif@v3` to
  `github/codeql-action/upload-sarif@v4`.
- [x] Cover the security workflow permission/action contract in
  `securityGateConfig.test.ts`.
- [x] Run DB-backed public booking API tests serially.
- [x] Increase only the DB-backed public booking API test timeout to 30 seconds.
- [x] Re-run the DB-backed security release gate against `.env` outside the
  sandbox.
- [x] Update security/release-gate docs, task board, and changelog.

## Files Changed

- `.github/workflows/security-gate.yml`
- `tests/unit/security/securityGateConfig.test.ts`
- `tests/unit/server/publicBookingApi.test.ts`
- `_docs/SECURITY_SPEC.md`
- `_docs/CODERSO_RELEASE_GATES.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/762-2026-04-28-task-231-ci-security-and-release-gate-fixes.md`
- `_docs/_CHANGELOG/README.md`

## Security Contract

- Visibility: CI-only workflow and test harness changes; no runtime HTTP
  endpoint is added.
- Auth model: unchanged.
- RBAC: unchanged.
- CSRF: not applicable.
- Rate-limit bucket: unchanged; public booking route rate-limit behavior remains
  covered by the same tests.
- Reject-unknown validation: unchanged.
- Anti-abuse: SARIF upload keeps least privilege with `contents: read`,
  `actions: read`, and `security-events: write`; DB-backed public booking tests
  still validate nonce/API-key access and now avoid shared-fixture races.

## Testing Requirements

- `bun test tests/unit/security/securityGateConfig.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/server/publicBookingApi.test.ts`
- `set -a && source .env && set +a && bun scripts/coderso-release-gates.ts --gate security --report .tmp/coderso-release-gates-security-db.json`
- YAML parse for `.github/workflows/security-gate.yml`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
- `_docs/CODERSO_RELEASE_GATES.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

1. `security-gate` SARIF upload no longer fails with
   `Resource not accessible by integration` for workflow run metadata.
2. Security gate uses `github/codeql-action/upload-sarif@v4`.
3. Public booking DB smoke tests do not race on shared booking tables.
4. The security release gate passes against the configured `.env` database.
