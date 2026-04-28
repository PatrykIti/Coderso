# TASK-229: Coderso Release Gates Optional DB Checks
# FileName: TASK-229_Coderso_Release_Gates_Optional_DB_Checks.md

**Priority:** High
**Category:** CI/CD + QA + Release Gates
**Estimated Effort:** Small
**Dependencies:** TASK-054-19, TASK-217
**Status:** Done (2026-04-28)

---

## Overview

Make Coderso release gates resilient when a test database is not always
available. Pure release-gate checks must still run without `DATABASE_URL`, while
DB-backed smoke checks should run only when the repository secret is configured.

The immediate failure was the security gate importing
`core/services/settings/securitySettings.ts` only to read
`SECURITY_SETTINGS_DEFAULTS`, which imported `core/db/client.ts` at module load
time and failed with `DATABASE_URL is not set`.

## Sub-Tasks

- [x] Remove import-time DB coupling from `securitySettings.ts` by lazy-loading
  the DB client only inside async DB-backed functions.
- [x] Keep `tests/security/codersoSecurityGate.test.ts` pure so it can validate
  public-write defaults without a database.
- [x] Split DB-backed release-gate commands from pure security/reliability
  commands.
- [x] Move installer template seed coverage behind a Bun-free helper so the
  reliability gate can run catalog checks without importing `db/client`.
- [x] Point the nonce release-gate command at the existing Vitest-owned suite
  instead of the stale `tests/unit/forms/*` path.
- [x] Mark DB-backed gate commands as skipped when `DATABASE_URL` is missing.
- [x] Keep `.github/workflows/coderso-release-gates.yml` wired to
  `secrets.DATABASE_URL` when a maintained test DB is available.
- [x] Update release-gate docs, task board, and changelog.

## Files Changed

- `core/services/settings/securitySettings.ts`
- `core/services/kits/kitTemplateSeeds.ts`
- `core/services/kits/kitInstaller.ts`
- `scripts/coderso-release-gates.ts`
- `tests/unit/kits/kitInstaller.test.ts`
- `.github/workflows/coderso-release-gates.yml`
- `_docs/CODERSO_RELEASE_GATES.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/760-2026-04-28-task-229-coderso-release-gates-optional-db-checks.md`
- `_docs/_CHANGELOG/README.md`

## Security Contract

- Visibility: CI/local release-gate runner only.
- Auth model: unchanged; `DATABASE_URL` is read from GitHub Actions secrets when
  available.
- RBAC: unchanged.
- CSRF: not applicable; no admin/runtime HTTP route is added.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - pure public-write security checks stay mandatory without DB;
  - DB-backed security/reliability smoke checks are skipped only when
    `DATABASE_URL` is absent;
  - skipped DB checks are explicit in the JSON report with
    `skipReason: "database_url_missing"`;
  - no scanner/security severity is downgraded.

## Testing Requirements

- `bun test tests/security/codersoSecurityGate.test.ts` without `DATABASE_URL`
- `bun scripts/coderso-release-gates.ts --gate security --report .tmp/coderso-release-gates-security-no-db.json` without `DATABASE_URL`
- `bun scripts/coderso-release-gates.ts --gate reliability --report .tmp/coderso-release-gates-reliability-no-db.json` without `DATABASE_URL`
- `bun test tests/security/codersoSecurityGate.test.ts tests/unit/kits/kitInstaller.test.ts`
- `bun run test:vitest -- tests/vitest/forms/submissionNonce.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint:repo:types`
- YAML parse for `.github/workflows/coderso-release-gates.yml`
- `git diff --check`

## Documentation Updates Required

- `_docs/CODERSO_RELEASE_GATES.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

1. `tests/security/codersoSecurityGate.test.ts` no longer fails at import time
   when `DATABASE_URL` is absent.
2. Pure release-gate checks continue to run without a database.
3. DB-backed release-gate commands are explicit and report skipped status when
   `DATABASE_URL` is missing.
4. CI still runs DB-backed checks automatically when the `DATABASE_URL` secret is
   configured.
5. Release-gate docs explain the optional DB behavior.
