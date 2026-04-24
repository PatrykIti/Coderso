# TASK-207-01-02: Entries Client Cache, Prefetch, and Cache Map
# FileName: TASK-207-01-02_Entries_Client_Cache_Prefetch_and_Cache_Map.md

**Priority:** High
**Category:** Admin/UI + Admin Cache
**Estimated Effort:** Medium
**Dependencies:** TASK-207-01-01
**Status:** To Do

---

## Overview

Expose the cross-type list through `entriesClient` and align cache policy,
prefetch, assistant cache events, and docs.

The new all-entries list cache is additive. Type-scoped caches remain the owner
for editor/detail flows and relation/widget selectors.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/services/cachePolicy.ts`
  - add a cache key such as `entriesAllList: "entries:list:all"`.
- `core/admin/services/entriesClient.ts`
  - add `EntryListItem`,
  - add `listAllEntries`, `listAllEntriesCached`, `getCachedAllEntries`, and
    `clearAllEntriesCache`,
  - update create/update/metadata/duplicate/delete/publish/unpublish helpers to
    update or invalidate the all-entries cache in addition to the type-scoped
    cache.
- `core/admin/utils/adminPrefetch.ts`
  - warm `/coderso/entries` with content types and the all-entries list if it
    stays inside prefetch budgets.
- `core/admin/services/assistantClient.ts`
  - invalidate the all-entries list on strict `entry.*` action results.
- `tests/vitest/admin/entriesClient.test.ts`
- `tests/vitest/admin/adminPrefetch.test.ts`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`

## Security Contract

- Visibility: internal admin client cache only.
- Auth/RBAC/CSRF/rate-limit: inherited from the underlying read and mutation
  routes.
- Reject-unknown validation: no client-side schema bypass; trust only validated
  server responses.
- Anti-abuse: do not cache preview tokens, secret headers, provider keys, or
  privileged settings.

## Testing Requirements

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/entriesClient.test.ts tests/vitest/admin/adminPrefetch.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. The all-entries list cache has a documented cache key.
2. Entries list mutations invalidate or refresh both the touched type-scoped list
   and the all-entries list.
3. Assistant `entry.*` execution cache events cannot leave the all-entries list
   stale.
4. `/coderso/entries` prefetch remains bounded and tested.
