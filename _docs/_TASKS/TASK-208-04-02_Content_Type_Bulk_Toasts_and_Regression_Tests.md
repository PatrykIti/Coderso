# TASK-208-04-02: Content Type Bulk Toasts and Regression Tests
# FileName: TASK-208-04-02_Content_Type_Bulk_Toasts_and_Regression_Tests.md

**Priority:** High
**Category:** CMS Engine + QA/Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-208-04-01
**Status:** Done (2026-04-24)

---

## Overview

Add shared top-right toast feedback for Content Type bulk publish, draft, and
delete actions while preserving inline partial-failure feedback.

## Sub-Tasks

No child task files.

## Implementation Checklist

- Update `runBulkAction` in
  `core/admin/ui/content-types/ContentTypeList.tsx`.
- Preserve current `bulkFeedback` state.
- On full success, call the shared list-action success helper.
- On partial/full failure, call the shared list-action error helper with the
  same truthful helper-returned `inlineMessage` / `toastMessage` copy used
  inline.
- Keep bulk delete confirmation dialog and only emit delete toast after confirm.
- Preserve the current state model: failures set `setError(message)` and keep
  failed IDs selected; full success clears selection and may keep the existing
  success `bulkFeedback` alert. Do not invent a new `bulkFeedback.variant`
  contract for failures.

## Pseudocode

```tsx
const runBulkAction = async (action, ids) => {
  const results = await Promise.allSettled(ids.map((id) => {
    if (action === "publish") return updateContentType(id, { status: "published" });
    if (action === "draft") return updateContentType(id, { status: "draft" });
    return deleteContentType(id);
  }));

  const feedback = contentTypeToast.bulkResult({ action, targets: ids, results });
  const nextTypes = await listContentTypesCached({ force: true });
  setTypes(nextTypes);

  if (!feedback.ok) {
    setSelectedIds(feedback.failedTargets);
    setError(feedback.inlineMessage ?? feedback.toastMessage);
    contentTypeToast.emitBulkResult(feedback);
    return;
  }

  handleClearSelection();
  setBulkFeedback({
    title: "Bulk action completed",
    message: feedback.inlineMessage,
  });
  contentTypeToast.emitBulkResult(feedback);
};
```

## Testing Requirements

- `tests/vitest/ui/content-type-list-parity.test.tsx`
  - existing bulk publish test: assert success toast,
  - add bulk draft assertion if no existing path covers it,
  - existing bulk delete confirmation test: assert no toast before confirm and
    success toast after confirm,
  - add partial failure mock and assert the expected final error toast plus
    inline feedback.
- `tests/vitest/ui/list-action-toasts.test.ts`
  - cover shared bulk success/error count behavior used by Content Types.

## Documentation Updates Required in This Round

- `_docs/CONTENT_LIST_UX.md`
  - Content Types bulk action feedback contract.
- `_docs/_TASKS/TASK-208-04*.md`
  - status and validation notes.

## Acceptance Criteria

1. Content Type bulk publish/draft/delete emit success toasts after full success.
2. Partial failures emit error toasts and preserve inline details.
3. Bulk delete toast is emitted only after the confirmation dialog path.
4. Bulk message and failure count behavior comes from the shared helper/adapter,
   not a Content-Type-only message function or local count/pluralization branch.
