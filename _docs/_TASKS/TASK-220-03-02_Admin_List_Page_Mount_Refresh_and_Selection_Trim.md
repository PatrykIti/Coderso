# TASK-220-03-02: Admin List Page Mount Refresh and Selection Trim
# FileName: TASK-220-03-02_Admin_List_Page_Mount_Refresh_and_Selection_Trim.md

**Priority:** High
**Category:** Admin Lists + Selection State
**Estimated Effort:** Large
**Dependencies:** TASK-220-03-01
**Status:** Done (2026-04-29)

---

## Overview

Fix list page effects that either mount-refresh resources or trim selected ids
after visible rows change. Selection should be derived through reducers/event
handlers or explicit list model helpers rather than repaired after render.

## Finding Inventory

Primary findings owned by this leaf from the 2026-04-27 ESLint 9 / React Hooks Compiler baseline. Re-run TASK-220-01-01 before implementation if line numbers drift.

| File | Line | Rule | Current trigger | Fix direction |
|---|---|---|---|---|
| core/admin/ui/commerce/CommerceListPage.tsx | 155 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSelectedIds((prev) => {` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/content-types/ContentTypeList.tsx | 211 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSelectedIds((prev) => {` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/custom-screens/CustomScreenListPage.tsx | 108 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refreshContentTypes(` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/custom-screens/CustomScreenListPage.tsx | 173 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSelectedIds((prev) => {` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/entries/EntryList.tsx | 215 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refreshEntries({` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/entries/EntryList.tsx | 222 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refreshTypes({` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/entries/EntryList.tsx | 320 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSelectedRefs((prev) => {` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/forms/FormListPage.tsx | 131 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSelectedIds((prev) => {` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/listings/ListingListPage.tsx | 151 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSelectedQueryIds((prev) => {` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/listings/ListingListPage.tsx | 158 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSelectedTemplateIds((prev) => {` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/menus/MenuListPage.tsx | 509 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refresh(mountOptions).catch(() => undefined);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/menus/MenuListPage.tsx | 571 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSelectedIds((prev) => {` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/pages/PageListPage.tsx | 127 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refresh(mountOptions).catch(() => undefined);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/pages/PageListPage.tsx | 185 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSelectedIds((prev) => {` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/posts/PostsListPage.tsx | 142 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refresh({ force: true, background: hasInitialCache }).catch(() => undefined);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/posts/PostsListPage.tsx | 216 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSelectedIds((prev) => {` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/widgets/WidgetLibraryPage.tsx | 585 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSelectedIds((previous) => {` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |

## Sub-Tasks

- [ ] Replace mount `refresh(...)` calls with compiler-safe cache refresh
  patterns from TASK-220-03-01.
- [ ] Move visible-selection trimming into filter/page-change reducers or pure
  selection helpers invoked by events that change visibility.
- [ ] Preserve Pages-style list parity: visible-scope bulk actions, shared
  pagination, and cached background refresh.

## Files to Change

- `core/admin/ui/pages/PageListPage.tsx`
- `core/admin/ui/entries/EntryList.tsx`
- `core/admin/ui/forms/FormListPage.tsx`
- `core/admin/ui/menus/MenuListPage.tsx`
- `core/admin/ui/posts/PostsListPage.tsx`
- `core/admin/ui/content-types/ContentTypeList.tsx`
- `core/admin/ui/custom-screens/CustomScreenListPage.tsx`
- `core/admin/ui/commerce/CommerceListPage.tsx`
- `core/admin/ui/listings/ListingListPage.tsx`
- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `tests/vitest/ui/page-list-page.test.tsx`
- `tests/vitest/ui/entry-list*.test.tsx`
- `tests/vitest/ui/forms-list*.test.tsx`
- `tests/vitest/ui/menu-list-page.test.tsx`
- `tests/vitest/ui/posts-list*.test.tsx`
- Resource-specific parity suites where present.

## Security Contract

- Visibility: internal admin list surfaces.
- Auth model: existing authenticated admin session / admin API key path.
- RBAC: unchanged per resource.
- CSRF: existing write actions unchanged; this leaf should not add new writes.
- Rate-limit bucket: existing admin read/write buckets.
- Reject-unknown validation: unchanged.
- Anti-abuse: bulk actions must remain scoped to visible selected ids and must
  not operate on hidden rows after filtering/pagination.
- Secret handling: unchanged.

## Pseudocode

```ts
const visibleIds = useMemo(() => resolveVisibleIds(rows, filters, page), [rows, filters, page]);

const selectedIds = useMemo(
  () => trimSelection(selectionState.ids, visibleIds),
  [selectionState.ids, visibleIds]
);

// Or trim inside filter/page/rows reducer transitions, not in a post-render
// effect.
```

## Testing Requirements

- Selection is trimmed when filters/page/resource rows change.
- Hidden ids cannot be mutated by bulk actions.
- Cached lists do not show foreground loading when cache exists.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md` only if list behavior changes.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Listed list pages are free of `set-state-in-effect` findings.
2. Visible selection behavior remains unchanged from the Pages-style contract.
3. No list introduces mount-force refetch loops.
