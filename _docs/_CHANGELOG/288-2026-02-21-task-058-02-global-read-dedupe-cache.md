# 288 - TASK-058-02 Global Read Dedupe Cache

- **Date:** 2026-02-21
- **Version:** 0.1.288
- **Tasks:** TASK-058, TASK-058-02

## Key Changes

### Shared Read-Through Cache Utility
- Added reusable in-memory read-through cache helper with TTL and in-flight dedupe:
  - `core/admin/utils/readThroughCache.ts`

### Global Admin Reads Stabilization
- Added dedupe cache for user settings reads and mutation-aware invalidation:
  - `core/admin/services/userSettingsClient.ts`
- Added dedupe cache for assistant status reads and invalidation after reindex:
  - `core/admin/services/assistantClient.ts`
- Added dedupe cache for admin theme profile reads and invalidation on profile mutations:
  - `core/admin/services/adminThemeClient.ts`

### Test Coverage
- Added utility and client cache tests:
  - `tests/unit/admin/readThroughCache.test.ts`
  - `tests/unit/admin/userSettingsClient.test.ts`
- Extended existing suites with dedupe/invalidation coverage:
  - `tests/unit/admin/assistantClient.test.ts`
  - `tests/unit/admin/adminThemeClient.test.ts`

### Documentation Sync
- Updated admin cache documentation with global read dedupe contract:
  - `_docs/ADMIN_CACHE.md`

## Tests and Validation
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/admin/readThroughCache.test.ts tests/unit/admin/userSettingsClient.test.ts tests/unit/admin/assistantClient.test.ts tests/unit/admin/adminThemeClient.test.ts`

## Result
- TASK-058-02 is closed with shared global read dedupe, explicit invalidation paths, and regression coverage.
