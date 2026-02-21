# 290 - TASK-058-04 Admin Prefetch Policy Rework

- **Date:** 2026-02-21
- **Version:** 0.1.290
- **Tasks:** TASK-058, TASK-058-04

## Key Changes

### Prefetch Policy Hardening
- Refactored admin prefetch orchestration in `core/admin/utils/adminPrefetch.ts`.
- Prefetch now uses cache warmup semantics (`force: false`) via `prefetchWarmupOptions`.
- Added active-route/module skip logic using `activeHref` context.
- Added freshness and throttling guards:
  - `freshMs` (recently warmed route skip),
  - `cooldownMs` (attempt throttling).
- Added low-priority queue with bounded parallelism (`maxConcurrency`) to prevent request bursts.

### Router Integration
- Updated `core/admin/ui/contexts/AdminRouterContext.tsx` to pass current route as `activeHref` into prefetch calls.

### Test Coverage
- Added unit policy tests:
  - `tests/unit/admin/admin-prefetch-policy.test.ts`
- Added perf/budget gate:
  - `tests/perf/admin-prefetch-budget.test.ts`
- Existing alias/canonicalization tests continue to validate compatibility:
  - `tests/unit/admin/adminPrefetch.test.ts`

### Documentation Sync
- Updated `_docs/ADMIN_CACHE.md` with prefetch policy and budget notes.
- Updated `_docs/ARCHITECTURE.md` with cache-warmup prefetch rules.

## Tests and Validation
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/admin/adminPrefetch.test.ts tests/unit/admin/admin-prefetch-policy.test.ts tests/perf/admin-prefetch-budget.test.ts`

## Result
- TASK-058-04 is closed with deterministic low-cost prefetch behavior and request-budget regression gates.
