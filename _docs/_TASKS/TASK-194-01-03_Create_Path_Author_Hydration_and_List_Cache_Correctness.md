# TASK-194-01-03: Create Path Author Hydration and List Cache Correctness
# FileName: TASK-194-01-03_Create_Path_Author_Hydration_and_List_Cache_Correctness.md

**Priority:** High
**Category:** CMS/Pages + Admin/UI + Cache
**Estimated Effort:** Medium
**Dependencies:** TASK-194-01
**Status:** To Do

---

## Overview

Fix the `N Unknown` author symptom for newly created Pages without inventing a
second author contract. This leaf also has to stop conflating two different
states in the author column:

- stale authorless cache after create/duplicate,
- genuinely missing owner data from the persisted list payload.

Current code strongly suggests the problem is client cache semantics, not the
route permission path:

- `core/server/routes/pageRoutes.ts:77-92` already passes `authorId: ctx.user?.id`
  on create.
- `tests/integration/routes/pages.test.ts:291-305` already asserts that
  `created.authorId` equals the current actor.
- `core/admin/services/pagesClient.ts:200-215` primes the pages list cache from
  the raw create response, which does not contain resolved `author`.
- `core/admin/ui/pages/PageListPage.tsx:51-56` and `104-107` reuse cached list
  data on mount without forcing a network roundtrip when cache exists.

That combination lets the list show a synthetic authorless summary even though
the DB row already has the correct `authorId`.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/services/pagesClient.ts:93-132`
  - stop treating partial mutation payloads as authoritative list summaries when
    they cannot hydrate `author`.
- `core/admin/services/pagesClient.ts:200-215`
  - repair create-path cache priming.
- `core/admin/services/pagesClient.ts:292-303`
  - apply the same cache rule to duplicate if it reuses the same partial shape.
- `core/admin/ui/pages/PageTable.tsx:147-163`
  - render a neutral missing-author fallback for true `author: null` payloads
    instead of reusing the same `Unknown` label that currently hides cache
    corruption.
- `core/admin/ui/pages/PageListPage.tsx:51-56`
  - revisit mount-refresh options once synthetic list cache can be invalidated.
- `core/admin/ui/pages/PageListPage.tsx:60-72`
  - preserve fast cached render, but not at the cost of stale author identity.
- `core/admin/ui/pages/PageListPage.tsx:148-168`
  - ensure create/open-after-create does not leave the next list mount on stale
    partial cache only.
- `tests/vitest/ui/page-post-list-wave.test.tsx:738-849`
- `tests/vitest/ui/page-list-cache-behavior.test.tsx`
- `tests/integration/routes/pages.test.ts:291-305` only as a guard that the
  server author assignment remains correct

## Implementation Direction

Primary direction:

- keep server route shape stable,
- treat create/duplicate mutation responses as detail-cache-worthy but not
  authoritative list-summary data when `author` is unresolved,
- invalidate or mark the pages list cache stale so the next list mount fetches a
  real list snapshot,
- reserve the neutral missing-author UI only for real server payloads with
  `author: null`.

Only widen server payloads if the client-only cache fix proves insufficient.

## Implementation Sketch

```ts
if (created) {
  writePageDetailCache(created);
  clearPagesCache();
  broadcastCacheEvent({ key: cacheKeys.pagesList, action: "invalidate" });
  broadcastCacheEvent({ key: cacheKeys.pageDetail(created.id), action: "update" });
}
```

## Security Contract

- Visibility: internal admin cache correctness only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: the fix must not synthesize author identity from browser-local
  guesses; it must reconcile against a server-owned list payload.

## Testing Requirements

- `tests/vitest/ui/page-post-list-wave.test.tsx`
  - create with open-after-create does not leave `Unknown` in the next list view.
- `tests/vitest/ui/page-list-cache-behavior.test.tsx`
  - mount refresh semantics stay fast when cache is trustworthy and re-fetch when
    the list cache was invalidated by create/duplicate.
- `tests/vitest/ui/page-table-wave.test.tsx`
  - `author: null` uses neutral fallback copy/tooling that is distinct from the
    stale-cache symptom.
- `tests/integration/routes/pages.test.ts`
  - keep the existing `authorId` assertion green if server code is touched.

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md` if pages-list invalidation semantics change materially
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. A page created in the current admin flow does not show `Unknown` author on
   the list because of stale client cache.
2. The fix does not rely on browser-local synthetic author names.
3. Real missing-author payloads render as a neutral, intentional fallback state.
4. Cached list rendering remains fast, but stale partial mutation payloads stop
   being treated as authoritative list state.
