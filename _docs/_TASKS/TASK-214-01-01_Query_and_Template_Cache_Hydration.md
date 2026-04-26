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
- [ ] Track `hasHydratedRef` like Pages/Forms list hooks.
- [ ] Keep `getCachedListingQueries` and `getCachedListingTemplates` as the
  immediate hydration sources.
- [ ] Keep `listListingQueriesCached({ force })` and
  `listListingTemplatesCached({ force })` as the only network/cache wrappers.
- [ ] Ensure cache-bus updates refresh in the background.

## Files to Change

- `core/admin/ui/listings/hooks/useListingQueries.ts`
- `core/admin/ui/listings/hooks/useListingTemplates.ts`
- `core/admin/ui/listings/ListingListPage.tsx` if call signatures change.
- `tests/vitest/ui/listings-page.test.tsx`
- `tests/vitest/ui/listing-list-page-wave.test.tsx`
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
import { resolveListMountRefreshOptions } from "@/utils/cacheRefresh";

export function resolveListingsMountRefreshOptions(hasInitialCache: boolean) {
  return resolveListMountRefreshOptions(hasInitialCache);
}

const initialCached = useMemo(() => getCachedListingQueries(), []);
const hasInitialCache = initialCached !== null;
const [items, setItems] = useState(() => initialCached ?? []);
const [isLoading, setIsLoading] = useState(() => !hasInitialCache);
```

## Testing Requirements

- Cached query list renders without `Loading listing queries...`.
- Cached empty query list renders a true empty state, not a loading state.
- Cached template list renders without `Loading templates...`.
- Cache-bus event triggers background refresh for the matching key only.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/listings-page.test.tsx tests/vitest/ui/listing-list-page-wave.test.tsx`
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
