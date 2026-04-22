# TASK-195-02: Post Editor Shell Discoverability, Feedback, and Revision Confidence
# FileName: TASK-195-02_Post_Editor_Shell_Discoverability_Feedback_and_Revision_Confidence.md

**Priority:** High
**Category:** CMS/Posts + Admin/UI + UX
**Estimated Effort:** Large
**Dependencies:** TASK-195
**Status:** To Do

---

## Overview

Repair the trust signals around the writing-first post editor. The report found
that users still lack confidence in three places:

- the right-hand inspector can remain hard to discover,
- publish/update succeeds without explicit success feedback,
- revision restore decisions are blind because history exposes metadata only.

This wave should make the editor self-explanatory without regressing the
existing writing-canvas flow, preview contract, or stored editor preferences.

## Sub-Tasks

- `TASK-195-02-01_Inspector_Discoverability_and_Toolbar_Action_Semantics.md`
- `TASK-195-02-02_Publish_Update_Feedback_and_Autosave_Failure_Surfacing.md`
- `TASK-195-02-03_Revision_Preview_Before_Restore.md`

## Scope

- Clarify the shell semantics between `Add block`, `Outline`, `Details`, and
  focus mode.
- Add explicit success feedback for publish/update and keep autosave failures
  actionable in-product.
- Add a read-only revision preview before restore.
- Preserve current preview, revision, and post-state persistence contracts.

Out of scope:

- changing the public preview-token/runtime model,
- redesigning the writing-canvas editor chrome,
- deleting focus mode or stored editor preferences,
- changing revision storage shape unless preview metadata needs a bounded read
  adapter.

## Files to Change

- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `core/admin/ui/posts/editor/header/PostEditorHeader.tsx`
- `core/admin/ui/posts/editor/header/PostEditorActionCluster.tsx`
- `core/admin/ui/posts/editor/PostRevisionDrawer.tsx`
- `core/admin/ui/posts/editor/settings/postEditorPreferences.ts`
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
- `core/admin/components/ui/sonner.tsx` and `core/admin/app/AdminApp.tsx` only
  if the current admin shell still lacks a mounted toaster
- `tests/vitest/ui/post-block-editor-shell-wave.test.tsx`
- `tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx`
- `tests/vitest/ui/post-editor-state-hook-wave.test.tsx`
- `tests/vitest/ui-integration/post-editor-header-workflow.test.tsx`

## Security Contract

- Visibility: internal admin Posts editor plus existing read-only runtime
  preview dialog.
- Auth/RBAC/CSRF/rate-limit: unchanged; this wave is UI orchestration over the
  existing editor endpoints.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - revision restore confirmation stays mandatory,
  - success toasts and failure banners must not leak raw secrets or stack traces,
  - autosave pause/retry messaging must preserve the current dirty draft until a
    successful save path completes.

## Testing Requirements

- Vitest:
  - shell toggle semantics and hidden-inspector recovery,
  - success feedback and autosave-pause states,
  - revision preview rendering and restore gating,
  - no regression to focus-mode persistence or preview wiring.
- Bun only if revision payloads or posts route outputs change materially.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/PREVIEW_SPEC.md` only if preview messaging contracts widen
- `_docs/UI/POST_EDITOR_NEXTLESS_CURRENT_STATE.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Users can always discover and reopen the `Post` inspector without confusing
   it with the block inserter.
2. Publish/update/autosave states give explicit success/failure confidence in
   the editor UI.
3. Revisions expose enough bounded preview context that restore is no longer a
   blind action.
