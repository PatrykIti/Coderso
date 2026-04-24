# TASK-208-04-01: Content Type Create Error Toasts
# FileName: TASK-208-04-01_Content_Type_Create_Error_Toasts.md

**Priority:** High
**Category:** CMS Engine + Admin/UI
**Estimated Effort:** Small
**Dependencies:** TASK-208-04, TASK-208-01
**Status:** To Do

---

## Overview

Keep existing Content Type create success toasts and add missing create failure
toast feedback for the list create drawer.

## Sub-Tasks

No child task files.

## Implementation Checklist

- Inspect `core/admin/ui/content-types/ContentTypeCreateDrawer.tsx`.
- If the drawer catches `createContentType` errors and only sets local `error`,
  also call the shared list-action error-toast helper.
- Keep `ContentTypeList.handleCreated` success toast in
  `core/admin/ui/content-types/ContentTypeList.tsx`, but route the success copy
  through the Content Type adapter/config.
- Reuse `core/admin/ui/shared/listActionToasts.ts` for error normalization and
  action copy.
- Because both `ContentTypeList` and `ContentTypeCreateDrawer` need the Content
  Type adapter, extract a small resource-local adapter module if needed instead
  of duplicating the same config in both components.
- Do not navigate or mutate list state from the drawer; keep the parent
  `onCreated` callback as the success owner.

## Pseudocode

```tsx
// Shared by the list and create drawer, for example from
// core/admin/ui/content-types/contentTypeListToastAdapter.ts.
const contentTypeToast = createListActionToastAdapter({
  resourceSingular: "collection",
  resourcePlural: "collections",
  actions: {
    create: { success: ({ label }) => `Collection "${label}" created.`, fallbackError: "Failed to create content type." },
    delete: { success: "Collection deleted.", fallbackError: "Failed to delete content type." },
  },
});

try {
  const created = await createContentType(payload);
  onCreated?.(created);
  resetForm();
} catch (error) {
  const message = contentTypeToast.errorMessage(error, "create");
  setError(message);
  contentTypeToast.error(message);
}
```

Success stays in parent:

```tsx
// core/admin/ui/content-types/ContentTypeList.tsx
const handleCreated = (created) => {
  setTypes((prev) => [created, ...prev]);
  contentTypeToast.success("create", { label: created.name });
  navigate(`/content-types/${encodeURIComponent(created.id)}`);
};
```

## Testing Requirements

- `tests/vitest/ui/content-type-list-parity.test.tsx`
  - assert existing create success toast still fires,
  - add create failure setup and assert the expected final error toast,
  - preserve drawer inline error assertion if one exists or add one if the test
    already covers drawer errors.

## Documentation Updates Required in This Round

- `_docs/CONTENT_LIST_UX.md`
  - Engine create feedback notes.
- `_docs/_TASKS/TASK-208-04*.md`
  - status and validation notes.

## Acceptance Criteria

1. Content Type create success still uses the shared top-right toast.
2. Content Type create failure shows both local drawer feedback and top-right
   error toast.
3. Parent/drawer ownership stays unchanged.
4. Create success/error copy and fallback handling come from the shared
   list-action toast helper/adapter.
