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
or failure semantics are wrong. When a gap is patched, route the message through
the shared list-action toast helper/adaptor instead of adding another
Entries-only message function.

## Sub-Tasks

No child task files.

## Implementation Checklist

- Inspect `runBulkAction`, `handleBulkApply`, and confirmed delete execution in
  `core/admin/ui/entries/EntryList.tsx`.
- Confirm the final bulk success toast fires only after all selected metadata
  mutations succeed.
- Confirm partial failures emit the expected final error toast and keep inline
  feedback.
- Confirm row/bulk delete success/error toasts fire only after the shared
  confirmation dialog path.
- If success copy is too generic, keep it acceptable unless tests need separate
  publish/draft/archive copy; if copy is changed, implement it via the shared
  Entries adapter/config, not a local formatter.

## Pseudocode

```tsx
const runBulkAction = async (action) => {
  const status = action === "publish" ? "published" : action === "draft" ? "draft" : "archived";
  const results = await Promise.allSettled(
    selectedRefs.map((ref) => updateEntryMetadata(ref.typeSlug, ref.id, { status }))
  );

  const failed = results.filter((result) => result.status === "rejected").length;
  if (failed > 0) {
    const message = entriesToast.bulkErrorMessage({ action, failed, total: selectedRefs.length });
    setError(message);
    entriesToast.error(message);
    return;
  }

  entriesToast.bulkSuccess(action, selectedRefs.length);
};

const confirmDelete = async () => {
  await Promise.allSettled(deleteRequest.refs.map((ref) => deleteEntry(ref.typeSlug, ref.id)));
  entriesToast.bulkSuccess("delete", deleteRequest.refs.length);
};
```

## Testing Requirements

- `tests/vitest/ui/entry-list-wave.test.tsx`
  - existing bulk updates test: assert success toast after selected refs update,
  - existing partial failure test: assert error toast and inline feedback,
  - existing delete confirmation test: assert no delete toast before confirm and
    success/error toast after confirm,
  - assert no extra toaster host is rendered by `EntryList`.
- `tests/vitest/ui/list-action-toasts.test.ts`
  - cover any Entries-specific bulk helper behavior introduced by the audit.

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
4. Any changed Entries bulk/delete copy comes from the shared helper/adaptor and
   not from a local Entries-only formatter.
