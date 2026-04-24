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

- Import the shared list-action toast helper from
  `core/admin/ui/shared/listActionToasts.ts` in
  `core/admin/ui/pages/PageListPage.tsx`.
- Define a Pages adapter/config for the helper with page singular/plural labels,
  create/publish/draft/delete action copy, and fallback error messages.
- In `handleCreate`, toast after `createPage` succeeds and after local list
  state or navigation preference is applied.
- In `handleCreate` catch, keep `setError(message)` and also call
  the shared error-toast helper.
- In `handlePublish` and `handleUnpublish`, toast after the client mutation and
  existing `refresh({ force: true, background: true })` call succeeds.
- In `runDelete`, toast only after `deletePage(id)` succeeds from the
  confirmation dialog path and the existing refresh path completes.
- In `runBulkAction`, toast after all selected mutations settle:
  - full success: call the shared bulk success helper,
  - partial/full failure: preserve inline feedback and call the shared error
    helper.
  Use the shared helper for both the final message and plural/count handling.
- Do not introduce local page upsert/status/remove helpers only for toast
  delivery. Pages currently refresh after mutations; keep that orchestration and
  add the shared toast at the end of the same success/error branch.

## Pseudocode

```tsx
const pagesToast = createListActionToastAdapter({
  resourceSingular: "page",
  resourcePlural: "pages",
  actions: {
    create: { success: ({ label }) => `Page "${label}" created.`, fallbackError: "Failed to create page." },
    publish: { success: "Page published.", fallbackError: "Failed to publish page." },
    unpublish: { success: "Page moved to draft.", fallbackError: "Failed to unpublish page." },
    delete: { success: "Page deleted.", fallbackError: "Failed to delete page." },
  },
});

const handleCreate = async (payload) => {
  try {
    const page = await createPage(payload);
    if (openAfterCreate) navigate(`/pages/${page.id}`);
    else {
      await refresh({ force: true, background: true });
      setCreateOpen(false);
    }
    pagesToast.success("create", { label: page.title });
  } catch (error) {
    const message = pagesToast.errorMessage(error, "create");
    setError(message);
    pagesToast.error(message);
  }
};

const handlePublish = async (id: string) => {
  try {
    await publishPage(id);
    await refresh({ force: true, background: true });
    pagesToast.success("publish");
  } catch (error) {
    const message = pagesToast.errorMessage(error, "publish");
    setError(message);
    pagesToast.error(message);
  }
};

const runDelete = async (id: string) => {
  try {
    await deletePage(id);
    await refresh({ force: true, background: true });
    setPendingDeleteId(null);
    pagesToast.success("delete");
  } catch (error) {
    const message = pagesToast.errorMessage(error, "delete");
    setError(message);
    pagesToast.error(message);
  }
};
```

Bulk flow:

```tsx
const results = await Promise.allSettled(ids.map((id) => runPageMutation(action, id)));
const failed = results.filter((result) => result.status === "rejected").length;

if (failed > 0) {
  const message = pagesToast.bulkErrorMessage({ action, failed, total: ids.length });
  setError(message);
  pagesToast.error(message);
  return;
}

await refresh({ force: true, background: true });
handleClearSelection();
pagesToast.bulkSuccess(action, ids.length);
```

## Testing Requirements

- `tests/vitest/ui/page-post-list-wave.test.tsx`
  - add or reuse a hoisted `sonner` mock,
  - assert Pages calls route through the shared list-action toast helper
    behavior by verifying final emitted success/error messages,
  - in the existing create/navigation test, assert the final success toast after
    create,
  - in the existing failure test, assert the final error toast,
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

1. Pages list state mutations call the shared list-action toast helper on
   success and error.
2. Delete toast fires only from the confirmed delete path.
3. Existing inline error and bulk feedback behavior is preserved.
4. Generic error normalization, bulk counts, and pluralization are not
   duplicated inside `PageListPage`.
