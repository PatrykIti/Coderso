# TASK-102-06: Custom Screens and Admin Nav Vitest Migration
# FileName: TASK-102-06_Custom_Screens_and_Admin_Nav_Vitest_Migration.md

**Priority:** Medium  
**Category:** QA/Platform + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-102-02, TASK-102-04, TASK-054-22-07  
**Status:** Done (2026-03-06)

---

## Overview

Uporzadkowac runner ownership dla zakresu `custom screens + admin navigation`
zgodnie z docelowym modelem z `_docs/TESTING_STRATEGY.md`.

Cel:
- Bun-free UI/admin/domain tests przeniesc do `tests/vitest/*`,
- zostawic w Bun tylko testy runtime route family oraz DB-backed custom screen service,
- potwierdzic parity przez targeted `bun` + `vitest` runs.

---

## Scope

1. Przeniesc Bun-free testy custom screens i nav do `tests/vitest/*`.
2. Utrzymac Bun dla:
   - `tests/unit/customScreens/customScreenService.test.ts`
   - `tests/integration/routes/customScreensRoutes.test.ts`
3. Usunac zdublowane Bun-free suite z legacy `tests/unit|integration`, jesli parity jest potwierdzone.
4. Rozszerzyc coverage include w Vitest dla touched Bun-free custom screen/domain/admin surfaces, jesli wymagane.

## Non-Goals

1. Masowa migracja innych modulow poza `custom screens + admin nav`.
2. Zmiana runner ownership dla DB-backed lub route/runtime suites.

## Files to Create / Change

- `vitest.config.ts`
- `tests/vitest/admin/*`
- `tests/vitest/ui/*`
- `tests/unit/customScreens/customScreenService.test.ts` (Bun ownership only, keep)
- `tests/integration/routes/customScreensRoutes.test.ts` (Bun ownership only, keep)
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`

## Pseudocode

```ts
if (suite.dependsOnDb || suite.validatesRouteRuntimeContract) {
  keepRunner("bun");
} else {
  migrateSuite("vitest");
}
```

## Acceptance Criteria

1. Bun-free tests for custom screens/admin nav live under `tests/vitest/*`.
2. Bun still owns DB-backed custom screen service and route registration coverage.
3. Targeted `bun` and `vitest` commands pass for this scope.
4. Changelog and task board explicitly record the migration.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest`
- targeted Bun tests for remaining Bun-owned custom screen suites

## Documentation Updates Required

- `_docs/_CHANGELOG/README.md`
- `_docs/_TASKS/README.md`
