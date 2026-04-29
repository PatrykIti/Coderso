# TASK-220-06-02: Commerce, Listings, Forms, Menus, and Posts Resource Lists
# FileName: TASK-220-06-02_Commerce_Listings_Forms_Menus_and_Posts_Resource_Lists.md

**Priority:** High
**Category:** Resource Lists + Admin Cache
**Estimated Effort:** Large
**Dependencies:** TASK-220-06, TASK-220-03-02
**Status:** Done (2026-04-29)

---

## Overview

Fix resource-specific loader findings that remain after the shared cache and
list-selection leaves. This leaf owns the three primary residual findings below;
Commerce/Listings/Forms/Menus/Posts list parity remains regression context
unless a listed primary file requires a direct integration update.

## Finding Inventory

Primary findings owned by this leaf from the 2026-04-27 ESLint 9 / React Hooks Compiler baseline. Re-run TASK-220-01-01 before implementation if line numbers drift.

| File | Line | Rule | Current trigger | Fix direction |
|---|---|---|---|---|
| core/admin/ui/commerce/CommerceEditorPage.tsx | 109 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setIsLoading((current) => current && !isCreateMode);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/forms/FormActionLogsPage.tsx | 72 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refresh().catch(() => undefined);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/menus/MenuEditorPage.tsx | 479 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setOriginalMenu(null);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |

## Sub-Tasks

- [ ] Apply compiler-safe loader cleanup to the Commerce editor, Forms action
  logs, and Menu editor findings listed in this leaf.
- [ ] Preserve retained-history action-log behavior for Forms and lifecycle
  actions for Menus/Commerce.
- [ ] Treat Listings, Posts, and list page parity as regression context owned by
  TASK-220-03-02 or resource-specific earlier leaves unless an integration
  change is required.
- [ ] Keep current route/service error mapping untouched unless tests reveal a
  real contract gap.

## Files to Change

Primary source ownership for this leaf:

- `core/admin/ui/commerce/CommerceEditorPage.tsx`
- `core/admin/ui/forms/FormActionLogsPage.tsx`
- `core/admin/ui/menus/MenuEditorPage.tsx`
- `tests/vitest/ui/commerce-page.test.tsx`
- Focused Forms action-log and Menu editor suites where present.

Coordination note: cached hooks are owned by TASK-220-03-01, list selection and
mount refresh by TASK-220-03-02, dialog/listing derived state by TASK-220-04-02,
and cached detail/editor hydration by TASK-220-03-03.

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

- Commerce editor loading remains stable in create/edit modes.
- Forms action logs load without mount repair effects.
- Menu editor reset/original state behavior remains deterministic.
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
