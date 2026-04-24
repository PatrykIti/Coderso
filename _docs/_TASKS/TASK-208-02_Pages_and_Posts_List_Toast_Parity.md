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

Pages and Posts should use the shared list-action toast helper introduced in
this task. The screens pass page/post labels, action names, counts, and fallback
messages; they should not duplicate generic bulk result and error-normalization
logic.

## Sub-Tasks

- [ ] `TASK-208-02-01_Pages_List_Mutation_Toasts.md`
- [ ] `TASK-208-02-02_Posts_List_Mutation_Toasts.md`
- [ ] `TASK-208-02-03_Pages_Posts_Toast_Regression_Tests.md`

## Implementation Round

1. Add or reuse the shared `listActionToasts` helper with Pages/Posts adapter
   parameters.
2. Add Pages list toasts for create, publish, unpublish, delete, and bulk
   publish/unpublish/delete.
3. Add Posts list toasts for create, publish, unpublish, delete, and bulk
   publish/unpublish/delete.
4. Add focused Vitest assertions for success and failure paths.

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
- `core/admin/ui/shared/listActionToasts.ts`
- `tests/vitest/ui/page-post-list-wave.test.tsx`
- `tests/vitest/ui/list-action-toasts.test.ts`

## Testing Requirements

- Add or update `tests/vitest/ui/list-action-toasts.test.ts`:
  - assert generic single-action success/error message helpers,
  - assert bulk full success and partial failure helpers for Pages/Posts labels.
- Update `tests/vitest/ui/page-post-list-wave.test.tsx`:
  - add a `sonner` mock if missing,
  - assert Pages create success and create failure emit the expected final
    success/error toast through the shared helper,
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
5. Pages and Posts use the generic list-action toast helper plus resource
   adapter parameters instead of per-screen duplicated feedback math.
