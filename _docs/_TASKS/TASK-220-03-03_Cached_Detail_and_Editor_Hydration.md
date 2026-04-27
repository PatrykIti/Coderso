# TASK-220-03-03: Cached Detail and Editor Hydration
# FileName: TASK-220-03-03_Cached_Detail_and_Editor_Hydration.md

**Priority:** High
**Category:** Admin Cache + Editors
**Estimated Effort:** Large
**Dependencies:** TASK-220-03-01
**Status:** To Do

---

## Overview

Fix cached detail/editor hydration effects that synchronously apply cached
records after first render. Detail screens should derive their initial snapshot
from route/cache inputs when possible and background refresh without clobbering
dirty editor state.

## Finding Inventory

Primary findings owned by this leaf from the 2026-04-27 ESLint 9 / React Hooks Compiler baseline. Re-run TASK-220-01-01 before implementation if line numbers drift.

| File | Line | Rule | Current trigger | Fix direction |
|------|------|------|-----------------|---------------|
| core/admin/ui/custom-screens/CustomScreenEditorPage.tsx | 337 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setIsLoading(false);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/custom-screens/CustomScreenEntriesPage.tsx | 314 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setScreen(cachedScreen);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/forms/FormBuilderPage.tsx | 326 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `applyDetail(cached);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/listings/ListingEditorPage.tsx | 216 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refreshQuery(true).catch(() => undefined);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/popups/PopupEditorPage.tsx | 78 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setIsLoading(false);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |

## Sub-Tasks

- [ ] Move cached detail snapshots into initial state where the route id is
  already known.
- [ ] Where the route id is resolved client-side, derive it before editor state
  initialization or introduce a reducer transition that avoids render repair.
- [ ] Keep background cache events dirty-safe.
- [ ] Preserve relation target hydration without writing stale data over edits.

## Files to Change

Primary source ownership for this leaf:

- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`
- `core/admin/ui/custom-screens/CustomScreenEntriesPage.tsx`
- `core/admin/ui/forms/FormBuilderPage.tsx`
- `core/admin/ui/listings/ListingEditorPage.tsx`
- `core/admin/ui/popups/PopupEditorPage.tsx`
- Existing editor/cache Vitest suites under `tests/vitest/ui/**` and
  `tests/vitest/ui-integration/**`.

Coordination note: Page, Entry, Custom Screen entry, Media picker, and Posts
classic editor findings are owned by their resource-specific leaves
(`TASK-220-05-02`, `TASK-220-05-03`, `TASK-220-04-02`, and
`TASK-220-05-01`). Do not claim those files here unless an implementation
change in this leaf requires a direct integration update.

## Security Contract

- Visibility: internal admin detail/editor surfaces.
- Auth model: existing authenticated admin session / admin API key path.
- RBAC: unchanged per resource detail.
- CSRF: existing writes unchanged.
- Rate-limit bucket: existing admin read/write buckets.
- Reject-unknown validation: unchanged.
- Anti-abuse: background refresh must not overwrite dirty local editor state or
  repeated route-entry trigger forced detail refetches.
- Secret handling: no editor cache may store secrets or privileged settings.

## Pseudocode

```ts
const routeId = resolveRouteIdFromPropsOrLocation(props, windowLocation);
const initialSnapshot = routeId ? getCachedDetail(routeId) : null;
const [editorState, dispatch] = useReducer(
  editorReducer,
  { routeId, initialSnapshot },
  initEditorState
);

useEffect(() => subscribeCacheEvents((event) => {
  if (!matchesDetail(event, routeId)) return;
  void refreshDetail({ background: true, allowDirty: false });
}), [routeId, refreshDetail]);
```

## Testing Requirements

- Cached detail renders without foreground loading when cache exists.
- Dirty editor state survives background refresh/cache-bus events.
- Relation target cache hydration still populates selectors.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md` if detail hydration semantics change.
- `_docs/ADMIN_CACHE_MAP.md` if cache owner mappings change.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Listed detail/editor files are free of `set-state-in-effect` findings.
2. Dirty-state protection remains covered by tests for behavior-sensitive
   editors.
3. Cache event behavior remains family-scoped.
