# TASK-208-02-01: Pages List Mutation Toasts
# FileName: TASK-208-02-01_Pages_List_Mutation_Toasts.md

**Priority:** High
**Category:** CMS Pages + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-208-02, TASK-208-01
**Status:** To Do

---

## Overview

Add shared top-right toast feedback to Pages list create, publish, unpublish,
delete, and bulk lifecycle mutations.

This leaf does not change page routes, cache ownership, create payload shape, or
the existing delete confirmation dialog.

## Sub-Tasks

No child task files.

## Implementation Checklist

- Add `import { toast } from "sonner";` to
  `core/admin/ui/pages/PageListPage.tsx`.
- In `handleCreate`, toast after `createPage` succeeds and after local list
  state or navigation preference is applied.
- In `handleCreate` catch, keep `setError(message)` and also call
  `toast.error(message)`.
- In `handlePublish` and `handleUnpublish`, toast after the client mutation and
  local state update succeed.
- In `runDelete`, toast only after `deletePage(id)` succeeds from the
  confirmation dialog path.
- In `runBulkAction`, toast after all selected mutations settle:
  - full success: `toast.success(...)`,
  - partial/full failure: preserve inline feedback and call `toast.error(...)`.

## Pseudocode

```tsx
const toErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const handleCreate = async (payload) => {
  try {
    const page = await createPage(payload);
    upsertPageInState(page);
    toast.success(`Page "${page.title}" created.`);
    if (openAfterCreate) navigate(`/pages/${page.id}`);
  } catch (error) {
    const message = toErrorMessage(error, "Failed to create page.");
    setError(message);
    toast.error(message);
  }
};

const handlePublish = async (id: string) => {
  try {
    await publishPage(id);
    markPagePublished(id);
    toast.success("Page published.");
  } catch (error) {
    const message = toErrorMessage(error, "Failed to publish page.");
    setError(message);
    toast.error(message);
  }
};

const runDelete = async (id: string) => {
  try {
    await deletePage(id);
    removePageFromState(id);
    toast.success("Page deleted.");
  } catch (error) {
    const message = toErrorMessage(error, "Failed to delete page.");
    setError(message);
    toast.error(message);
  }
};
```

Bulk flow:

```tsx
const results = await Promise.allSettled(ids.map((id) => runPageMutation(action, id)));
const failed = results.filter((result) => result.status === "rejected").length;

if (failed > 0) {
  const message = `${failed} page action${failed === 1 ? "" : "s"} failed.`;
  setBulkFeedback({ variant: "destructive", title: "Bulk action failed", message });
  toast.error(message);
  return;
}

toast.success(action === "publish" ? "Pages published." : "Pages moved to draft.");
```

## Testing Requirements

- `tests/vitest/ui/page-post-list-wave.test.tsx`
  - add or reuse a hoisted `sonner` mock,
  - in the existing create/navigation test, assert `toast.success` after create,
  - in the existing failure test, assert `toast.error`,
  - in the publish/unpublish/delete test, assert success and failure toasts,
  - in the bulk publish test, assert the success toast after mutation completion,
  - add a delete-confirm assertion that no delete toast fires before clicking the
    confirmation dialog button.

## Documentation Updates Required in This Round

- `_docs/CONTENT_LIST_UX.md`
  - Pages list section: create/publish/unpublish/delete now emits shared
    top-right Admin UI toasts after mutation completion.
- `_docs/_TASKS/TASK-208-02*.md`
  - status and validation notes.

## Acceptance Criteria

1. Pages list state mutations call the shared `toast` API on success and error.
2. Delete toast fires only from the confirmed delete path.
3. Existing inline error and bulk feedback behavior is preserved.
