# TASK-206-00: Admin Cache In-Memory TTL Contract
# FileName: TASK-206-00_Admin_Cache_In_Memory_TTL_Contract.md

**Priority:** High
**Category:** Admin/Cache + Performance
**Estimated Effort:** Medium
**Dependencies:** TASK-206
**Status:** To Do

---

## Overview

Fix the shared admin cache TTL contract before Media starts depending on
expired-cache fallback behavior.

Current owner truth:

- `storageCache.ts` enforces TTL for `localStorage` envelopes.
- Several admin clients also keep module-level in-memory list caches.
- Once those module caches are populated, their `getCached*()` methods can
return stale rows without re-checking the storage envelope TTL.
- The issue is generic. Do not fix it with a Media-only branch in
  `mediaClient.ts`.

This leaf makes the in-memory cache path timestamp-aware through a shared helper
or an equivalent generic pattern, then applies that pattern to the list clients
that TASK-206 relies on.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/utils/storageCache.ts`
- `core/admin/services/mediaClient.ts`
- `core/admin/services/pagesClient.ts`
- `core/admin/services/menusClient.ts`
- `core/admin/services/postsClient.ts`
- `tests/vitest/admin/storageCache.test.ts`
- `tests/vitest/admin/mediaClient.test.ts`
- `tests/vitest/admin/pagesClient.test.ts`
- `tests/vitest/admin/menusClient.test.ts`
- `tests/vitest/admin/postsClient.test.ts`
- `_docs/ADMIN_CACHE.md`
- `_docs/_TASKS/README.md`

## Implementation Direction

- Keep TTL ownership in the shared cache layer or a reusable cache-client helper.
- In-memory cache entries must carry enough timestamp state to know whether they
  are still fresh.
- Expired in-memory entries must not be returned by `getCached*()` or
  `list*Cached({ force: false })`.
- Expired in-memory entries should fall through to the existing storage-backed
  read path, which already clears expired envelopes, and then to the normal
  network read path when no fresh cache remains.
- Preserve existing mutation behavior: cache patch helpers may still prime
  memory and storage together after a successful mutation.
- Do not add a Media-only TTL check, a second browser storage key, or a new
  cache bus action.
- Do not change the TTL duration unless a separate product task explicitly
  changes `cacheTtlMs`.
- If implementation cannot safely migrate every admin client in one leaf, keep
  this leaf scoped to Media plus Pages/Menus/Posts and document the remaining
  clients as follow-up work.

## Pseudocode

One acceptable shape is a shared memory-backed cache helper:

```ts
const mediaListCache = createMemoryBackedLocalCache({
  key: cacheKeys.mediaList,
  ttlMs: cacheTtlMs.list,
  validate: isMediaList,
});

export const getCachedMedia = () => mediaListCache.read();

const primeMediaCacheInternal = (items: MediaRecord[]) => {
  cachedMediaPromise = null;
  mediaListCache.write(items);
};
```

An equivalent local implementation is acceptable only if it is resource-neutral
and reused consistently by the touched clients. The key requirement is that
memory and storage TTL semantics cannot drift.

Before adding a new helper file, check whether the existing generic owners can
carry the behavior:

- `core/admin/utils/storageCache.ts` already owns the localStorage envelope TTL
  and should remain the source of truth for storage-backed expiration.
- `core/admin/utils/readThroughCache.ts` already owns TTL-aware in-memory
  read-through semantics for high-frequency reads. If it can be extended without
  coupling it to browser storage, prefer that over introducing a second
  in-memory cache abstraction.

Do not create a Media-only `mediaCachePolicy`, `mediaMemoryCache`, or
route-local TTL module. The final helper may live in `storageCache.ts`,
`readThroughCache.ts`, or an existing generic cache owner, but all touched list
clients must consume the same timestamp-aware pattern.

## Security Contract

- Visibility: internal admin client cache only.
- Auth/RBAC/CSRF/rate-limit: unchanged; no API route is added or changed.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - stale in-memory list data must not survive beyond the documented TTL,
  - expired cache fallback may perform one normal list read, but must not create
    a polling loop or route-entry request burst,
  - no secrets, provider keys, or privileged settings are added to browser
    cache.

## Testing Requirements

- `tests/vitest/admin/storageCache.test.ts`
  - shared helper returns fresh in-memory values,
  - shared helper rejects expired in-memory values,
  - expired storage envelopes are still cleared through the existing path.
- `tests/vitest/admin/mediaClient.test.ts`
  - `listMediaCached({ force: false })` does not return an expired in-memory
    `media:list` value.
- `tests/vitest/admin/pagesClient.test.ts`
  - `listPagesCached({ force: false })` does not return an expired in-memory
    `pages:list` value.
- `tests/vitest/admin/menusClient.test.ts`
  - `listMenusCached({ force: false })` does not return an expired in-memory
    `menus:list` value.
- `tests/vitest/admin/postsClient.test.ts`
  - `listPostsCached({ force: false })` does not return an expired in-memory
    `posts:list` value, or the test documents that Posts remains a separate
    follow-up if this leaf intentionally does not touch Posts.

Run:

```sh
./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/storageCache.test.ts tests/vitest/admin/mediaClient.test.ts tests/vitest/admin/pagesClient.test.ts tests/vitest/admin/menusClient.test.ts tests/vitest/admin/postsClient.test.ts
```

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md`
  - document that list cache TTL applies to both storage envelopes and
    in-memory read-through values.
- `_docs/_TASKS/README.md`
  - keep TASK-206-00 listed and move it to Done with TASK-206 closure.

## Acceptance Criteria

1. In-memory admin list caches obey the same TTL as storage envelopes.
2. Expired in-memory rows cannot satisfy `list*Cached({ force: false })`.
3. Media, Pages, and Menus have explicit TTL regression coverage.
4. Posts is either covered by the same helper/pattern or explicitly left as a
   separate follow-up with no claim that it is a TASK-206 parity baseline.
5. No Media-only TTL workaround, duplicate storage key, or new cache bus action
   is introduced.
