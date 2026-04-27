# TASK-220-06-02: Commerce, Listings, Forms, Menus, and Posts Resource Lists
# FileName: TASK-220-06-02_Commerce_Listings_Forms_Menus_and_Posts_Resource_Lists.md

**Priority:** High
**Category:** Resource Lists + Admin Cache
**Estimated Effort:** Large
**Dependencies:** TASK-220-06, TASK-220-03-02
**Status:** To Do

---

## Overview

Fix resource-specific list/editor loader findings that remain after the shared
cache and list-selection leaves. These surfaces must preserve the Pages-style
list contract: cached background refresh, visible selection, scoped bulk
actions, and confirmations.

## Finding Inventory

Primary findings owned by this leaf from the 2026-04-27 ESLint 9 / React Hooks Compiler baseline. Re-run TASK-220-01-01 before implementation if line numbers drift.

| File | Line | Rule | Current trigger | Fix direction |
|------|------|------|-----------------|---------------|
| core/admin/ui/commerce/CommerceEditorPage.tsx | 109 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setIsLoading((current) => current && !isCreateMode);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/forms/FormActionLogsPage.tsx | 72 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refresh().catch(() => undefined);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/menus/MenuEditorPage.tsx | 479 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setOriginalMenu(null);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |

## Sub-Tasks

- [ ] Apply compiler-safe mount refresh to Commerce, Listings, Forms, Menus,
  Posts, and related editor/listing manager surfaces.
- [ ] Preserve active-tab and tab-scoped resource ownership for Listings.
- [ ] Preserve retained-history delete behavior for Forms and lifecycle actions
  for Menus/Posts/Commerce.
- [ ] Keep current route/service error mapping untouched unless tests reveal a
  real contract gap.

## Files to Change

- `core/admin/ui/commerce/CommerceEditorPage.tsx`
- `core/admin/ui/commerce/CommerceListPage.tsx`
- `core/admin/ui/commerce/hooks/useCommerceCatalog.ts`
- `core/admin/ui/listings/ListingListPage.tsx`
- `core/admin/ui/listings/ListingEditorPage.tsx`
- `core/admin/ui/listings/ListingFiltersPage.tsx`
- `core/admin/ui/listings/ListingTemplateManager.tsx`
- `core/admin/ui/listings/hooks/useListingQueries.ts`
- `core/admin/ui/listings/hooks/useListingTemplates.ts`
- `core/admin/ui/forms/FormActionLogsPage.tsx`
- `core/admin/ui/forms/FormBuilderPage.tsx`
- `core/admin/ui/forms/FormListPage.tsx`
- `core/admin/ui/forms/hooks/useForms.ts`
- `core/admin/ui/menus/MenuEditorPage.tsx`
- `core/admin/ui/menus/MenuListPage.tsx`
- `core/admin/ui/posts/PostsListPage.tsx`
- `tests/vitest/ui/commerce-page.test.tsx`
- `tests/vitest/ui/listing-list-page*.test.tsx`
- `tests/vitest/ui/forms-list*.test.tsx`
- `tests/vitest/ui/menu-list-page.test.tsx`
- `tests/vitest/ui/posts-list*.test.tsx`

## Security Contract

- Visibility: internal admin resource list/editor surfaces.
- Auth model: existing authenticated admin session / admin API key path.
- RBAC: unchanged per resource family.
- CSRF: existing admin writes unchanged.
- Rate-limit bucket: existing admin read/write buckets.
- Reject-unknown validation: route/service schemas remain source of truth.
- Anti-abuse: visible-scope bulk actions must not mutate hidden rows; cache
  refreshes must not amplify requests.
- Secret handling: resource list caches must not include secrets.

## Pseudocode

```ts
const mountOptions = resolveListMountRefreshOptions(hasInitialCache);

useEffect(() => {
  void refreshResource({
    ...mountOptions,
    // refreshResource must not synchronously set foreground loading when
    // mountOptions.background is true.
  });
}, [refreshResource, mountOptions]);
```

## Testing Requirements

- Cached resource lists render rows without foreground loading.
- Visible selection and bulk actions remain scoped after filtering/pagination.
- Listings active-tab New/delete behavior remains tab-scoped.
- Forms retained-history delete conflict behavior remains recoverable.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if resource cache
  semantics change.
- `_docs/CONTENT_LIST_UX.md` only if list UX behavior changes.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Listed resource list/editor files are lint-clean.
2. Existing list parity behavior remains covered by focused tests.
3. No resource route/API payload contract changes are introduced.
