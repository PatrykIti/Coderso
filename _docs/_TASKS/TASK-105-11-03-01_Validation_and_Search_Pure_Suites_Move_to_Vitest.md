# TASK-105-11-03-01: Validation and Search Pure Suites Move to Vitest
# FileName: TASK-105-11-03-01_Validation_and_Search_Pure_Suites_Move_to_Vitest.md

**Priority:** High  
**Category:** QA + Platform  
**Estimated Effort:** Medium  
**Dependencies:** TASK-105-11-03  
**Status:** Done (2026-03-12)

---

## Overview

Move the obviously Bun-free validation and search unit suites into `tests/vitest/*` while leaving DB-backed search persistence tests in Bun.

## Scope

1. `tests/unit/validation/*`
2. Bun-free part of `tests/unit/search/*`

## Initial Target Files

- `tests/unit/validation/bookingSchemas.test.ts`
- `tests/unit/validation/commerceSchemas.test.ts`
- `tests/unit/validation/filterSchemas.test.ts`
- `tests/unit/validation/postSchemas.test.ts`
- `tests/unit/validation/schemaValidator.test.ts`
- `tests/unit/validation/securitySettingsSchema.test.ts`
- `tests/unit/search/filterEngine.test.ts`
- `tests/unit/search/listingRuntimeService.test.ts`
- `tests/unit/search/searchIndexService.test.ts`
- `tests/unit/search/searchService.test.ts`

## Bun Keep In This Slice

- `tests/unit/search/searchHistoryService.test.ts`

## Progress Notes

Completed in this slice:
- moved all `tests/unit/validation/*` suites into `tests/vitest/validation/*`
- `tests/unit/search/filterEngine.test.ts`
- `tests/unit/search/listingRuntimeService.test.ts`
- `tests/unit/search/searchIndexService.test.ts`
- `tests/unit/search/searchService.test.ts`

Kept in Bun:
- `tests/unit/search/searchHistoryService.test.ts`

Refactor delivered in this slice:
- removed import-time `db/client` coupling from the pure `search*` module paths so the moved Vitest suites can import them safely without `DATABASE_URL`

## Acceptance Criteria

1. Validation schema tests no longer depend on `bun:test`.
2. Pure search logic tests move to Vitest without changing behavior.
3. DB-backed `searchHistoryService` remains in Bun.

## Testing Requirements

- targeted `vitest`
- targeted `bun test tests/unit/search/searchHistoryService.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/TASK-105-11-03_Refactor_First_Cluster_Ownership_Audit.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*.md`
