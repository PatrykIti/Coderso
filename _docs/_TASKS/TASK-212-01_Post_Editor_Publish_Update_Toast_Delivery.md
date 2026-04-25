# TASK-212-01: Post Editor Publish Update Toast Delivery
# FileName: TASK-212-01_Post_Editor_Publish_Update_Toast_Delivery.md

**Priority:** High
**Category:** CMS/Posts + Admin/UI + Notifications
**Estimated Effort:** Medium
**Dependencies:** TASK-212, TASK-204-01, TASK-211-02
**Status:** To Do

---

## Overview

Repair `BUG-5` from the 2026-04-25 Posts replay. The publish/update mutation
path succeeds, but no visible Sonner toast appears and the live region remains
empty.

The current direct `toast.success(...)` call in
`PostBlockEditorShell` is not enough because the browser replay proves the
user-visible notification contract is still broken. Posts must reuse the shared
editor action-toast helper introduced by the Pages follow-up and prove the
actual notification surface, not only a mocked function call.

## Sub-Tasks

- `TASK-212-01-01_Post_Editor_Action_Toast_Adapter_Wiring.md`
- `TASK-212-01-02_Post_Publish_Update_Live_Toast_Proof.md`

## Files to Change

- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
- `core/admin/ui/posts/editor/header/PostEditorActionCluster.tsx`
- `core/admin/ui/posts/editor/PostEditorTopBar.tsx`
- `core/admin/ui/shared/actionToasts.ts` only if the shared adapter needs a
  small extension
- `tests/vitest/ui/action-toasts.test.ts`
- `tests/vitest/ui/post-block-editor-shell-wave.test.tsx`
- `tests/vitest/ui-integration/post-editor-header-workflow.test.tsx`
- `tests/vitest/admin/adminApp.test.tsx`
- `tests/vitest/admin/sonner.test.tsx`

## Implementation Direction

Keep mutation ownership in the editor hook/shell path and keep header
components presentational. Posts should mirror the Pages shape:

```ts
const postEditorActionToasts = createAdminActionToastAdapter({
  actions: {
    saveDraft: {
      success: "Changes saved.",
      errorFallback: "Failed to save changes.",
    },
    publish: {
      success: "Post published.",
      errorFallback: "Failed to publish post.",
    },
    update: {
      success: "Changes saved.",
      errorFallback: "Failed to save changes.",
    },
  },
});
```

The implementation may use `publish` versus `update` based on pre-mutation
status, but error handling cannot remain `catch(() => undefined)`. Failures
must keep truthful inline error state and emit a bounded toast message.

## Security Contract

- Visibility: internal admin editor only.
- Auth model: unchanged admin session/API-key path.
- RBAC: existing `content:write` and `content:publish`.
- CSRF: existing publish/update calls keep `withCsrf: true`.
- Rate-limit bucket: existing admin write bucket.
- Reject-unknown validation: unchanged route payload validation.
- Anti-abuse:
  - toast copy must not expose raw API payloads, SQL, tokens, headers, or stack
    traces;
  - failures must remain failures and must not be hidden by optimistic UI;
  - no private notification channel or duplicate toaster host is allowed.

## Testing Requirements

- `tests/vitest/ui/post-block-editor-shell-wave.test.tsx`
  - publish success emits the shared adapter message after the awaited mutation;
  - update success emits `Changes saved.` after an already-published post is
    updated;
  - publish/update failures emit bounded error toasts and preserve inline error
    state.
- `tests/vitest/ui-integration/post-editor-header-workflow.test.tsx`
  - header buttons remain presentational and keep current labels/states.
- `tests/vitest/ui/action-toasts.test.ts`
  - shared adapter copy stays bounded and reusable by Pages and Posts.
- `tests/vitest/admin/adminApp.test.tsx` and `tests/vitest/admin/sonner.test.tsx`
  - the single shared toaster host remains mounted and token-backed.
- Manual Playwright:
  - after Publish and Update, assert `[data-sonner-toast]` or the `Admin
    notifications` live region contains the expected user-facing message.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-POSTS.md`
- `_docs/CONTENT_EDITOR_UX.md` if toast copy/behavior changes
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Publish success produces a visible accessible toast.
2. Update success produces a visible accessible toast.
3. Publish/update failures are no longer swallowed.
4. Posts editor uses the shared action-toast contract, not direct ad hoc
   notification calls in presentation components.
