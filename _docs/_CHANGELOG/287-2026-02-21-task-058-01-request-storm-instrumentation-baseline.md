# 287 - TASK-058-01 Request Storm Instrumentation and Baseline

- **Date:** 2026-02-21
- **Version:** 0.1.287
- **Tasks:** TASK-058, TASK-058-01

## Key Changes

### Admin API Request Instrumentation
- Added request metrics collector for admin API traffic:
  - `core/admin/utils/requestMetrics.ts`
- Wired request metrics into admin API client request lifecycle:
  - `core/admin/services/apiClient.ts`
- Added localhost-first debug handle for manual inspection:
  - `window.__NEXTLESS_ADMIN_NET_DEBUG__`

### Baseline and Budgets
- Added request snapshot performance baseline test:
  - `tests/perf/admin-request-baseline.test.ts`
- Added default budget env:
  - `CODERSO_PERF_ADMIN_REQUEST_SNAPSHOT_P95_MS` (default `25ms`)

### Test Coverage
- Added unit coverage for metrics behavior:
  - `tests/unit/admin/requestMetrics.test.ts`
- Verified no regressions in related admin clients:
  - `tests/unit/admin/pagesClient.test.ts`
  - `tests/unit/admin/menusClient.test.ts`

### Documentation Sync
- Updated admin cache documentation with diagnostics and baseline details:
  - `_docs/ADMIN_CACHE.md`

## Tests and Validation
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/admin/requestMetrics.test.ts tests/perf/admin-request-baseline.test.ts tests/unit/admin/pagesClient.test.ts tests/unit/admin/menusClient.test.ts`

## Result
- TASK-058-01 is closed with measurable request instrumentation and a repeatable baseline for further cache/prefetch hardening tasks.
