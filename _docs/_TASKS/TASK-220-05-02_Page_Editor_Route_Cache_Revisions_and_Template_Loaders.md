# TASK-220-05-02: Page Editor Route, Cache, Revisions, and Template Loaders
# FileName: TASK-220-05-02_Page_Editor_Route_Cache_Revisions_and_Template_Loaders.md

**Priority:** High
**Category:** Pages Editor + Admin Cache
**Estimated Effort:** Large
**Dependencies:** TASK-220-05, TASK-220-03-03
**Status:** To Do

---

## Overview

Fix Page editor effects for pending scroll cleanup, route id resolution, cached
detail application, template option loading, and revision refresh. The existing
inserted-block scroll behavior and dirty-state protection must remain intact.

## Finding Inventory

Primary findings owned by this leaf from the 2026-04-27 ESLint 9 / React Hooks Compiler baseline. Re-run TASK-220-01-01 before implementation if line numbers drift.

| File | Line | Rule | Current trigger | Fix direction |
|------|------|------|-----------------|---------------|
| core/admin/ui/pages/PageEditor.tsx | 484 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setPendingScrollBlockId(null);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/pages/PageEditor.tsx | 517 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setPageId(resolved);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/pages/PageEditor.tsx | 525 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `applyPage(cachedDetail, { preserveSelection: true });` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/pages/PageEditor.tsx | 559 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void loadTemplateOptions();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/pages/PageEditor.tsx | 591 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refreshRevisions().catch(() => undefined);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |

## Sub-Tasks

- [ ] Move route `pageId` resolution into initialization or parent route props
  where possible.
- [ ] Replace cached detail effect application with initial editor state or a
  reducer load transition.
- [ ] Keep pending scroll cleanup compiler-safe without breaking
  `scrollIntoView` behavior.
- [ ] Refactor template options and revision refresh loaders to avoid
  synchronous state mutation from effect bodies.

## Files to Change

- `core/admin/ui/pages/PageEditor.tsx`
- `core/admin/services/pagesClient.ts` only if cached read signatures change.
- `tests/vitest/ui/page-editor*.test.tsx`
- `tests/vitest/ui/page-editor-scroll*.test.tsx`
- Existing Pages editor/cache/revision suites under `tests/vitest/ui/**`.

## Security Contract

- Visibility: internal Pages editor.
- Auth model: existing authenticated admin session / admin API key path.
- RBAC: existing page read/edit/revision permissions.
- CSRF: existing writes unchanged.
- Rate-limit bucket: existing admin read/write buckets.
- Reject-unknown validation: page schemas/services remain source of truth.
- Anti-abuse: background detail/revision refresh must not overwrite dirty local
  edits or trigger mount-force loops.
- Secret handling: page editor cache must not store secrets.

## Pseudocode

```ts
const resolvedPageId = initialPage?.id ?? resolvePageIdFromPath(locationPath);
const [editorState, dispatch] = useReducer(
  pageEditorReducer,
  { resolvedPageId, cachedDetail: getCachedPageDetail(resolvedPageId) },
  initPageEditorState
);
```

## Testing Requirements

- Cached Page detail renders without foreground loading when cache exists.
- Inserted block scroll still targets the new block and clears highlight.
- Template options load only when settings open.
- Revisions refresh remains background-safe.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md` if Pages detail/revision cache semantics change.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. `PageEditor.tsx` has no React Hooks Compiler findings.
2. Scroll, template options, revisions, and dirty-state behavior remain covered.
3. No Pages route/API schema changes are introduced.
