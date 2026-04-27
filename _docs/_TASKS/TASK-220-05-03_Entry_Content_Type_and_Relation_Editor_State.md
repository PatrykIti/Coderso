# TASK-220-05-03: Entry Content Type and Relation Editor State
# FileName: TASK-220-05-03_Entry_Content_Type_and_Relation_Editor_State.md

**Priority:** High
**Category:** Entries + Content Types + React Compiler
**Estimated Effort:** Large
**Dependencies:** TASK-220-05, TASK-220-03-03
**Status:** In Progress (2026-04-27)

---

## Overview

Fix Entry and Content Type editor findings around cached entry/type application,
relation target hydration, selected-field/active-tab repair, and manual
memoization for editor checklists.

## Finding Inventory

Primary findings owned by this leaf from the 2026-04-27 ESLint 9 / React Hooks Compiler baseline. Re-run TASK-220-01-01 before implementation if line numbers drift.

| File | Line | Rule | Current trigger | Fix direction |
|------|------|------|-----------------|---------------|
| core/admin/ui/content-types/ContentTypeEditor.tsx | 153 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `applyContentType(cachedType);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/content-types/ContentTypeEditor.tsx | 191 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setRelationTargets(cached.map((type) => ({ slug: type.slug, name: type.name })));` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/content-types/ContentTypeEditor.tsx | 207 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSelectedFieldId(null);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx | 301 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refresh(true).catch(() => undefined);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx | 307 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setRelationTargets(cached.map((item) => ({ slug: item.slug, name: item.name })));` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/entries/EntryEditor.tsx | 279 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `applyEntry(cachedEntry, cachedContentType);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/entries/EntryEditor.tsx | 305 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setRelationTargets(cached.map((item) => ({ slug: item.slug, name: item.name })));` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/entries/EntryEditor.tsx | 655 | react-hooks/preserve-manual-memoization (manual memo dependencies cannot be preserved) | `const checklist = useMemo(` | Remove cheap memoization or depend on exact scalar values read by the memo callback. |
| core/admin/ui/entries/EntryEditor.tsx | 718 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `if (!hasActive) setActiveTab(tabGroups[0].id);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |

## Sub-Tasks

- [ ] Move cached entry/content type application into initial state or explicit
  reducer load transitions.
- [ ] Refactor relation target hydration so cached targets are initialized
  before render or updated from async/cache callbacks.
- [ ] Derive selected field/active tab from available fields/tabs without
  post-render repair effects.
- [ ] Fix Entry checklist `preserve-manual-memoization` by removing unnecessary
  memoization or using exact dependencies.

## Files to Change

- `core/admin/ui/entries/EntryEditor.tsx`
- `core/admin/ui/content-types/ContentTypeEditor.tsx`
- `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx`
- `tests/vitest/ui/entry-editor*.test.tsx`
- `tests/vitest/ui/content-type-editor*.test.tsx`
- Existing relation/cache editor suites under `tests/vitest/ui/**`.

## Security Contract

- Visibility: internal Entries, Content Types, and Custom Screen entry editors.
- Auth model: existing authenticated admin session / admin API key path.
- RBAC: existing resource read/edit permissions.
- CSRF: existing writes unchanged.
- Rate-limit bucket: existing admin read/write buckets.
- Reject-unknown validation: content schema and entry route validators remain
  source of truth.
- Anti-abuse: relation target hydration must not bypass permissioned backend
  reads or overwrite dirty editor values.
- Secret handling: not applicable.

## Pseudocode

```ts
const availableTabIds = useMemo(() => tabGroups.map((tab) => tab.id), [tabGroups]);
const activeTab = availableTabIds.includes(requestedTab)
  ? requestedTab
  : availableTabIds[0] ?? "main";
```

## Testing Requirements

- Cached entry/type data renders without foreground flicker.
- Relation target selectors populate from cache and refresh safely.
- Active tab/selected field remain valid after schema changes.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md` if entry/detail cache semantics change.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Listed Entry/Content Type editor files are lint-clean under React Hooks
   Compiler rules.
2. Relation and tab/field selection behavior remains deterministic.
3. Entry checklist memoization no longer blocks React Compiler.
