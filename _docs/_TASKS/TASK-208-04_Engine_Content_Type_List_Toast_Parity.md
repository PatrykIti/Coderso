# TASK-208-04: Engine Content Type List Toast Parity
# FileName: TASK-208-04_Engine_Content_Type_List_Toast_Parity.md

**Priority:** High
**Category:** CMS Engine + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-208-01, TASK-208-03
**Status:** To Do

---

## Overview

Close remaining Coderso Engine content type list toast gaps after the shared
toaster token contract is fixed.

Content Types already have some toast behavior for create, duplicate, and row
delete. This round must preserve that behavior while adding missing create-error
and bulk lifecycle notifications for publish, draft/unpublish, and delete.

Content Types should reuse the generic list-action toast helper with an Engine
content type adapter/config. Existing list-action `toast.success` and
`toast.error` calls touched by this family should be routed through the shared
adapter instead of keeping Content-Type-only message and error logic.

## Sub-Tasks

- [ ] `TASK-208-04-01_Content_Type_Create_Error_Toasts.md`
- [ ] `TASK-208-04-02_Content_Type_Bulk_Toasts_and_Regression_Tests.md`

## Security Contract

- Visibility: internal admin Coderso Engine content type list.
- Auth model: existing admin session/API key.
- RBAC: existing content type write/publish permissions.
- CSRF: existing `contentTypesClient` helpers.
- Rate-limit bucket: existing admin write bucket.
- Reject-unknown validation: unchanged.
- Anti-abuse: delete remains gated by shared confirmation dialogs and existing
  content type delete guards.

## Files to Change

- `core/admin/ui/content-types/ContentTypeList.tsx`
- `core/admin/ui/content-types/ContentTypeCreateDrawer.tsx`
- `core/admin/ui/shared/listActionToasts.ts`
- `tests/vitest/ui/content-type-list-parity.test.tsx`
- `tests/vitest/ui/content-type-create-drawer.test.tsx`
- `tests/vitest/ui/list-action-toasts.test.ts`

## Testing Requirements

- Update `tests/vitest/ui/content-type-list-parity.test.tsx`:
  - assert create success still toasts,
  - assert parent/list create success behavior by extending the existing
    `ContentTypeCreateDrawer` mock only for the parent callback branch,
  - assert bulk publish/draft/delete success emits the expected final toast,
  - assert partial failure emits the expected final error toast while preserving
    inline feedback,
  - assert row delete toast still fires after confirmation.
- Add or update `tests/vitest/ui/content-type-create-drawer.test.tsx`:
  - render the real `ContentTypeCreateDrawer`,
  - assert rejected `createContentType` keeps local drawer error feedback,
  - assert the adapter-backed top-right error toast is emitted for rejected
    create mutations/API failures,
  - assert duplicate-name, duplicate-slug, and missing-field validation remain
    inline-only with no top-right toast.
- Update `tests/vitest/ui/list-action-toasts.test.ts` if the Content Type
  adapter adds helper branches not already covered.

## Documentation Updates Required in This Round

- `_docs/CONTENT_LIST_UX.md`
  - update Engine/Content Types list feedback contract.
- `_docs/_TASKS/TASK-208*.md`
  - update status and validation notes when complete.

## Acceptance Criteria

1. Content type list create success/error, row delete, and bulk lifecycle actions
   emit shared top-right toasts.
2. Bulk partial failure remains truthful and visible inline.
3. No content-type-specific toaster host or styling is introduced.
4. Existing delete guard behavior is unchanged.
5. Content Types use the generic list-action toast helper/adapter for shared
   error and bulk message behavior.
