# 267 - Solution Kits Admin UI: Runs, Cache, and Prefetch

- **Date:** 2026-02-19
- **Version:** 0.1.267
- **Tasks:** TASK-054-13, TASK-054-13-04

## Key Changes

### Admin Client
- Extended solution kits client with install execution APIs:
  - `listSolutionKitRunsCached`
  - `getSolutionKitRunCached`
  - `applySolutionKit`
  - `rollbackSolutionKit`
- Added response guards for run/result payloads.
- Added cache + invalidation paths for runs list/detail:
  - `solutionKits:runs:list:<kitId|all>`
  - `solutionKits:runs:detail:<runId>`

### Admin UI
- Upgraded `/admin/coderso/solution-kits` with:
  - install action card (`Apply`, `Dry run`, `Rollback latest apply`),
  - run history list with selection,
  - run summary/detail preview,
  - loading/error/success states.
- Added hook:
  - `core/admin/ui/kits/hooks/useSolutionKitRuns.ts`

### Cache and Prefetch
- Prefetch for `/coderso/solution-kits` now preloads:
  - solution kits list
  - solution kit runs list
- Files:
  - `core/admin/services/cachePolicy.ts`
  - `core/admin/utils/adminPrefetch.ts`
  - `_docs/ADMIN_CACHE.md`

### Tests
- Updated/added tests:
  - `tests/unit/admin/solutionKitsClient.test.ts`
  - `tests/unit/ui/solution-kits-page.test.tsx`
  - `tests/unit/admin/adminPrefetch.test.ts`

