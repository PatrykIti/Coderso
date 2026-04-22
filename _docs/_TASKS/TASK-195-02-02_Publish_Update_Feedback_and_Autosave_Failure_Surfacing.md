# TASK-195-02-02: Publish Update Feedback and Autosave Failure Surfacing
# FileName: TASK-195-02-02_Publish_Update_Feedback_and_Autosave_Failure_Surfacing.md

**Priority:** High
**Category:** CMS/Posts + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-195-02
**Status:** To Do

---

## Overview

Give users explicit confidence after save/publish work and keep autosave
failures actionable in-product.

Current state:

- `core/admin/ui/posts/editor/header/PostEditorActionCluster.tsx:24-56` only
  changes inline status text and button labels.
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts:539-545` surfaces
  autosave failures as an error string, but success has no explicit confirmation
  channel.
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts:591-644` sets failure
  text for save/publish paths, but no success feedback is emitted.
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx:366-384` renders
  destructive alerts only.

The QA report also captured DB/network failures during autosave. This leaf owns
the product-side recovery behavior: paused-state visibility, retry guidance, and
preservation of dirty editor state. It does not hide or excuse real infra
failures.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/posts/editor/header/PostEditorActionCluster.tsx:24-56`
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts:539-545`
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts:591-644`
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx:366-384`
- `core/admin/components/ui/sonner.tsx` and `core/admin/app/AdminApp.tsx`
  only if the shared admin toaster still is not mounted
- `tests/vitest/ui/post-editor-state-hook-wave.test.tsx`
- `tests/vitest/ui/post-block-editor-shell-wave.test.tsx`

## Security Contract

- Visibility: internal admin editor only.
- Auth/RBAC/CSRF/rate-limit: unchanged existing posts routes.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - success feedback must not leak hidden payload data,
  - autosave failure surfacing must preserve dirty state until the user retries
    or performs an explicit save,
  - infra-originated failures must remain visible as failures rather than being
    swallowed by optimistic UI.

## Testing Requirements

- `tests/vitest/ui/post-editor-state-hook-wave.test.tsx`
  - publish/update success feedback callback or event is emitted,
  - autosave failure leaves editor state dirty and actionable,
  - generic and API-specific failures still map to bounded user text.
- `tests/vitest/ui/post-block-editor-shell-wave.test.tsx`
  - success feedback is rendered or dispatched,
  - autosave paused state remains visible and does not block unrelated editor
    actions incorrectly.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Users receive explicit success feedback after publish/update.
2. Autosave failures are surfaced in the editor with clear paused-state/retry
   guidance and without losing unsaved work.
3. Real backend/network failures remain visible and are not downgraded to silent
   console-only noise.
