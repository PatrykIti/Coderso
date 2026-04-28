# TASK-230: Bun Testing Lane Workflow Contract
# FileName: TASK-230_Bun_Testing_Lane_Workflow_Contract.md

**Priority:** High
**Category:** CI/CD + Testing Architecture
**Estimated Effort:** Small
**Dependencies:** TASK-102, TASK-104, TASK-229
**Status:** Done (2026-04-28)

---

## Overview

Align the Bun CI lane with the existing `vitest-lane` naming and behavior. The
previous workflow job was named `bun-coverage-baseline` and only exposed a
coverage step, which made the lane look like it was not running Bun tests.

The Bun lane should now run explicit Bun tests first and then Bun coverage, using
the same curated route/plugin/perf suite selection for both commands.

## Sub-Tasks

- [x] Rename the workflow job from `bun-coverage-baseline` to `bun-lane`.
- [x] Rename the Bun helper from `run-bun-coverage-baseline.ts` to
  `run-bun-lane.ts`.
- [x] Add `test:bun:lane` for the CI-safe curated Bun test command.
- [x] Keep `test:coverage:bun` on the same curated suite list but run coverage
  as a separate step.
- [x] Pass optional `DATABASE_URL` into the Bun lane so DB-backed route suites
  can join when the secret exists.
- [x] Update testing docs, task board, and changelog.

## Files Changed

- `.github/workflows/testing-lanes.yml`
- `package.json`
- `scripts/run-bun-lane.ts`
- `tests/README.md`
- `_docs/TESTING_STRATEGY.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/761-2026-04-28-task-230-bun-testing-lane-workflow-contract.md`
- `_docs/_CHANGELOG/README.md`

## Security Contract

- Visibility: CI/local test runner only; no runtime HTTP endpoint is added.
- Auth model: unchanged.
- RBAC: unchanged.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: not applicable.
- Anti-abuse: `DATABASE_URL` is consumed only from the GitHub Actions secret
  environment; absent secrets keep env-dependent suites skipped by the lane
  helper.

## Testing Requirements

- `bun scripts/run-bun-lane.ts --test`
- `bun scripts/run-bun-lane.ts --coverage`
- `bun run test:bun:lane`
- `bun run test:coverage:bun`
- `bun --cwd core lint:types`
- YAML parse for `.github/workflows/testing-lanes.yml`
- `git diff --check`

## Documentation Updates Required

- `tests/README.md`
- `_docs/TESTING_STRATEGY.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

1. GitHub Actions shows a `bun-lane` job next to `vitest-lane`.
2. `bun-lane` runs a plain Bun test step before Bun coverage.
3. `test:bun:lane` and `test:coverage:bun` use the same curated suite
   selection logic.
4. `DATABASE_URL` remains optional for the lane.
5. Active docs no longer point to `scripts/run-bun-coverage-baseline.ts`.
