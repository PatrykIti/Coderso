# TASK-208-02-02: Posts List Mutation Toasts
# FileName: TASK-208-02-02_Posts_List_Mutation_Toasts.md

**Priority:** High
**Category:** CMS Posts + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-208-02-01
**Status:** To Do

---

## Overview

Add shared top-right toast feedback to Posts list create, publish, unpublish,
delete, and bulk lifecycle mutations.

This leaf mirrors the Pages implementation style while preserving Posts-specific
tag/filter behavior, create preferences, cache refresh handling, and current
inline bulk feedback.

## Sub-Tasks

No child task files.

## Implementation Checklist

- Add `import { toast } from "sonner";` to
  `core/admin/ui/posts/PostsListPage.tsx`.
- In `handleCreate`, call `toast.success` after `createPost` succeeds.
- In `handleCreate` catch, keep `setError(message)` and call
  `toast.error(message)`.
- In `handlePublish`, `handleUnpublish`, and confirmed `runDelete`, toast after
  the real mutation and local state update.
- In `runBulkAction`, call `toast.success` on full success and `toast.error` on
  partial/full failure while preserving `bulkFeedback`.

## Pseudocode

```tsx
const handleCreate = async (payload) => {
  try {
    const post = await createPost(payload);
    upsertPostInState(post);
    toast.success(`Post "${post.title}" created.`);
    if (openAfterCreate) navigate(`/posts/${post.id}`);
  } catch (error) {
    const message = getActionError(error, "Failed to create post.");
    setError(message);
    toast.error(message);
  }
};

const handleUnpublish = async (id: string) => {
  try {
    await unpublishPost(id);
    markPostDraft(id);
    toast.success("Post moved to draft.");
  } catch (error) {
    const message = getActionError(error, "Failed to unpublish post.");
    setError(message);
    toast.error(message);
  }
};
```

Bulk delete confirmation path:

```tsx
if (bulkAction === "delete") {
  setPendingBulkDeleteIds(selectedVisibleIds);
  return;
}

await runBulkAction(bulkAction, selectedVisibleIds);
```

Inside confirmed delete execution:

```tsx
await runBulkAction("delete", pendingBulkDeleteIds);
toast.success("Posts deleted.");
```

## Testing Requirements

- `tests/vitest/ui/page-post-list-wave.test.tsx`
  - assert Posts create success/failure toasts,
  - assert Posts publish/unpublish/delete success/failure toasts,
  - assert Posts bulk publish/unpublish/delete success toasts,
  - assert partial failures call `toast.error` and keep inline feedback,
  - assert delete toast waits for confirmation.

## Documentation Updates Required in This Round

- `_docs/CONTENT_LIST_UX.md`
  - Posts list section: create/publish/unpublish/delete now emits shared
    top-right Admin UI toasts after mutation completion.
- `_docs/_TASKS/TASK-208-02*.md`
  - status and validation notes.

## Acceptance Criteria

1. Posts list state mutations call shared `toast` on success and error.
2. Bulk feedback remains visible and truthful.
3. Delete toasts are never emitted before confirmation.
