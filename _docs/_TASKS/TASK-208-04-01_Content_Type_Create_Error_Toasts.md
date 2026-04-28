# TASK-208-04-01: Content Type Create Error Toasts
# FileName: TASK-208-04-01_Content_Type_Create_Error_Toasts.md

**Priority:** High
**Category:** CMS Engine + Admin/UI
**Estimated Effort:** Small
**Dependencies:** TASK-208-04, TASK-208-01
**Status:** Done (2026-04-24)

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
- Do not add a new drawer-local `toast.error` branch. The drawer and parent list
  must use the same Content Type adapter/config, whether that adapter is inline
  in the single owner or extracted into a small resource-local module.
- Emit the top-right error toast only for rejected `createContentType`
  mutations/API failures. Local validation failures such as duplicate name,
  duplicate slug, or missing required fields remain inline drawer feedback and do
  not emit floating toasts.
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
  - current coverage stubs `ContentTypeCreateDrawer`; extend that mock only to
    drive the parent `onCreated` success path and prove parent/list success
    toast behavior.
- Add `tests/vitest/ui/content-type-create-drawer.test.tsx` for the real drawer
  create-error branch:
  - render the real `ContentTypeCreateDrawer`,
  - assert rejected `createContentType` keeps local drawer error feedback and
    emits the expected adapter-backed top-right error toast,
  - assert duplicate-name, duplicate-slug, and missing-field validation remains
    local-only and does not emit a top-right error toast,
  - if the implementation extends an existing drawer-focused suite instead of
    adding this file, name that exact suite in the validation notes and closure
    command.

## Documentation Updates Required in This Round

- `_docs/CONTENT_LIST_UX.md`
  - Engine create feedback notes.
- `_docs/_TASKS/TASK-208-04*.md`
  - status and validation notes.

## Acceptance Criteria

1. Content Type create success still uses the shared top-right toast.
2. Content Type create failure shows both local drawer feedback and top-right
   error toast when the create mutation/API call rejects.
3. Parent/drawer ownership stays unchanged.
4. Create success/error copy and fallback handling come from the shared
   list-action toast helper/adapter.
5. Local duplicate/missing-field validation remains inline-only and does not emit
   floating toasts.
