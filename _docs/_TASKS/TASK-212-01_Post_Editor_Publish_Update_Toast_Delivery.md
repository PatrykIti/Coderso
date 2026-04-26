# TASK-212-01: Post Editor Mutation Wrapper Parity
# FileName: TASK-212-01_Post_Editor_Publish_Update_Toast_Delivery.md

**Priority:** High
**Category:** CMS/Posts + Admin/UI + Notifications + Editor Wrapper
**Estimated Effort:** Medium
**Dependencies:** TASK-212, TASK-204-01, TASK-211-02
**Status:** To Do

---

## Overview

Harden the Posts editor publish/update wrapper so it matches the shared Pages
editor mutation-feedback and cache/update contract.

The 2026-04-26 replay proves the user-visible `BUG-5` toast symptom is now fixed
live: Publish shows `Post published` and Update shows `Changes saved`. The code
still does not match Pages editor architecture because `PostBlockEditorShell`
calls Sonner directly and swallows rejected publish/update promises. Posts must
reuse the shared editor action-toast helper introduced by the Pages follow-up,
prove the actual notification surface, and keep cache/dirty-state behavior
truthful.

This parity is about shared contract ownership, not copying the Pages editor
surface wholesale. Pages has explicit Save draft and Publish buttons. Posts
currently has publish/update plus autosave/manual retry behavior, so this task
must normalize the existing Posts actions first instead of inventing a new
primary Save Draft flow.

## Sub-Tasks

- `TASK-212-01-01_Post_Editor_Action_Toast_Adapter_Wiring.md`
- `TASK-212-01-02_Post_Publish_Update_Live_Toast_Proof.md`

## Files to Change

- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
- `core/admin/ui/posts/editor/header/PostEditorActionCluster.tsx` only if the
  callback type/props need to stay explicit; keep it presentational
- `core/admin/ui/posts/editor/PostEditorTopBar.tsx` only if callback typing is
  affected; keep mutation behavior out of this wrapper
- `core/admin/ui/shared/actionToasts.ts` only if the shared adapter needs a
  small extension
- `core/admin/services/postsClient.ts` only if cache-broadcast or mutation
  semantics need a parity bug fix
- `core/admin/services/apiClient.ts` only if a shared CSRF/transport bug is
  proven; do not add Posts-editor-local token handling
- `tests/vitest/ui/action-toasts.test.ts`
- `tests/vitest/ui/post-block-editor-shell-wave.test.tsx`
- `tests/vitest/ui/post-editor-state-hook-wave.test.tsx`
- `tests/vitest/ui-integration/post-editor-header-workflow.test.tsx`
- `tests/vitest/admin/adminApp.test.tsx`
- `tests/vitest/admin/sonner.test.tsx`

## Implementation Direction

Keep mutation ownership in the editor hook/shell path and keep header
components presentational. Pages does not have a monolithic editor wrapper
framework; it uses shared seams with thin resource adapters:

- shared Sonner host: `AdminApp` + `Toaster`;
- non-list mutation helper: `createAdminActionToastAdapter`;
- shared transport: `apiClient` with CSRF bootstrap/retry;
- resource client cache ownership: `pagesClient` / `postsClient` plus
  `cacheBus`;
- resource-local editor state for dirty/remote-update guards.

Posts should mirror that shape without inventing a new wrapper layer:

```ts
const postEditorActionToasts = createAdminActionToastAdapter({
  actions: {
    publish: {
      success: "Post published",
      errorFallback: "Failed to publish post.",
    },
    update: {
      success: "Changes saved",
      errorFallback: "Failed to save changes.",
    },
  },
});
```

The implementation may use `publish` versus `update` based on pre-mutation
status, but error handling cannot remain `catch(() => undefined)`. Failures
must keep truthful inline error state and emit a bounded toast message.

Do not add noisy success toasts for background autosave. Autosave success can
remain inline (`Autosaved at ...`). If the existing manual autosave retry button
is touched, failure handling must be bounded and visible, but success feedback
should not be used to justify a new primary Save Draft action unless that
separate product change is explicitly accepted.

Cache/update parity guidance:

- keep `postsClient` as the owner of `cacheKeys.postsList`,
  `cacheKeys.postDetail(id)`, TTL/local-cache writes, and `cacheBus` broadcasts;
- keep `usePostEditorState` as the dirty-state owner. Remote cache events must
  set/clear `remoteUpdatePending` without overwriting unsaved local edits;
- use existing `apiClient` `withCsrf` behavior. If stale-token behavior fails,
  fix `apiClient` once for all admin writes rather than in the Posts editor.

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
  - update success emits `Changes saved` after an already-published post is
    updated;
  - publish/update failures emit bounded error toasts and preserve inline error
    state.
- `tests/vitest/ui/post-editor-state-hook-wave.test.tsx`
  - save-before-publish keeps the current dirty-state/remote-update guard;
  - cache refresh after publish/update does not overwrite unsaved local state;
  - cacheBus-driven refresh keeps `remoteUpdatePending` behavior explicit.
- `tests/vitest/ui-integration/post-editor-header-workflow.test.tsx`
  - header buttons remain presentational and keep current labels/states.
- `tests/vitest/ui/action-toasts.test.ts`
  - shared adapter copy stays bounded and reusable by Pages and Posts.
- `tests/vitest/admin/adminApp.test.tsx` and `tests/vitest/admin/sonner.test.tsx`
  - the single shared toaster host remains mounted and token-backed.
- Manual Playwright:
  - after Publish and Update, assert `[data-sonner-toast]` or the `Admin
    notifications` live region contains the expected user-facing message;
  - reject one publish/update path and assert bounded error toast plus inline
    editor error state.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-POSTS.md`
- `_docs/CONTENT_EDITOR_UX.md` if toast copy/behavior changes
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Publish success keeps visible accessible toast feedback.
2. Update success keeps visible accessible toast feedback.
3. Publish/update failures are no longer swallowed.
4. Posts editor uses the shared action-toast contract, not direct ad hoc
   notification calls in presentation components.
5. Cache refresh and remote-update behavior stay aligned with the current Pages
   editor principles without replacing `postsClient` or `apiClient`.
