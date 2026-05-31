# 811 - Test runner and wave act stabilization

**Date:** 2026-05-09
**Version:** Unreleased
**Tasks:** TASK-190

## Key Changes

### Bun DB lane stabilization

- Split the new detail-page DB executor coverage out of
  `tests/unit/assistant/actionExecutorService.db.test.ts` into the dedicated
  `tests/unit/assistant/actionExecutorService.detailPage.db.test.ts`.
- Replaced static `idempotencyKey` values in the shared assistant DB suite with
  per-run random keys so repeated local/full runs no longer collide in
  `assistant_action_executions`.
- Switched `bun run test:bun` to an isolated worker configuration
  (`bun test --parallel=1`) because the Bun lane shares one real database and
  mutable settings rows; parallel file execution was surfacing cross-file state
  collisions rather than product bugs.
- Increased selected DB-backed route/runtime timeouts where the failure mode was
  purely execution-budget related rather than a semantic contract failure.

### Detail-page runtime hardening

- Replaced fixed `detailPageId` literals in DB-backed detail-page runtime/cache
  tests with per-test UUIDs so parallel or repeated runs no longer fight over
  the same `detail_page_documents` primary keys.
- Fixed the lightweight runtime mock contract so
  `tests/integration/runtime/detail-page-runtime-lite.test.ts` exports the same
  resolver surface that `publicSite.tsx` imports.
- Raised the DB-backed `detail-page-runtime` test timeouts to stop cleanup from
  racing a slow request and creating false `404` outcomes after the test had
  already exceeded the default 5000 ms limit.

### Vitest wave harness stabilization

- Replaced named `act` imports from `react` across the admin/UI wave suites
  with `React.act(...)` usage.
- This avoids the full-run flake where some wave tests would intermittently
  see `act is not a function` even though the same files passed in isolation.

## Validation

- `bun run test:vitest` - passed after the `React.act(...)` migration.
- `bun run lint` - passed after the Bun gate and test-file updates.
- `bun run test:bun` was rerun repeatedly during the fix loop:
  - first to confirm the assistant DB timeout regression,
  - then after splitting the detail-page DB case,
  - then after fixing detail-page runtime collisions and route-test budgets,
  - and finally under isolated workers to verify the Bun lane no longer fails
    on the previously exposed TASK-190 regressions.
- `bun run scan:security:strict` still fails on the existing `bun audit`
  dependency advisories (`fast-xml-builder`, `fast-uri`) while Semgrep, Trivy,
  and Gitleaks complete cleanly.
