# TASK-204-01-01: Publish Update Toast Delivery and A11y Proof
# FileName: TASK-204-01-01_Publish_Update_Toast_Delivery_and_A11y_Proof.md

**Priority:** High
**Category:** CMS/Posts + Admin/UI
**Estimated Effort:** Small
**Dependencies:** TASK-204-01
**Status:** To Do

---

## Overview

The current code dispatches `toast.success()` after publish/update, but the
Playwright replay did not show a visible toast and the live region stayed empty.
This leaf proves and repairs the full path from Posts editor action to shared
admin toaster.

Ownership:

- `PostBlockEditorShell` dispatches post-specific success feedback after the
  editor mutation resolves.
- `AdminApp` owns the one shared `Toaster` mount for admin UI.
- `core/admin/components/ui/sonner.tsx` owns shared toast configuration.
- Tests must verify a browser-visible contract, not only that a mocked
  `toast.success` function was called.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx:551-558`
- `core/admin/app/AdminApp.tsx:826`
- `core/admin/components/ui/sonner.tsx`
- `tests/vitest/ui/post-block-editor-shell-wave.test.tsx:617`
- `tests/vitest/admin/adminApp.test.tsx`
- `tests/vitest/ui-integration/post-editor-header-workflow.test.tsx`

## Implementation Notes

- Start by reproducing the missing visible toast in a browser-like run.
- If the shared toaster is mounted but not screen-reader visible, fix the shared
  toast configuration or add a bounded shared live feedback assertion.
- Keep copy stable:
  - first publish: `Post published`;
  - later update: `Changes saved`.
- Do not add a Posts-only live region when the shared admin shell can own the
  accessibility path.

## Security Contract

- Visibility: internal admin Posts editor only.
- No new endpoint, auth path, RBAC rule, CSRF behavior, or rate-limit bucket.
- Anti-abuse: feedback copy must not include post content, tokens, stack
  traces, or raw API errors.

## Testing Requirements

- Vitest:
  - publish/update feedback dispatch still occurs after successful mutation,
  - admin shell contains one shared toast host,
  - browser-like UI assertion proves the success message becomes visible or
    screen-reader reachable.
- Manual Playwright:
  - publish and update each show visible feedback,
  - no duplicate toaster hosts appear.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-POSTS.md`
- `_docs/CONTENT_EDITOR_UX.md` if the visible feedback contract changes
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Publish/update success feedback is visibly rendered in replay.
2. The accessibility path is covered by a direct test or replay evidence.
3. `AdminApp` remains the only toaster mount owner.
4. The current Posts mutation flow and copy remain coherent.
