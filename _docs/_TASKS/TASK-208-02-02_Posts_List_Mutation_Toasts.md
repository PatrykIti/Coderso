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
  the real mutation and the existing refresh path.
- Preserve the existing editor navigation route. `PostsListPage` currently
  opens created/edited posts at `/coderso/posts/:id`; do not rewrite this to a
  new `/posts/:id` route while adding toast feedback.
- In `runBulkAction`, call the shared success helper on full success and the
  shared error helper on partial/full failure while preserving `bulkFeedback`.
  The message, count calculation, pluralization, and partial-failure summary must
  come from the shared helper result, not from local Posts string construction.
- Do not copy the Pages implementation as a local formatter. Posts should use
  the same generic helper API with a Posts adapter and keep the current
  `refresh`, `bulkFeedback`, selection cleanup, and navigation behavior.

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
    if (payload.openAfterCreate) {
      navigate(`/coderso/posts/${encodeURIComponent(post.id)}`);
    } else {
      await refresh({ force: true, background: true });
      setCreateOpen(false);
    }
    postsToast.success("create", { label: post.title });
  } catch (error) {
    const message = postsToast.errorMessage(error, "create");
    setError(message);
    postsToast.error(message);
  }
};

const handleUnpublish = async (id: string) => {
  try {
    await unpublishPost(id);
    await refresh({ force: true, background: true });
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
// runBulkAction owns the final shared bulk toast after mutations settle.
```

Bulk result handling inside `runBulkAction` should follow the same shape as
Pages:

```tsx
const results = await Promise.allSettled(ids.map((id) => runPostMutation(action, id)));
const feedback = postsToast.bulkResult({ action, targets: ids, results });

await refresh({ force: true, background: true });

if (!feedback.ok) {
  setBulkFeedback(null);
  setError(feedback.message);
  postsToast.emitBulkResult(feedback);
  return;
}

clearSelection();
setBulkFeedback({
  title: "Bulk action completed",
  message: feedback.inlineMessage,
});
postsToast.emitBulkResult(feedback);
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
