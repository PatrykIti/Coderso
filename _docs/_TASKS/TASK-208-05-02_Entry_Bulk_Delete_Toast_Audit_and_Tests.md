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

This leaf audits the existing `EntryList` bulk lifecycle/delete toasts and
migrates targeted list-action feedback through the shared list-action toast
helper/adapter. Do not keep Entries-only bulk count, pluralization, or fallback
error helpers for behavior this task touches. Existing duplicate feedback can
stay on its current flow unless this task changes duplicate behavior.

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
- Replace local bulk/delete count and partial-failure string construction with
  the shared helper result so inline `setError` and floating `toast.error` use
  the same message.
- Preserve current `EntryList` orchestration ownership: `handleBulkApply` keeps
  working-state cleanup and non-delete selection cleanup, confirmed delete keeps
  `setDeleteRequest(null)`, and both paths refresh `entries:list:all` through
  `refreshEntries({ force: true, background: true })` before final cleanup.
- Use a generic target-aware helper shape for bulk operations. Entries bulk
  helpers must accept `SelectedEntryRef` / `{ id, typeSlug }` targets instead of
  coercing everything to plain ids, because delete and metadata updates need the
  owning content type slug.

## Pseudocode

```tsx
const runBulkAction = async (action) => {
  const status = action === "publish" ? "published" : action === "draft" ? "draft" : "archived";
  const results = await Promise.allSettled(
    selectedRefs.map((ref) => updateEntryMetadata(ref.typeSlug, ref.id, { status }))
  );

  const feedback = entriesToast.bulkResult<SelectedEntryRef>({
    action,
    targets: selectedRefs,
    results,
  });

  await refreshEntries({ force: true, background: true });
  entriesToast.emitBulkResult(feedback);
  return feedback;
};

const handleBulkApply = async () => {
  if (!bulkAction || selectedRefs.length === 0) return;
  if (bulkAction === "delete") {
    setDeleteRequest({
      refs: selectedRefs,
      title: `Delete ${selectedRefs.length} entr${selectedRefs.length === 1 ? "y" : "ies"}?`,
      description: "Selected entries will be removed permanently.",
      confirmLabel: selectedRefs.length === 1 ? "Delete entry" : "Delete entries",
      mode: "bulk",
    });
    return;
  }

  setIsBulkWorking(true);
  setError(null);
  try {
    const feedback = await runBulkAction(bulkAction);
    if (!feedback.ok) setError(feedback.message);
    handleClearSelection();
  } finally {
    setIsBulkWorking(false);
  }
};

const confirmDeleteRequest = async () => {
  const results = await Promise.allSettled(
    deleteRequest.refs.map((ref) => deleteEntry(ref.typeSlug, ref.id))
  );
  const feedback = entriesToast.bulkResult<SelectedEntryRef>({
    action: "delete",
    targets: deleteRequest.refs,
    results,
  });

  await refreshEntries({ force: true, background: true });
  entriesToast.emitBulkResult(feedback);
  if (!feedback.ok) setError(feedback.message);
  if (deleteRequest.mode === "bulk") handleClearSelection();
  setDeleteRequest(null);
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
4. Entries bulk/delete copy comes from the shared helper/adapter and not from a
   local Entries-only formatter or local count/pluralization branch.
