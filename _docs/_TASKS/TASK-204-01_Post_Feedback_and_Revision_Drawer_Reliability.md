# TASK-204-01: Post Feedback and Revision Drawer Reliability
# FileName: TASK-204-01_Post_Feedback_and_Revision_Drawer_Reliability.md

**Priority:** High
**Category:** CMS/Posts + Admin/UI + Accessibility
**Estimated Effort:** Medium
**Dependencies:** TASK-204, TASK-195-02
**Status:** To Do

---

## Overview

Close the remaining feedback and revision issues from the 2026-04-23 Posts
replay:

- `BUG-5`: publish/update changes post state, but the replay did not see a
  visible toast and the aria-live region was empty.
- `UX-1`: revision preview expands, but can show only `No preview available for
  this revision.`
- `BUG-6`: the revisions sheet emits a Radix missing description warning.

This subtask repairs the existing feedback and revision surfaces. It must not
move async mutation ownership into presentation-only header components or add a
second toaster host.

## Sub-Tasks

- `TASK-204-01-01_Publish_Update_Toast_Delivery_and_A11y_Proof.md`
- `TASK-204-01-02_Revision_Drawer_A11y_and_Empty_Preview_Fallback.md`

## Scope

- Verify the `toast.success()` call reaches the one shared `AdminApp` toaster
  in browser-like rendering, not only in a mocked unit assertion.
- Keep publish/update copy aligned with current Posts wording.
- Add direct coverage for toast visibility or an equivalent user-visible live
  feedback contract.
- Add a real `SheetDescription` or explicit `aria-describedby` relationship to
  `PostRevisionDrawer`.
- Replace the empty revision preview fallback with bounded useful metadata when
  textual content cannot be extracted.

Out of scope:

- changing the post save/publish route contract;
- changing autosave semantics unless replay proves it regressed;
- replacing the revisions drawer with a new modal flow;
- dumping raw revision JSON into the UI.

## Files to Change

- `core/admin/app/AdminApp.tsx:826`
- `core/admin/components/ui/sonner.tsx`
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx:551-558`
- `core/admin/ui/posts/editor/PostRevisionDrawer.tsx:59-63`
- `core/admin/ui/posts/editor/PostRevisionDrawer.tsx:89-99`
- `core/admin/ui/posts/editor/PostRevisionDrawer.tsx:141-144`
- `tests/vitest/admin/adminApp.test.tsx`
- `tests/vitest/ui/post-block-editor-shell-wave.test.tsx`
- `tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx`
- `tests/vitest/ui-integration/post-editor-header-workflow.test.tsx`

## Security Contract

- No new route or auth model.
- Existing publish/update calls keep current auth, RBAC, CSRF, and rate-limit
  behavior.
- Revision preview remains internal admin UI only.
- Feedback and preview copy must not leak raw payload blobs, stack traces,
  tokens, or hidden revision metadata.

## Testing Requirements

- `tests/vitest/admin/adminApp.test.tsx`
  - one shared toaster host is present in the admin shell.
- `tests/vitest/ui/post-block-editor-shell-wave.test.tsx`
  - publish/update still dispatches success feedback.
- `tests/vitest/ui-integration/post-editor-header-workflow.test.tsx`
  - header publish/update workflow remains presentational and user-visible.
- `tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx`
  - revisions sheet has an accessible description,
  - preview fallback is bounded and useful when extracted text is empty.
- Manual Playwright replay:
  - publish/update shows visible feedback,
  - revisions sheet opens without the Radix description warning.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-POSTS.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Browser replay proves publish/update feedback is visible, not just called in
   a mock.
2. The revisions sheet no longer emits the Radix `aria-describedby` warning.
3. Empty/short revision preview gives a useful bounded fallback before restore.
4. Existing save/publish and restore behavior remains unchanged.
