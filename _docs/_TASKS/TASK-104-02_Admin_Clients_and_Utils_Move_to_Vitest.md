# TASK-104-02: Admin Clients and Utils Move to Vitest
# FileName: TASK-104-02_Admin_Clients_and_Utils_Move_to_Vitest.md

**Priority:** High  
**Category:** QA + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-104-01  
**Status:** Done (2026-03-06)

---

## Overview

Move the clearest Bun-free admin client and utility tests to Vitest.
This wave should remove low-value Bun coverage pressure from pure admin utilities.

## Candidate Test Areas

- `tests/unit/admin/*Client.test.ts`
- `tests/unit/admin/cacheBus.test.ts`
- `tests/unit/admin/cacheRefresh.test.ts`
- `tests/unit/admin/readThroughCache.test.ts`
- `tests/unit/admin/requestMetrics.test.ts`
- `tests/unit/admin/strictMode.test.ts`
- `tests/unit/admin/adminPrefetch.test.ts`
- `tests/unit/admin/admin-prefetch-policy.test.ts`

## Candidate Source Owners

- `core/admin/utils/cacheBus.ts`
- `core/admin/services/cachePolicy.ts`
- `core/admin/utils/adminPrefetch.ts`
- `core/admin/utils/requestMetrics.ts`
- `core/admin/utils/readThroughCache.ts`
- `core/admin/utils/storageCache.ts`

## Files to Create / Change

- `tests/vitest/admin/*`
- `vitest.config.ts`
- `tests/setup/vitest.ts`
- `tests/README.md`

## Pseudocode

```ts
for (const suite of adminClientAndUtilsSuites) {
  portAssertionsToVitest(suite);
  keepLegacyBunSuiteUntilParityIsProven(suite);
}
```

## Acceptance Criteria

1. Admin client/utils coverage shifts from Bun pressure to Vitest ownership.
2. Migrated suites run green in Vitest.
3. Bun baseline remains unchanged or improves after scope pressure is reduced.

## Testing Requirements

- `bun run test:vitest`
- `bun run test:coverage`

## Documentation Updates Required

- `tests/README.md`

## Completion Notes (2026-03-06)

- Migrated broad `tests/unit/admin/*` Bun-free suites into `tests/vitest/admin/*`.
- Added matcher compatibility in `tests/setup/vitest.ts` to smooth Bun -> Vitest migration.
