# TASK-220-03-01: Shared Cached List Hooks Mount Refresh
# FileName: TASK-220-03-01_Shared_Cached_List_Hooks_Mount_Refresh.md

**Priority:** High
**Category:** Admin Cache + Hooks
**Estimated Effort:** Large
**Dependencies:** TASK-220-03
**Status:** In Progress (2026-04-27)

---

## Overview

Refactor reusable list hooks that hydrate from local cache and then refresh in
an effect. Initial cached items/loading state should come from lazy initializers
or a shared cache snapshot helper; effects should only subscribe or start async
background work without synchronous state repair.

## Finding Inventory

Primary findings owned by this leaf from the 2026-04-27 ESLint 9 / React Hooks Compiler baseline. Re-run TASK-220-01-01 before implementation if line numbers drift.

| File | Line | Rule | Current trigger | Fix direction |
|------|------|------|-----------------|---------------|
| core/admin/ui/commerce/hooks/useCommerceCatalog.ts | 107 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refreshProducts(` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/custom-screens/hooks/useCustomScreens.ts | 62 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refresh(resolveListMountRefreshOptions(hasInitialCache)).catch(() => undefined);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/forms/hooks/useForms.ts | 55 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refresh(resolveFormsListMountRefreshOptions(hasInitialCache)).catch(() => undefined);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/kits/hooks/useSolutionKits.ts | 39 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setItems(cached);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/listings/hooks/useListingQueries.ts | 62 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refresh(resolveListMountRefreshOptions(hasInitialCache)).catch(` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/listings/hooks/useListingTemplates.ts | 62 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refresh(resolveListMountRefreshOptions(hasInitialCache)).catch(` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/popups/hooks/usePopups.ts | 39 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setItems(cached);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/reviews/hooks/useReviews.ts | 39 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setItems(cached);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/widgets/hooks/useWidgetTemplates.ts | 40 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setItems(cached);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |

## Sub-Tasks

- [ ] Move cached list snapshots into lazy `useState` initializers or a shared
  pure helper.
- [ ] Ensure `refresh(...)` functions do not synchronously set loading/error
  state when invoked by mount effects with cache-present background options.
- [ ] Keep cache-bus subscriptions as external callbacks where state updates are
  allowed after event receipt.
- [ ] Preserve existing refresh call signatures or update all consumers in the
  same leaf.

## Files to Change

- `core/admin/ui/commerce/hooks/useCommerceCatalog.ts`
- `core/admin/ui/custom-screens/hooks/useCustomScreens.ts`
- `core/admin/ui/forms/hooks/useForms.ts`
- `core/admin/ui/listings/hooks/useListingQueries.ts`
- `core/admin/ui/listings/hooks/useListingTemplates.ts`
- `core/admin/ui/popups/hooks/usePopups.ts`
- `core/admin/ui/reviews/hooks/useReviews.ts`
- `core/admin/ui/widgets/hooks/useWidgetTemplates.ts`
- `core/admin/ui/kits/hooks/useSolutionKits.ts`
- `tests/vitest/admin/cacheRefresh.test.ts`
- `tests/vitest/admin/adminPrefetch.test.ts`
- Resource-specific UI suites for changed hooks.

Ownership note: this leaf owns cached list hooks only. `useSolutionKitRuns`
is a read/detail loader and remains under TASK-220-02-02.

## Security Contract

- Visibility: internal admin cached list hooks.
- Auth model: existing authenticated admin session / admin API key path.
- RBAC: unchanged per resource list.
- CSRF: no writes.
- Rate-limit bucket: existing admin read buckets.
- Reject-unknown validation: unchanged.
- Anti-abuse: no mount-force refetch loops; cache events must only refresh the
  relevant resource family.
- Secret handling: list caches must not include secrets or privileged settings.

## Pseudocode

```ts
const initialCache = useMemoFreeSnapshot(getCachedItems);
const [items, setItems] = useState(() => initialCache.items);
const [isLoading, setIsLoading] = useState(() => !initialCache.hasCache);
const hydratedRef = useRef(initialCache.hasCache);

const refresh = useCallback(async (options?: RefreshOptions) => {
  const background = resolveCacheRefreshBackground({
    explicitBackground: options?.background,
    hasHydrated: hydratedRef.current,
  });
  if (!background) setIsLoading(true);
  const next = await listItemsCached({ force: options?.force });
  setItems(next);
  hydratedRef.current = true;
  if (!background) setIsLoading(false);
}, []);
```

## Testing Requirements

- Cached list hooks render cached rows without foreground loading.
- Empty cached lists render empty states, not loading states.
- Cache-bus events refresh in the background.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md` if helper semantics change.
- `_docs/ADMIN_CACHE_MAP.md` if ownership changes.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Listed hooks are free of `set-state-in-effect` findings.
2. Mount refresh options still match `_docs/ADMIN_CACHE.md`.
3. Existing consumers remain compatible or are updated in the same branch.
