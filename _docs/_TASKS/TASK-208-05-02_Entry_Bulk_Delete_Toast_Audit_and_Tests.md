# TASK-208-05-02: Entry Bulk Delete Toast Audit and Tests
# FileName: TASK-208-05-02_Entry_Bulk_Delete_Toast_Audit_and_Tests.md

**Priority:** High
**Category:** CMS Entries + QA/Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-208-05-01
**Status:** To Do

---

## Overview

Verify and harden existing Entries bulk publish/draft/archive/delete toast
behavior against the new shared token-backed toaster contract.

This leaf should only patch gaps found in the audit. Existing `toast.success`
and `toast.error` calls in `EntryList` should be preserved unless their timing
or failure semantics are wrong.

## Sub-Tasks

No child task files.

## Implementation Checklist

- Inspect `runBulkAction`, `handleBulkApply`, and confirmed delete execution in
  `core/admin/ui/entries/EntryList.tsx`.
- Confirm `toast.success("Entries updated.")` fires only after all selected
  metadata mutations succeed.
- Confirm partial failures call `toast.error(message)` and keep inline
  feedback.
- Confirm row/bulk delete success/error toasts fire only after the shared
  confirmation dialog path.
- If success copy is too generic, keep it acceptable unless tests need separate
  publish/draft/archive copy; do not widen scope to copy-only refactors.

## Pseudocode

```tsx
const runBulkAction = async (action) => {
  const status = action === "publish" ? "published" : action === "draft" ? "draft" : "archived";
  const results = await Promise.allSettled(
    selectedRefs.map((ref) => updateEntryMetadata(ref.typeSlug, ref.id, { status }))
  );

  const failed = results.filter((result) => result.status === "rejected").length;
  if (failed > 0) {
    const message = `${failed} entr${failed === 1 ? "y" : "ies"} failed to update.`;
    setError(message);
    toast.error(message);
    return;
  }

  toast.success("Entries updated.");
};

const confirmDelete = async () => {
  await Promise.allSettled(deleteRequest.refs.map((ref) => deleteEntry(ref.typeSlug, ref.id)));
  toast.success(deleteRequest.refs.length === 1 ? "Entry deleted." : "Entries deleted.");
};
```

## Testing Requirements

- `tests/vitest/ui/entry-list-wave.test.tsx`
  - existing bulk updates test: assert success toast after selected refs update,
  - existing partial failure test: assert error toast and inline feedback,
  - existing delete confirmation test: assert no delete toast before confirm and
    success/error toast after confirm,
  - assert no extra toaster host is rendered by `EntryList`.

## Documentation Updates Required in This Round

- `_docs/CONTENT_LIST_UX.md`
  - Entries bulk/delete feedback contract if the audit changes wording.
- `_docs/_TASKS/TASK-208-05*.md`
  - status and validation notes.

## Acceptance Criteria

1. Entries bulk update success/error toast behavior is covered by tests.
2. Entries row/bulk delete toast ordering after confirmation is covered by
   tests.
3. Existing inline partial-failure feedback remains intact.
