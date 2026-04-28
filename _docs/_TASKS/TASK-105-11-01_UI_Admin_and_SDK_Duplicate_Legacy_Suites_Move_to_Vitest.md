# TASK-105-11-01: UI, Admin, and SDK Duplicate Legacy Suites Move to Vitest
# FileName: TASK-105-11-01_UI_Admin_and_SDK_Duplicate_Legacy_Suites_Move_to_Vitest.md

**Priority:** High  
**Category:** QA + Platform  
**Estimated Effort:** Medium  
**Dependencies:** TASK-105-11  
**Status:** Done (2026-03-12)

---

## Overview

Clean up the easiest remaining runner split mismatches: legacy Bun-free suites that already have direct or stronger Vitest equivalents.

This slice should not refactor product code.
It should:
- verify Vitest ownership already exists,
- remove duplicated Bun legacy suites,
- keep only the genuinely Bun-coupled suites under the touched folders.

## Scope

1. `tests/unit/ui/*`
2. Bun-free utility/client suites under `tests/unit/admin/*`
3. Bun-free export/helper suites under `tests/unit/sdk/*`

## Initial Target Files

- `tests/unit/ui/admin-link.test.tsx`
- `tests/unit/ui/admin-router-context.test.tsx`
- `tests/unit/ui/admin-shell-nav.test.tsx`
- `tests/unit/ui/utils.test.ts`
- `tests/unit/admin/adminPaths.test.ts`
- `tests/unit/admin/adminPrefetch.test.ts`
- `tests/unit/admin/cacheBus.test.ts`
- `tests/unit/admin/cacheRefresh.test.ts`
- `tests/unit/admin/permissionsCatalog.test.ts`
- `tests/unit/admin/searchClient.test.ts`
- `tests/unit/sdk/exports.test.ts`
- `tests/unit/sdk/hookContext.test.ts`

## Acceptance Criteria

1. Every removed Bun suite has a confirmed Vitest-owned replacement.
2. No DB/runtime-coupled suites are accidentally moved by this slice.
3. The touched directories run cleanly after the legacy duplicates are removed.

## Completion Notes

- Removed the legacy duplicate suites from `tests/unit/ui/*`.
- Removed the Bun-free duplicate suites from `tests/unit/admin/*` for `adminPaths`, `adminPrefetch`, `cacheBus`, `cacheRefresh`, `permissionsCatalog`, and `searchClient`.
- Removed the Bun-free duplicate SDK helper suites for `exports` and `hookContext`.
- Kept DB/runtime-coupled Bun suites in `tests/unit/admin/*` and `tests/unit/sdk/*` in place.

## Testing Requirements

- targeted `vitest` for the matching Vitest-owned files
- targeted `bun test` smoke for the remaining Bun suites in touched directories when applicable
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/TASK-105-11_Legacy_Bun_Free_Test_Migration_Cleanup.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*.md`
