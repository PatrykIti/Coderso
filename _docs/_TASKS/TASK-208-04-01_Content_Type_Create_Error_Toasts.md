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
  also call `toast.error(message)`.
- Keep `ContentTypeList.handleCreated` success toast in
  `core/admin/ui/content-types/ContentTypeList.tsx`.
- Do not navigate or mutate list state from the drawer; keep the parent
  `onCreated` callback as the success owner.

## Pseudocode

```tsx
// core/admin/ui/content-types/ContentTypeCreateDrawer.tsx
import { toast } from "sonner";

try {
  const created = await createContentType(payload);
  onCreated?.(created);
  resetForm();
} catch (error) {
  const message = error instanceof Error && error.message
    ? error.message
    : "Failed to create content type.";
  setError(message);
  toast.error(message);
}
```

Success stays in parent:

```tsx
// core/admin/ui/content-types/ContentTypeList.tsx
const handleCreated = (created) => {
  setTypes((prev) => [created, ...prev]);
  toast.success(`Collection "${created.name}" created.`);
  navigate(`/content-types/${encodeURIComponent(created.id)}`);
};
```

## Testing Requirements

- `tests/vitest/ui/content-type-list-parity.test.tsx`
  - assert existing create success toast still fires,
  - add create failure setup and assert `toast.error(message)`,
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
