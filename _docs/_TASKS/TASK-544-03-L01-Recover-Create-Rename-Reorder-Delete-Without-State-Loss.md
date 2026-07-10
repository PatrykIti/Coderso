# TASK-544-03-L01: Recover Create, Rename, Reorder, Delete Without State Loss

# FileName: TASK-544-03-L01-Recover-Create-Rename-Reorder-Delete-Without-State-Loss.md

**Parent Task:** TASK-544
**Parent Subtask:** TASK-544-03
**Priority:** Medium
**Category:** Media Admin UI / Reliability / Accessibility
**Estimated Effort:** Medium
**Dependencies:** TASK-544-03
**Status:** ⏳ To Do
**Changelog:** 1256 (pinned; create only at implementation closure)

---

## Scope

Introduce a typed pending/error/retry model in MediaLibraryPage and promise-returning
folder callbacks in MediaFolderRail. Each editing form awaits success before dismissing.

## Source and direct-test ownership

This leaf is the sole TASK-544 writer of:

- core/admin/ui/media/MediaLibraryPage.tsx;
- core/admin/ui/media/MediaFolderRail.tsx;
- tests/vitest/ui/media-folder-rail.test.tsx;
- tests/vitest/ui/media-library.test.tsx;
- tests/vitest/mediaUi/mediaLibrary.test.tsx.

It must not edit clients/services/routes, shared UI components, other tests, docs, task
indexes, or changelog files. Stage the five operation failure/retry compatibility cases
in these suites before the source gate; closure reruns them read-only and cannot
rebaseline their state-retention assertions.

## Implementation Pseudocode

~~~ts
type FolderOperation =
  | { kind: "load" }
  | { kind: "create"; name; parentId }
  | { kind: "rename"; id; name }
  | { kind: "reorder"; orders }
  | { kind: "delete"; id };

type FolderOperationState = {
  pending: FolderOperation["kind"] | null;
  error: { message: string; retry: FolderOperation } | null;
};

async function runFolderOperation(operation): Promise<boolean> {
  set pending and clear prior folder error;
  try:
    switch operation.kind:
      load -> await listMediaFoldersCached({force:true}); set folders;
      create -> await createMediaFolder(payload);
      rename -> await updateMediaFolder(payload);
      reorder -> await reorderMediaFolders(payload);
      delete -> await deleteMediaFolder(id); only now clear active selection if deleted;
    return true;
  catch error:
    map API error to bounded operation-specific message;
    store exact normalized retry operation;
    return false;
  finally:
    clear pending with mounted/operation identity guard;
}

rail props:
  onCreateFolder(...): Promise<boolean>;
  onRenameFolder(...): Promise<boolean>;
  onDeleteFolder(...): Promise<boolean>;
  onReorder(...): Promise<boolean>;
  folderError, pendingKind, onRetry;

async submitCreate(event):
  prevent default; validate trimmed draft;
  if await onCreateFolder(...):
    clear newName and close form;
  else:
    retain draft/form/focus target;

async submitRename(...):
  if await onRenameFolder(...):
    clear draft and close;
  else retain both;

async move/delete:
  await callback;
  on failure preserve expansion/selection and current derived order;
  if an optimistic local order was applied, restore captured order deterministically.

render error:
  role="alert", bounded text, Retry button invoking stored operation;
  do not replace the folder tree or steal focus unexpectedly.
~~~

Use operation identity/mounted guards for async completion. Avoid synchronous setState
effects; state changes belong to events and async result boundaries. Retry reuses the
normalized payload, not mutable input state that may have changed.

## Error and compatibility contract

No raw server/DB message or HTML is rendered. Existing cacheBus refresh remains the
authoritative successful reconciliation. Failed mutations do not clear cache or selection.
The current callback contract changes only inside these two co-owned UI files; external
client service signatures remain.

## Direct regression-test shape

This leaf owns the test edits. For load/create/rename/reorder/delete, defer and reject the
promise, assert visible error/pending state and retained exact draft/selection/order,
then retry and resolve. Assert duplicate activation blocked, unrelated later error not
cleared by stale completion, cache event success reconciliation, keyboard focus, and
accessible alert/retry labels.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/ui/media-folder-rail.test.tsx \
  tests/vitest/ui/media-library.test.tsx \
  tests/vitest/mediaUi/mediaLibrary.test.tsx
~~~

Re-run a named file alone before declaring a failure.

## Acceptance criteria

- No folder promise rejection is swallowed.
- Create/rename drafts close only on success.
- Every operation has a visible retry path and preserves user state on failure.
