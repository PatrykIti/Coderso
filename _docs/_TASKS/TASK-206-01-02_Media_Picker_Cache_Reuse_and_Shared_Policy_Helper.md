# TASK-206-01-02: Media Picker Cache Reuse and Shared Policy Helper
# FileName: TASK-206-01-02_Media_Picker_Cache_Reuse_and_Shared_Policy_Helper.md

**Priority:** Medium
**Category:** CMS/Media + Admin/UI + Cache
**Estimated Effort:** Medium
**Dependencies:** TASK-206-01-01
**Status:** To Do

---

## Overview

Make `MediaPicker` reuse the existing `media:list` cache without forced reloads
after cache hydration.

The picker currently hydrates from `getCachedMedia()` and then calls
`refresh(true)`. That duplicates the Media Library mount problem in editor and
field-selection flows. This leaf keeps picker behavior and `MediaGrid` reuse
intact while replacing the forced refresh with the same cache-aware contract as
the Media Library page.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/media/MediaPicker.tsx`
- `core/admin/ui/media/MediaLibraryPage.tsx` only if a shared local helper is
  exported from the page module and reused.
- `tests/vitest/ui/media-picker.test.tsx`
- `tests/vitest/ui/media-library.test.tsx` if helper tests live there.

## Implementation Direction

- Keep `MediaPicker` a consumer of `mediaClient`; do not give it its own cache.
- Reuse generic cache/loading helpers and existing UI primitives first. Do not
  create a picker-only cache policy, picker-only grid, or parallel selection
  store when `mediaClient`, `MediaGrid`, and shared dialog/list patterns already
  cover the behavior.
- If picker and library need the same cache-mount decision, consume a generic
  helper from the existing shared cache owner; only keep local picker code for
  picker-specific concerns such as selected id resolution, accept filtering, and
  multi-select limits.
- Preserve lazy behavior:
  - closed picker with no selected IDs should not fetch,
  - open picker should load enough data to browse/select,
  - selected IDs should resolve from cache when possible.
- When cache exists, render it and avoid `force: true`.
- If background revalidation is kept, it must be `force: false`; otherwise it
  should not run.
- Keep `MediaGrid` behavior stable for picker usage.

## Pseudocode

```ts
const refresh = useCallback(async (options?: { force?: boolean; background?: boolean }) => {
  if (!options?.background) setIsLoading(true);
  setError(null);

  try {
    const result = await listMediaCached({ force: options?.force ?? false });
    setItems(result.map(toMediaItem));
  } finally {
    if (!options?.background) setIsLoading(false);
    setHasLoaded(true);
  }
}, []);
```

```ts
useEffect(() => {
  if (hasLoaded) return;
  if (!isOpen && selectedIds.length === 0) return;

  const cached = getCachedMedia();
  if (cached) {
    setItems(cached.map(toMediaItem));
    setIsLoading(false);
    setHasLoaded(true);
    return;
  }

  void refresh({ force: false, background: false });
}, [hasLoaded, isOpen, selectedIds.length, refresh]);
```

Optional background warmup if needed:

```ts
if (cached) {
  void refresh({ force: false, background: true });
}
```

Do not use `refresh({ force: true })` for ordinary picker open/selected-id
resolution.

## Security Contract

- Visibility: internal admin picker UI only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - no forced gallery reload when cached data can satisfy picker rendering,
  - no separate browser cache for selected media previews.

## Testing Requirements

- `tests/vitest/ui/media-picker.test.tsx`
  - closed/no-selection state does not call `listMediaCached`,
  - open state with cached media renders cached rows and passes `force: false`,
  - selected media resolves from cached rows without loading placeholder,
  - no new `MediaGrid` picker regression.

## Documentation Updates Required

- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. `MediaPicker` no longer forces a full media reload after cache hydration.
2. The picker remains lazy when closed and unselected.
3. Picker and library continue to share `MediaGrid` and `mediaClient`.
