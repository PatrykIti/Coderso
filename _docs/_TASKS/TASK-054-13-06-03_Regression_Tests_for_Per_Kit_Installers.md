# TASK-054-13-06-03: Regression Tests for Per-Kit Installers
# FileName: TASK-054-13-06-03_Regression_Tests_for_Per_Kit_Installers.md

**Priority:** High  
**Category:** QA/Tests  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-13-06-02  
**Status:** Done (2026-02-20)

---

## Overview
Dodać regresję pokrywającą pełny pack installer: każdy kit instaluje working set, reinstall jest idempotentny, rollback przywraca nested metadata.

## Scope
1. Unit tests katalogu kitów (pack completeness + deterministic constraints).
2. DB-backed installer tests dla:
   - apply,
   - apply again (noop/idempotent),
   - rollback.
3. Route/client tests dla apply payload compatibility z nowym pack schema.

## Files
- `tests/unit/kits/solutionKitsCatalog.test.ts` (new)
- `tests/unit/kits/installService.test.ts`
- `tests/unit/admin/solutionKitsClient.test.ts` (if required)

## Pseudocode
```ts
for (const kit of listSolutionKitsCatalog()) {
  const result = await applySolutionKitInstall({ kitId: kit.id, dryRun: false })
  expect(result.summary.total).toBeGreaterThan(0)
  const second = await applySolutionKitInstall({ kitId: kit.id, dryRun: false })
  expect(second.summary.operations.noop).toBeGreaterThan(0)
}
```

## Testing Requirements
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- touched unit/integration suites
- DB tests when `DATABASE_URL` available

## Documentation Updates Required
- `_docs/_TASKS/README.md` (status progression)
