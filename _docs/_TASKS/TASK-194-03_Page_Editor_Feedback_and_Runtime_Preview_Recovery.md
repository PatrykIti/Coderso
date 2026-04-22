# TASK-194-03: Page Editor Feedback and Runtime Preview Recovery
# FileName: TASK-194-03_Page_Editor_Feedback_and_Runtime_Preview_Recovery.md

**Priority:** High
**Category:** CMS/Pages + Admin/UI + Runtime Preview
**Estimated Effort:** Medium
**Dependencies:** TASK-194, TASK-053, TASK-191
**Status:** To Do

---

## Overview

Repair the main editor feedback loops that are currently too subtle or not
actionable:

- saving and publishing succeed silently,
- runtime preview failure can collapse into an unhelpful broken iframe,
- runtime preview dialog still needs to satisfy its accessibility description
  contract on the existing dialog owner,
- adding a block can leave the new widget off-screen with no clear visual
  anchor.

## Sub-Tasks

- `TASK-194-03-01_Save_Publish_Success_Feedback_and_Runtime_Preview_Failure_State.md`
- `TASK-194-03-02_New_Block_Insertion_Focus_and_Scroll.md`

## Scope

- Add visible success confirmation after draft save and publish.
- Keep failure feedback visible and actionable when save/publish fail.
- Make preview failure actionable when the preview target host is unreachable.
- Keep runtime-preview dialog copy and dialog-description ownership on the
  existing preview surface instead of moving it into settings/create code paths.
- Scroll/focus/highlight the newly inserted block into view.

Out of scope:

- changing preview token issuance,
- changing page publish semantics,
- replacing the current editor shell layout.

## Files to Change

- `core/admin/ui/pages/PageEditor.tsx`
- `core/admin/ui/preview/RuntimePreviewDialog.tsx`
- `core/admin/components/ui/dialog.tsx` only if the repo proves a truthful
  shared dialog fallback is required
- `core/admin/app/AdminApp.tsx` only if the shared toaster must be mounted
- `core/admin/ui/pages/builder/BlockList.tsx` only if data attributes/refs are
  needed for scroll targeting
- `tests/vitest/ui/page-editor-shell-wave.test.tsx`
- `tests/vitest/ui/runtime-preview-dialog.test.tsx`
- `tests/vitest/pageBuilder/blockList.test.tsx`

## Security Contract

- Visibility: internal admin editor UI plus existing public read-only preview.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - preview errors must not expose secrets or raw preview tokens,
  - success feedback must reflect actual successful completion, not optimistic
    fire-and-forget UI state.

## Testing Requirements

- Vitest coverage for:
  - success feedback on save/publish,
  - visible failure feedback on save/publish,
  - actionable preview failure state,
  - explicit runtime-preview dialog description on the real `Dialog` wrapper,
  - post-insert scroll/focus/highlight behavior,
  - no regression to existing preview/save/publish settings tests.
- Bun only if a leaf touches preview URL resolution logic on the server.

## Documentation Updates Required

- `_docs/PREVIEW_SPEC.md`
- `_docs/CMS_SPEC.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Save and publish show visible positive feedback on success.
2. Runtime preview failure becomes actionable instead of leaving only a broken
   browser frame.
3. Newly inserted blocks are brought into view and selected.
