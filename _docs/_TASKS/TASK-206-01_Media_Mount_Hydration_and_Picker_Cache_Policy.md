# TASK-206-01: Media Mount Hydration and Picker Cache Policy
# FileName: TASK-206-01_Media_Mount_Hydration_and_Picker_Cache_Policy.md

**Priority:** High
**Category:** CMS/Media + Admin/UI + Cache
**Estimated Effort:** Medium
**Dependencies:** TASK-206
**Status:** To Do

---

## Overview

Align Media route-entry and picker hydration with the existing admin cache
contract used by Pages, Posts, and Menus.

The current Media client already owns `media:list`, `getCachedMedia`, and
`listMediaCached`, but `MediaLibraryPage` and `MediaPicker` still force network
refreshes in flows where valid cached media is already available. This subtask
keeps the existing list API and cache key, then fixes the consumers so the cache
contract is actually honored.

## Sub-Tasks

- [ ] TASK-206-01-01: Media Library Mount Refresh Policy
- [ ] TASK-206-01-02: Media Picker Cache Reuse and Shared Policy Helper

## Files to Change

- `core/admin/ui/media/MediaLibraryPage.tsx`
- `core/admin/ui/media/MediaPicker.tsx`
- `core/admin/utils/cacheRefresh.ts` only if a tiny shared helper prevents
  duplicated mount-policy code without becoming Media-specific.
- `tests/vitest/ui/media-library.test.tsx`
- `tests/vitest/ui/media-picker.test.tsx`
- `tests/vitest/ui/page-list-cache-behavior.test.tsx` only if shared cache
  policy tests are widened.

## Implementation Direction

- Start with `MediaLibraryPage`; it is the visible reported issue.
- Use the generic list-cache policy shape before adding Media-only code. If the
  existing `resolveCacheRefreshBackground` helper is enough, keep it. If the
  mount decision needs a reusable helper for both library and picker, extend the
  existing generic `cacheRefresh` owner with a resource-neutral helper such as
  `resolveListMountRefreshOptions` instead of exporting policy from
  `MediaLibraryPage` or creating a side file.
- Keep any Media-specific logic limited to Media row mapping, picker selection,
  or upload/drawer state that cannot be expressed by the generic cache helper.
- Apply the same policy to `MediaPicker` after the library is correct.
- Do not move media item state into a new store.
- Do not create a second picker cache.
- Do not change media route semantics in this subtask.

## Pseudocode

```ts
export function resolveListMountRefreshOptions(hasInitialCache: boolean) {
  return {
    force: !hasInitialCache,
    background: hasInitialCache,
  };
}
```

```ts
const initialCached = useMemo(() => getCachedMedia(), []);
const hasInitialCache = initialCached !== null;
const hasHydratedRef = useRef(hasInitialCache);

useEffect(() => {
  refresh(resolveListMountRefreshOptions(hasInitialCache));
}, [hasInitialCache, refresh]);
```

Picker shape:

```ts
useEffect(() => {
  if (hasLoaded) return;
  if (!isOpen && selectedIds.length === 0) return;

  const cached = getCachedMedia();
  if (cached) {
    setItems(cached.map(toMediaItem));
    setIsLoading(false);
    setHasLoaded(true);
    void refresh(false, { background: true });
    return;
  }

  void refresh(false);
}, [hasLoaded, isOpen, selectedIds.length, refresh]);
```

If `refresh(false)` already returns cached data through `listMediaCached`, avoid
manually reading cache twice. The important rule is that cache-present flows do
not pass `force: true`.

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - no new network polling,
  - no full-list fetch on route entry when valid cache exists,
  - no new storage of secrets or privileged settings.

## Testing Requirements

- `tests/vitest/ui/media-library.test.tsx`
  - cached mount does not show foreground loading,
  - cached mount calls the cached path with `force: false`,
  - missing cache still shows loading and fetches.
- `tests/vitest/ui/media-picker.test.tsx`
  - closed picker with no selection does not fetch,
  - opening picker with cached media does not force reload,
  - selected media can resolve from cache.

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. `MediaLibraryPage` uses cache-present mount options equivalent to Pages/Menus.
2. `MediaPicker` does not force reload after valid cache hydration.
3. No new media cache/state owner is introduced.
