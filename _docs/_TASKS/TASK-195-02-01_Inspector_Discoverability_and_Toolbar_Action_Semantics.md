# TASK-195-02-01: Inspector Discoverability and Toolbar Action Semantics
# FileName: TASK-195-02-01_Inspector_Discoverability_and_Toolbar_Action_Semantics.md

**Priority:** High
**Category:** CMS/Posts + Admin/UI + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-195-02
**Status:** To Do

---

## Overview

Make the editor shell semantics unambiguous around `Add block`, `Outline`,
`Details`, and focus mode.

Current code already contains the intended split:

- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx:42-125` resolves the
  initial focus/layout state from stored preferences and local storage.
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx:204-235` keeps distinct
  handlers for inserter, outline, and details.
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx:281-310` binds the
  right-hand `PostDetailsSidebar`.
- `core/admin/ui/posts/editor/header/PostEditorHeader.tsx:175-209` renders a
  dedicated `Details` button.
- `core/admin/ui/posts/editor/settings/postEditorPreferences.ts:32-40` already
  sets `focusModeOnOpen` to `false`.
- `core/admin/ui/posts/editor/hooks/usePostEditorPreferences.ts:38-145` owns
  stored preference resolution and persistence.
- `core/admin/ui/posts/editor/hooks/usePostEditorLayout.ts:41-180` owns the
  shell layout/focus restore reducer.

Because of that, this leaf must not blindly flip defaults. It must close the
remaining discoverability gap from QA: if the live branch still hides the
inspector in practice, fix the restore-state/hint semantics and stateful labels
instead of creating a second toolbar model.
The intended owner path is the existing shell/layout contract:

- stored user preference and local-storage hydration decide the initial shell
  state,
- the header only reflects and toggles that state,
- `DocumentInspector` remains a consumer of the right rail, not the owner of a
  second visibility model.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx:42-125`
  - repair `resolveInitialFocusMode()` / `resolveInitialLayoutState()` and the
    shell fallback path if restore can strand the right rail hidden.
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx:204-235`
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx:440-469`
- `core/admin/ui/posts/editor/header/PostEditorHeader.tsx:175-209`
- `core/admin/ui/posts/editor/hooks/usePostEditorPreferences.ts:38-145`
  - keep owner responsibility for stored preference resolution; do not fork a
    Posts-only visibility flag elsewhere.
- `core/admin/ui/posts/editor/hooks/usePostEditorLayout.ts:41-180`
  - keep discoverability fixes inside the existing reducer/state contract.
- `core/admin/ui/posts/editor/settings/postEditorPreferences.ts:32-40`
  only if the live fix truly requires a contract-level default change
- `core/admin/ui/posts/editor/settings/PostEditorSettingsDialog.tsx`
  only if settings copy must explain the repaired restore/discoverability
  behavior
- `tests/vitest/ui/post-block-editor-shell-wave.test.tsx`
- `tests/vitest/ui-integration/post-editor-header-workflow.test.tsx`
- `tests/vitest/ui/post-editor-layout-hook-wave.test.tsx`
- `tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx`
- `tests/vitest/posts/post-editor-preferences.test.ts`
- `tests/vitest/posts/post-editor-layout-state.test.ts`
  - stored preference and local-storage hydration remain compatible with the
    repaired shell behavior

## Implementation Notes

- Keep the current shortcut and focus-return contracts.
- If the report issue reproduces as a real misroute, fix the shell wiring.
- If the live branch already routes correctly, scope the change to clearer
  stateful labels, hidden-inspector affordance, and restore-state semantics.
- Prefer repairing the existing storage/layout restore path over adding a second
  hint-only mode or a Posts-only visibility flag.
- Do not move discoverability ownership into `DocumentInspector`; the right rail
  stays controlled by the existing shell/layout state.

## Security Contract

- Visibility: internal admin editor shell only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Anti-abuse:
  - no new write path,
  - focus-mode or restore-state changes must not silently discard pending editor
    state,
  - toolbar labels/tooltips must map 1:1 to the panel they open.

## Testing Requirements

- `tests/vitest/ui/post-block-editor-shell-wave.test.tsx`
  - details toggle opens/closes the right rail,
  - inserter toggle remains separate,
  - focus-mode restore behavior stays deterministic.
- `tests/vitest/ui-integration/post-editor-header-workflow.test.tsx`
  - header labels/tooltips/pressed states reflect the actual panel state.
- `tests/vitest/ui/post-editor-layout-hook-wave.test.tsx`
  - restore-state semantics remain compatible with stored preferences.
- `tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx`
  - preference hydration and legacy/local storage compatibility remain intact
    after the discoverability fix.
- `tests/vitest/posts/post-editor-preferences.test.ts`
  - direct owner coverage for default resolution and v1/v2 storage compatibility
    if preference hydration/defaults change.
- `tests/vitest/posts/post-editor-layout-state.test.ts`
  - direct owner coverage for reducer-level restore semantics if focus/layout
    behavior changes.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/UI/POST_EDITOR_NEXTLESS_CURRENT_STATE.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. `Details` always maps to the right inspector and never feels interchangeable
   with `Add block`.
2. Focus mode plus restored local/user preference state cannot leave the editor
   stranded in an effectively undiscoverable right-rail state.
3. Existing keyboard shortcuts and focus-return behavior remain intact and the
   shell still uses one layout-state path rather than a duplicate visibility
   model.
