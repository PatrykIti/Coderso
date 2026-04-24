# TASK-206-01-01: Media Library Mount Refresh Policy
# FileName: TASK-206-01-01_Media_Library_Mount_Refresh_Policy.md

**Priority:** High
**Category:** CMS/Media + Admin/UI + Cache
**Estimated Effort:** Medium
**Dependencies:** TASK-206-01
**Status:** To Do

---

## Overview

Fix `MediaLibraryPage` so entering the Media screen does not force a full
gallery reload when `media:list` cache is already available.

Current owner truth:

- `MediaLibraryPage` reads `getCachedMedia()` for initial rows.
- It then calls `refresh({ force: true })` on mount.
- That forced refresh bypasses `listMediaCached` cache reuse and triggers
  `GET /media` on every route entry.

This leaf repairs that mount policy in place.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/media/MediaLibraryPage.tsx`
- `tests/vitest/ui/media-library.test.tsx`
- optionally `tests/vitest/ui/media-cache-behavior.test.tsx` if a focused
  mount-policy test file is clearer than widening the existing suite.

## Implementation Direction

- Keep `MediaLibraryPage` as the page owner for list hydration and loading
  state.
- Use `getCachedMedia()` only as the initial cache source.
- Replace the unconditional forced mount refresh with a cache-aware decision.
- Reuse `resolveCacheRefreshBackground` for background-vs-foreground state if it
  fits.
- Export a small pure helper only if tests need stable policy coverage.

## Pseudocode

```ts
export function resolveMediaListMountRefreshOptions(hasInitialCache: boolean) {
  return {
    force: !hasInitialCache,
    background: hasInitialCache,
  };
}
```

```ts
const initialCached = useMemo(() => getCachedMedia(), []);
const hasInitialCache = initialCached !== null;
const [items, setItems] = useState<MediaItem[]>(
  () => (initialCached ?? []).map(toMediaItem)
);
const [isLoading, setIsLoading] = useState(() => !hasInitialCache);
const hasHydratedRef = useRef(hasInitialCache);

const refresh = useCallback(async (options?: { force?: boolean; background?: boolean }) => {
  const background = resolveCacheRefreshBackground({
    explicitBackground: options?.background,
    hasHydrated: hasHydratedRef.current,
  });

  if (!background) setIsLoading(true);
  setError(null);

  try {
    const rows = await listMediaCached({ force: options?.force ?? false });
    setItems(rows.map(toMediaItem));
    hasHydratedRef.current = true;
  } finally {
    if (!background) setIsLoading(false);
  }
}, []);

useEffect(() => {
  refresh(resolveMediaListMountRefreshOptions(hasInitialCache)).catch(() => undefined);
}, [hasInitialCache, refresh]);
```

## Security Contract

- Visibility: internal admin Media UI only.
- Auth/RBAC/CSRF/rate-limit: unchanged; this leaf only changes whether the
  existing cached `GET /media` wrapper is forced.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - avoid repeated route-entry full-list reads,
  - preserve explicit refresh/invalidated reload paths.

## Testing Requirements

- `tests/vitest/ui/media-library.test.tsx`
  - cached rows render immediately,
  - foreground loading is absent when cache exists,
  - mount policy helper returns `force: false` for cache present,
  - mount policy helper returns `force: true` only when cache is missing,
  - missing cache still renders loading state.

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Fresh cached media prevents forced mount reload.
2. Missing media cache still performs the initial foreground fetch.
3. The page still supports explicit forced refresh after true invalidation or
   user action.
