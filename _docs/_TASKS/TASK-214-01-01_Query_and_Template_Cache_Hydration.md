# TASK-214-01-01: Query and Template Cache Hydration
# FileName: TASK-214-01-01_Query_and_Template_Cache_Hydration.md

**Priority:** High
**Category:** Coderso Listings + Admin Cache
**Estimated Effort:** Medium
**Dependencies:** TASK-214-01
**Status:** To Do

---

## Overview

Update `useListingQueries` and `useListingTemplates` so both hooks follow the
shared list cache policy: hydrate from fresh cache immediately, background
revalidate when cache exists, foreground load when cache is absent, and refresh
from cache-bus events without mount-force refetch loops.

## Sub-Tasks

- [ ] Reuse `resolveListMountRefreshOptions` from
  `core/admin/utils/cacheRefresh.ts` for both query and template mount
  refresh policy. If a Listings-specific exported helper is useful for tests,
  keep it as a thin wrapper that delegates to the shared helper; do not
  duplicate the policy inline.
- [ ] Reuse `resolveCacheRefreshBackground` inside each hook refresh function so
  explicit `{ background: true }` refreshes and cache-event refreshes preserve
  visible cached rows without toggling foreground loading.
- [ ] Track `hasHydratedRef` like Pages/Forms list hooks.
- [ ] Keep `getCachedListingQueries` and `getCachedListingTemplates` as the
  immediate hydration sources.
- [ ] Keep `listListingQueriesCached({ force })` and
  `listListingTemplatesCached({ force })` as the only network/cache wrappers.
- [ ] If `refresh` changes from the current boolean force argument to an
  options object, use a backwards-compatible signature such as
  `boolean | { force?: boolean; background?: boolean }` or update every caller
  in the same leaf. No caller should pass `{ force, background }` into a
  boolean-only hook.
- [ ] Ensure cache-bus updates refresh in the background.
- [ ] Preserve `useListingTemplates` behavior for current consumers while this
  leaf lands. After TASK-214-01-02 and TASK-214-03 move template list ownership
  to the shell, `ListingEditorPage` remains the separate editor consumer and
  the template tab receives rows/loading/error through controlled props.

## Files to Change

- `core/admin/ui/listings/hooks/useListingQueries.ts`
- `core/admin/ui/listings/hooks/useListingTemplates.ts`
- `core/admin/ui/listings/ListingListPage.tsx` if call signatures change.
- `core/admin/ui/listings/ListingTemplateManager.tsx` if template hook
  signatures or refresh semantics change.
- `core/admin/ui/listings/ListingEditorPage.tsx` if template hook signatures
  or refresh semantics change.
- `tests/vitest/ui/listings-page.test.tsx`
- `tests/vitest/ui/listing-list-page-wave.test.tsx`
- `tests/vitest/ui/listings-cluster-wave.test.tsx` when editor/template
  manager hook consumers are affected.
- `tests/vitest/admin/listingsClient.test.ts` if cache helper behavior changes.

## Security Contract

- Visibility: internal admin read hooks only.
- Auth model: existing authenticated admin session/admin API key path.
- RBAC: `content:read`.
- CSRF: no writes.
- Rate-limit bucket: existing `admin_read`.
- Reject-unknown validation: unchanged.
- Anti-abuse: no public path or user-controlled query params are introduced.

## Pseudocode

```ts
import {
  resolveCacheRefreshBackground,
  resolveListMountRefreshOptions,
} from "@/utils/cacheRefresh";

export function resolveListingsMountRefreshOptions(hasInitialCache: boolean) {
  return resolveListMountRefreshOptions(hasInitialCache);
}

const initialCached = useMemo(() => getCachedListingQueries(), []);
const hasInitialCache = initialCached !== null;
const [items, setItems] = useState(() => initialCached ?? []);
const [isLoading, setIsLoading] = useState(() => !hasInitialCache);
const hasHydratedRef = useRef(hasInitialCache);

const refresh = async (
  options?: boolean | { force?: boolean; background?: boolean }
) => {
  const force = typeof options === "boolean" ? options : options?.force ?? false;
  const background = resolveCacheRefreshBackground({
    explicitBackground: typeof options === "object" ? options.background : undefined,
    hasHydrated: hasHydratedRef.current,
  });
  if (!background) setIsLoading(true);
  const nextItems = await listListingQueriesCached({ force });
  setItems(nextItems);
  hasHydratedRef.current = true;
  if (!background) setIsLoading(false);
};
```

## Testing Requirements

- Cached query list renders without `Loading listing queries...`.
- Cached empty query list renders a true empty state, not a loading state.
- Cached template list renders without `Loading templates...`.
- Cache-bus event triggers background refresh for the matching key only.
- Explicit background refresh keeps cached rows visible and does not show a
  foreground loading empty state.
- `ListingEditorPage` still renders its template selector after
  `useListingTemplates` changes.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/listings-page.test.tsx tests/vitest/ui/listing-list-page-wave.test.tsx tests/vitest/ui/listings-cluster-wave.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/cacheRefresh.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Query and template hooks no longer force foreground refresh when valid cache
   exists.
2. Cache events refresh only the resource family that changed.
3. The UI preserves stale cached rows while a background refresh is in flight.
