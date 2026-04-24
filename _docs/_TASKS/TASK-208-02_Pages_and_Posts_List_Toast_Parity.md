# TASK-208-02: Pages and Posts List Toast Parity
# FileName: TASK-208-02_Pages_and_Posts_List_Toast_Parity.md

**Priority:** High
**Category:** CMS Pages + CMS Posts + Admin/UI
**Estimated Effort:** Large
**Dependencies:** TASK-208-01
**Status:** To Do

---

## Overview

Add consistent top-right toast feedback for Pages and Posts list-screen state
changes after the shared toaster is token-backed.

This round must preserve current drawer behavior, inline error messages, bulk
partial-failure feedback, cache invalidation, navigation preferences, and
token-backed delete confirmation dialogs.

## Sub-Tasks

- [ ] `TASK-208-02-01_Pages_List_Mutation_Toasts.md`
- [ ] `TASK-208-02-02_Posts_List_Mutation_Toasts.md`
- [ ] `TASK-208-02-03_Pages_Posts_Toast_Regression_Tests.md`

## Implementation Round

1. Add Pages list toasts for create, publish, unpublish, delete, and bulk
   publish/unpublish/delete.
2. Add Posts list toasts for create, publish, unpublish, delete, and bulk
   publish/unpublish/delete.
3. Add focused Vitest assertions for success and failure paths.

## Security Contract

- Visibility: internal admin Pages/Posts lists.
- Auth model: existing authenticated admin session/API key.
- RBAC: existing page/post write and publish permissions.
- CSRF: existing `pagesClient` and `postsClient` helpers.
- Rate-limit bucket: existing admin write bucket.
- Reject-unknown validation: unchanged; no new payloads.
- Anti-abuse: delete remains gated by shared confirmation dialogs.

## Files to Change

- `core/admin/ui/pages/PageListPage.tsx`
- `core/admin/ui/pages/PageCreateDrawer.tsx` only if create failure toast must be
  emitted from the drawer owner.
- `core/admin/ui/posts/PostsListPage.tsx`
- `core/admin/ui/posts/PostsCreateDrawer.tsx` only if create failure toast must
  be emitted from the drawer owner.
- `tests/vitest/ui/page-post-list-wave.test.tsx`

## Testing Requirements

- Update `tests/vitest/ui/page-post-list-wave.test.tsx`:
  - add a `sonner` mock if missing,
  - assert Pages create success and create failure call `toast.success` /
    `toast.error`,
  - assert Pages publish/unpublish/delete success and failure paths toast,
  - assert Pages bulk publish/unpublish/delete success and partial failure toast,
  - assert Posts equivalent paths toast,
  - assert delete toasts fire only after confirming the shared dialog.

## Documentation Updates Required in This Round

- `_docs/CONTENT_LIST_UX.md`
  - update Pages and Posts list feedback contract.
- `_docs/_TASKS/TASK-208*.md`
  - update status and validation notes when complete.

## Acceptance Criteria

1. Pages list actions emit top-right success/error toasts after mutation
   completion.
2. Posts list actions emit top-right success/error toasts after mutation
   completion.
3. Existing inline and partial-failure feedback remains visible.
4. Delete toasts are emitted only after the confirmed delete mutation resolves.
