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
inline bulk feedback. It should reuse the same generic list-action toast helper
with a Posts adapter/config instead of copying Pages message logic.

## Sub-Tasks

No child task files.

## Implementation Checklist

- Import the shared list-action toast helper from
  `core/admin/ui/shared/listActionToasts.ts` in
  `core/admin/ui/posts/PostsListPage.tsx`.
- Define a Posts adapter/config for post singular/plural labels, action copy,
  and fallback errors.
- In `handleCreate`, call the shared success helper after `createPost`
  succeeds.
- In `handleCreate` catch, keep `setError(message)` and call
  the shared error-toast helper.
- In `handlePublish`, `handleUnpublish`, and confirmed `runDelete`, toast after
  the real mutation and local state update.
- In `runBulkAction`, call the shared success helper on full success and the
  shared error helper on partial/full failure while preserving `bulkFeedback`.
  The message and count calculation must come from the shared helper.

## Pseudocode

```tsx
const postsToast = createListActionToastAdapter({
  resourceSingular: "post",
  resourcePlural: "posts",
  actions: {
    create: { success: ({ label }) => `Post "${label}" created.`, fallbackError: "Failed to create post." },
    publish: { success: "Post published.", fallbackError: "Failed to publish post." },
    unpublish: { success: "Post moved to draft.", fallbackError: "Failed to unpublish post." },
    delete: { success: "Post deleted.", fallbackError: "Failed to delete post." },
  },
});

const handleCreate = async (payload) => {
  try {
    const post = await createPost(payload);
    upsertPostInState(post);
    postsToast.success("create", { label: post.title });
    if (openAfterCreate) navigate(`/posts/${post.id}`);
  } catch (error) {
    const message = postsToast.errorMessage(error, "create");
    setError(message);
    postsToast.error(message);
  }
};

const handleUnpublish = async (id: string) => {
  try {
    await unpublishPost(id);
    markPostDraft(id);
    postsToast.success("unpublish");
  } catch (error) {
    const message = postsToast.errorMessage(error, "unpublish");
    setError(message);
    postsToast.error(message);
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
postsToast.bulkSuccess("delete", pendingBulkDeleteIds.length);
```

## Testing Requirements

- `tests/vitest/ui/page-post-list-wave.test.tsx`
  - assert Posts create success/failure toasts,
  - assert Posts publish/unpublish/delete success/failure toasts,
  - assert Posts bulk publish/unpublish/delete success toasts,
  - assert partial failures emit the expected error toast and keep inline
    feedback,
  - assert delete toast waits for confirmation.
- `tests/vitest/ui/list-action-toasts.test.ts`
  - cover the shared helper behavior used by the Posts adapter.

## Documentation Updates Required in This Round

- `_docs/CONTENT_LIST_UX.md`
  - Posts list section: create/publish/unpublish/delete now emits shared
    top-right Admin UI toasts after mutation completion.
- `_docs/_TASKS/TASK-208-02*.md`
  - status and validation notes.

## Acceptance Criteria

1. Posts list state mutations call the shared list-action toast helper on
   success and error.
2. Bulk feedback remains visible and truthful.
3. Delete toasts are never emitted before confirmation.
4. Generic error normalization, bulk counts, and pluralization are not
   duplicated inside `PostsListPage`.
