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

- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx:204-235` keeps distinct
  handlers for inserter, outline, and details.
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx:281-310` binds the
  right-hand `PostDetailsSidebar`.
- `core/admin/ui/posts/editor/header/PostEditorHeader.tsx:175-209` renders a
  dedicated `Details` button.
- `core/admin/ui/posts/editor/settings/postEditorPreferences.ts:32-40` already
  sets `focusModeOnOpen` to `false`.

Because of that, this leaf must not blindly flip defaults. It must close the
remaining discoverability gap from QA: if the live branch still hides the
inspector in practice, fix the restore-state/hint semantics and stateful labels
instead of creating a second toolbar model.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx:204-235`
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx:440-469`
- `core/admin/ui/posts/editor/header/PostEditorHeader.tsx:175-209`
- `core/admin/ui/posts/editor/settings/postEditorPreferences.ts:32-40`
- `core/admin/ui/posts/editor/settings/PostEditorSettingsDialog.tsx`
  only if shell hints need to mirror preference wording
- `tests/vitest/ui/post-block-editor-shell-wave.test.tsx`
- `tests/vitest/ui-integration/post-editor-header-workflow.test.tsx`
- `tests/vitest/ui/post-editor-layout-hook-wave.test.tsx`

## Implementation Notes

- Keep the current shortcut and focus-return contracts.
- If the report issue reproduces as a real misroute, fix the shell wiring.
- If the live branch already routes correctly, scope the change to clearer
  stateful labels, hidden-inspector affordance, and restore-state semantics.

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

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/UI/POST_EDITOR_NEXTLESS_CURRENT_STATE.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. `Details` always maps to the right inspector and never feels interchangeable
   with `Add block`.
2. Focus mode and restored shell state cannot leave the inspector effectively
   undiscoverable.
3. Existing keyboard shortcuts and focus-return behavior remain intact.
