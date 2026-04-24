# 736. TASK-206 media cache lifecycle

**Date:** 2026-04-24
**Version:** Unreleased
**Tasks:** TASK-206, TASK-206-00, TASK-206-01, TASK-206-01-01, TASK-206-01-02, TASK-206-02, TASK-206-02-01, TASK-206-02-02, TASK-206-03, TASK-206-03-01, TASK-206-03-02

## Key Changes

### Shared Admin Cache

- Added a shared memory-backed storage cache helper so module-level list memory
  obeys the same TTL as the `localStorage` envelope.
- Moved Media, Pages, Menus, and Posts list clients onto the shared helper
  instead of keeping ad hoc list memory.
- Added a shared mount-refresh option helper for cache-present/background versus
  cache-missing/foreground list loading.

### Media Admin

- Updated `/admin/media` so fresh `media:list` cache hydrates the page without
  forced route-entry `GET /media`.
- Updated `MediaPicker` so closed/no-selection state stays idle and selected or
  opened state reuses fresh `media:list` before network fallback.
- Added storage-first cache event reads for Media same-tab updates so patched
  cache rows apply without a redundant full-list reload.

### Media Mutations

- Changed `POST /media` service response to return the full persisted media
  record.
- Updated upload, metadata update, dimension recovery, replace, and delete
  client flows to patch `media:list` and broadcast `update` instead of forcing
  broad invalidation for known row changes.

### Docs and QA

- Updated `_docs/ADMIN_CACHE.md`, `_docs/ADMIN_CACHE_MAP.md`, and
  `_docs/CMS_API.md` with the final cache lifecycle and upload response
  contract.
- Synced TASK-206 task files and `_docs/_TASKS/README.md`.

## Validation

- `bun run test:vitest -- tests/vitest/admin/storageCache.test.ts tests/vitest/admin/cacheRefresh.test.ts tests/vitest/admin/mediaClient.test.ts tests/vitest/admin/pagesClient.test.ts tests/vitest/admin/menusClient.test.ts tests/vitest/admin/postsClient.test.ts tests/vitest/ui/media-library.test.tsx tests/vitest/ui/media-picker.test.tsx`
- `DATABASE_URL=postgres://localhost:5432/nextless bun test tests/integration/routes/media.test.ts`
- `DATABASE_URL=postgres://localhost:5432/nextless bun test tests/unit/media/mediaService.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Notes

- No reachable DB-backed `.env`/`DATABASE_URL` was present in the worktree, so
  the media service suite was executed with a placeholder `DATABASE_URL` and
  skipped its DB-backed tests as designed. Route registration/error mapping
  tests passed with the same placeholder import guard.
- Additional root `bun run lint:repo` remains blocked by pre-existing
  `ContentTypeSummary` / `SelectOption` fixture type gaps in unrelated
  content/widgets/forms tests; the new TASK-206 Vitest files were covered by
  the targeted Vitest run and did not surface type failures there.
