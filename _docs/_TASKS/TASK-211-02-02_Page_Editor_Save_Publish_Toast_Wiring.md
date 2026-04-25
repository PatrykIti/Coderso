# TASK-211-02-02: Page Editor Save Publish Toast Wiring
# FileName: TASK-211-02-02_Page_Editor_Save_Publish_Toast_Wiring.md

**Priority:** High
**Category:** CMS/Pages + Admin/UI + Notifications
**Estimated Effort:** Medium
**Dependencies:** TASK-211-02-01
**Status:** To Do

---

## Overview

Wire `PageEditor` save draft and publish outcomes through the shared admin
action toast adapter.

This leaf closes the gap where `PageEditor` shows `Draft saved.` /
`Page published.` through a local inline alert but does not emit a central
Sonner toast. It should preserve existing dirty-state behavior, cache refresh
semantics, and inline error visibility.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/pages/PageEditor.tsx`
- `tests/vitest/ui/page-editor-shell-wave.test.tsx`
- `tests/vitest/ui/page-editor-insert-scroll.test.tsx` only if shared mocks need
  adjustment.

## Implementation Direction

- Create a Page editor toast adapter near the module boundary, not inside each
  handler branch.
- In `handleSaveDraft`:
  - clear previous transient state;
  - await `updatePage`;
  - update editor state as today;
  - emit `saveDraft` success toast after the mutation resolves.
- In `handlePublish`:
  - await `publishPage`;
  - refresh detail as today;
  - emit `publish` success toast after publish/refresh state resolves.
- In catch branches:
  - normalize error through the adapter;
  - keep `setError(message)` for persistent inline context;
  - emit error toast with the same bounded message.
- Decide whether to remove the success `statusNotice` alert or keep it as
  secondary inline state. If kept, tests must prove the Sonner toast is also
  emitted.

## Pseudocode

```ts
try {
  const updated = await updatePage(pageId, { data: pageData });
  setPage(updated);
  setUnsavedChanges(false);
  setRemoteUpdatePending(false);
  pageEditorToasts.success("saveDraft");
} catch (error) {
  const message = pageEditorToasts.error("saveDraft", error);
  setError(message);
}
```

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC/CSRF/rate-limit: unchanged; save/publish clients keep existing
  admin write permissions and CSRF behavior.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - no success toast before the awaited mutation resolves;
  - error copy does not expose preview tokens, CSRF tokens, headers, cookies, or
    privileged settings.

## Testing Requirements

- `tests/vitest/ui/page-editor-shell-wave.test.tsx`
  - mock Sonner and assert `toast.success("Draft saved.")` after Save draft;
  - assert `toast.success("Page published.")` after Publish;
  - rejected save emits `toast.error` and visible inline error;
  - rejected publish emits `toast.error` and visible inline error;
  - success toast does not fire before the promise resolves.
- Keep existing assertions for:
  - unsaved state clearing;
  - published badge update;
  - preview dialog wiring.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-PAGES.md` on closure.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Save draft emits central success toast.
2. Publish emits central success toast.
3. Save/publish failures emit central error toast and visible inline context.
4. Existing editor state semantics are unchanged.
