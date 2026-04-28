# 276 - Coderso Release Gates Baseline

- **Date:** 2026-02-20
- **Version:** 0.1.276
- **Tasks:** TASK-054-19-01, TASK-054-19-02, TASK-054-19-03, TASK-054-19-04

## Key Changes

### Release Gate Contract
- Added `_docs/CODERSO_RELEASE_GATES.md` with mandatory gate matrix:
  - `functional`
  - `ux`
  - `performance`
  - `security`
  - `reliability`
- Added explicit pass/fail contract and command mapping.

### Gate Test Suites
- Added performance suite:
  - `tests/perf/codersoPerformanceGate.test.ts`
  - listing/filter p95 budgets (cached + cold)
  - admin route transition helper p95 budget
- Added security suite:
  - `tests/security/codersoSecurityGate.test.ts`
  - public/internal access baseline for forms/booking
  - nonce contract hardening
  - default rate-limit/bot-protection baseline assertions

### Runner + CI Wiring
- Added gate runner:
  - `scripts/coderso-release-gates.ts`
- Added package scripts:
  - `gates:coderso`
  - `gates:coderso:perf`
  - `gates:coderso:security`
- Added CI workflow:
  - `.github/workflows/coderso-release-gates.yml`

### Docs Updates
- Updated:
  - `_docs/SECURITY_SPEC.md`
  - `_docs/ADMIN_CACHE.md`
  - `_docs/README.md`

### Validation
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/perf/codersoPerformanceGate.test.ts tests/security/codersoSecurityGate.test.ts`
- `bun scripts/coderso-release-gates.ts --list`
- `bun scripts/coderso-release-gates.ts --gate performance`
- `bun scripts/coderso-release-gates.ts --gate security`
- `bun scripts/coderso-release-gates.ts --report .tmp/coderso-release-gates.json`

## Notes
- Parent task `TASK-054-19` stays In Progress until `TASK-054-199` (SAST/SCA/Secrets/CVE gate) is completed.
