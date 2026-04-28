# 292 - TASK-058-06 Regression, Docs, and Closure

- **Date:** 2026-02-21
- **Version:** 0.1.292
- **Tasks:** TASK-058, TASK-058-06

## Key Changes

### Regression Stabilization
- Aligned `tests/unit/ui/page-list-filters.test.ts` with the current refresh policy contract:
  - `resolvePageListMountRefreshOptions` from `core/admin/ui/pages/PageListPage.tsx`
  - `resolveCacheRefreshBackground` from `core/admin/utils/cacheRefresh.ts`
- Removed stale dependency on the retired `resolvePagesRefreshBackground` helper.

### Task and Kanban Closure
- Closed `TASK-058-06` with final completion notes and command evidence.
- Closed umbrella `TASK-058` after final validation pass.
- Synchronized `_docs/_TASKS/README.md`:
  - moved `TASK-058-06` and `TASK-058` to Done,
  - updated task statistics counters.

### Documentation Sync
- Updated `_docs/ADMIN_CACHE.md` with final shell lifecycle and request-budget contract coverage.
- Updated `_docs/ARCHITECTURE.md` with explicit TASK-058 closure notes for cache/prefetch/global-read minimization.

## Tests and Validation
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test`

## Result
- TASK-058 is fully closed with passing lint/types/full test suite and synchronized docs/changelog/kanban state.
