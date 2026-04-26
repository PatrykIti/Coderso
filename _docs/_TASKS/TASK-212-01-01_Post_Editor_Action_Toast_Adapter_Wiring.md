# TASK-212-01-01: Post Editor Action Toast Adapter Wiring
# FileName: TASK-212-01-01_Post_Editor_Action_Toast_Adapter_Wiring.md

**Priority:** High
**Category:** CMS/Posts + Admin/UI + Notifications
**Estimated Effort:** Small
**Dependencies:** TASK-212-01, TASK-211-02-01
**Status:** To Do

---

## Overview

Replace the Posts editor direct `toast.success(...)` path with a thin adapter
over `createAdminActionToastAdapter`.

The goal is not a new abstraction. Pages already uses the shared adapter, and
the 2026-04-26 replay proves the current Posts browser symptom is fixed from a
user perspective. This leaf removes the remaining implementation debt: direct
component-local Sonner calls and swallowed publish/update failures.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `core/admin/ui/shared/actionToasts.ts` only if a minimal shared option is
  required
- `tests/vitest/ui/post-block-editor-shell-wave.test.tsx`
- `tests/vitest/ui/action-toasts.test.ts`

## Implementation Direction

1. Define a Posts editor action-toast adapter near the shell owner or in a
   small Posts editor helper if reuse becomes real.
2. Choose action copy based on mutation intent:
   - published-post update success: `Changes saved`
   - publish success: `Post published`
   - publish fallback: `Failed to publish post.`
   - update fallback: `Failed to save changes.`
   - optional manual autosave retry fallback, only if the existing Retry now
     path is touched in this slice.
3. Replace `catch(() => undefined)` with bounded error handling.
4. Keep existing inline editor error/status behavior; toast is the visible
   global confirmation, not a replacement for truthful local state.
5. Keep background autosave success quiet and do not add a new primary Save
   Draft button as part of this leaf.

Pseudocode:

```ts
onPublish={async () => {
  const action = editor.status === "published" ? "update" : "publish";
  try {
    await editor.publish();
    postEditorActionToasts.success(action);
  } catch (error) {
    postEditorActionToasts.error(action, error);
  }
}}
```

Keep the hook as the inline error/status owner. `usePostEditorState` already
sets bounded local errors and rethrows; the shell should pass the rejection to
the shared adapter instead of dropping it.

## Security Contract

- Visibility: internal admin editor only.
- Auth/RBAC/CSRF/rate-limit: unchanged existing Posts mutation contract.
- Reject-unknown validation: unchanged.
- Anti-abuse: never forward raw untrusted error text unless it is already a
  bounded `ApiClientError`/known route error accepted by
  `resolveAdminActionErrorMessage`.

## Testing Requirements

- Unit/UI test proves:
  - `PostBlockEditorShell` no longer imports `sonner` directly;
  - success is emitted through the shared adapter for publish and update;
  - failure calls the adapter error branch with bounded fallback;
  - no duplicate success toast is emitted.
- Existing Pages adapter tests stay green.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-POSTS.md` closure note after the parent family
  validates visible delivery.

## Acceptance Criteria

1. Posts editor publish/update no longer calls ad hoc direct toast code.
2. Success and error copy is centralized through the shared editor action-toast
   adapter.
3. Failure handling is explicit and test-covered.
4. The visible `Post published` / `Changes saved` behavior from the 2026-04-26
   replay is preserved.
