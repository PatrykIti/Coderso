# TASK-208-05-01: Entry Create Toasts
# FileName: TASK-208-05-01_Entry_Create_Toasts.md

**Priority:** High
**Category:** CMS Entries + Admin/UI
**Estimated Effort:** Small
**Dependencies:** TASK-208-05, TASK-208-01
**Status:** To Do

---

## Overview

Add missing top-right toast feedback for Entries list create success and create
failure.

Entry duplicate, bulk update, and delete already use `toast`; this leaf should
not rewrite those flows.

## Sub-Tasks

No child task files.

## Implementation Checklist

- In `core/admin/ui/entries/EntryList.tsx`, add `toast.success` to
  `handleEntryCreated` after the list/cache state is updated.
- In `core/admin/ui/entries/EntryCreateDrawer.tsx`, call `toast.error(message)`
  in the create catch path while preserving the drawer-local error alert.
- Keep `openAfterCreate` navigation behavior unchanged.
- Keep the selected/current content type scope unchanged.

## Pseudocode

```tsx
// core/admin/ui/entries/EntryList.tsx
const handleEntryCreated = (created, typeSlug, openAfterCreate) => {
  upsertEntryIntoAllEntries(created, typeSlug);
  toast.success("Entry created.");

  if (openAfterCreate) {
    navigate(`/content-entries/${encodeURIComponent(typeSlug)}/${encodeURIComponent(created.id)}`);
  }
};
```

```tsx
// core/admin/ui/entries/EntryCreateDrawer.tsx
import { toast } from "sonner";

try {
  const created = await createEntry(typeSlug, payload);
  onCreated?.(created, typeSlug, openAfterCreate);
} catch (error) {
  const message = error instanceof Error && error.message
    ? error.message
    : "Failed to create entry.";
  setError(message);
  toast.error(message);
}
```

## Testing Requirements

- `tests/vitest/ui/entry-list-wave.test.tsx`
  - in the existing create-in-current-type test, assert `toast.success`,
  - add or extend create failure coverage and assert `toast.error`,
  - ensure navigation assertions for `openAfterCreate` still pass.

## Documentation Updates Required in This Round

- `_docs/CONTENT_LIST_UX.md`
  - Entries create feedback contract.
- `_docs/_TASKS/TASK-208-05*.md`
  - status and validation notes.

## Acceptance Criteria

1. Entry create success emits a shared top-right toast.
2. Entry create failure emits a shared top-right error toast and keeps local
   drawer error feedback.
3. Existing create navigation/scope behavior is unchanged.
