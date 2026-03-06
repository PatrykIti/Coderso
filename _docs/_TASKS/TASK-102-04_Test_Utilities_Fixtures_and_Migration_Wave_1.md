# TASK-102-04: Test Utilities, Fixtures, and Migration Wave 1
# FileName: TASK-102-04_Test_Utilities_Fixtures_and_Migration_Wave_1.md

**Priority:** Medium  
**Category:** QA + Refactor Safety  
**Estimated Effort:** Large  
**Dependencies:** TASK-102-02, TASK-102-03  
**Status:** Done (2026-03-06)

---

## Overview

Prepare the repo so the first migrated suites do not rely on accidental Bun coupling.
This subtask is about utilities and seam extraction, not cosmetic runner swaps.

## Scope

1. Add shared test setup utilities for Vitest lanes.
2. Identify helper patterns currently tied to `bun:test`.
3. Create fixture guidance for runtime bundle tests versus pure UI/domain tests.
4. Migrate the first safe suites.

## Wave 1 Candidate Buckets

- `tests/unit/ui/*`
- `tests/unit/sdk/*`
- selected pure service suites
- Bun-free widget editor/validation suites

## Runtime Fixture Rules

- Keep real built bundle fixtures for plugin lifecycle tests.
- Do not replace runtime fixtures with fake mocks when the contract is bundle loading.
- Use Vitest fixtures only for non-runtime logic.

## Example Split

```ts
if (suite.dependsOnRealBundleLifecycle) {
  runInBunWithBuiltFixtureBundle(suite);
} else {
  runInVitestWithUnitFixtures(suite);
}
```

## Files to Create / Change

- `tests/setup/*`
- selected migrated suites in `tests/unit/*`
- optional shared fixture helpers
- docs describing fixture ownership

## Pseudocode

```ts
function chooseFixtureModel(suite: TestSuite) {
  if (suite.validatesRuntimeBundleInstall) return "real-built-bundle";
  if (suite.validatesPureUiLogic) return "vitest-ui-fixture";
  return "review";
}
```

## Acceptance Criteria

1. Migration helpers exist before mass suite moves start.
2. Wave 1 focuses on Bun-free suites with high signal and low runtime coupling.
3. Runtime fixture tests keep real bundle semantics.

## Testing Requirements

- Run migrated Vitest suites.
- Re-run adjacent Bun suites when shared helpers change.

## Documentation Updates Required

- `_docs/TESTING_STRATEGY.md`
- task notes for migrated suite groups

## Completion Notes (2026-03-06)

- Added shared Vitest setup helper in `tests/setup/vitest.ts`.
- Completed additive wave 1 migration through `tests/vitest/*` instead of rewriting legacy Bun suites in place.
- Left DB-backed/runtime bundle flows on Bun.
