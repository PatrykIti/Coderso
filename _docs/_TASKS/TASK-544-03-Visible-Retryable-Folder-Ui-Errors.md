# TASK-544-03: Visible Retryable Folder UI Errors

# FileName: TASK-544-03-Visible-Retryable-Folder-Ui-Errors.md

**Parent Task:** TASK-544
**Priority:** Medium
**Category:** Media Admin UI / Error Recovery / Accessibility
**Estimated Effort:** Medium
**Dependencies:** TASK-544-02
**Status:** ⏳ To Do
**Changelog:** 1256 (pinned; create only at implementation closure)

---

## Scope

Replace swallowed folder load/create/rename/reorder/delete failures with an accessible,
retryable operation model. Await create/rename before closing their forms and preserve
draft, selection, expansion, and order state across failure.

## Grounded anchors

- core/admin/ui/media/MediaLibraryPage.tsx:203-227 swallows folder load errors.
- MediaLibraryPage.tsx:434-458 swallows every folder mutation error.
- core/admin/ui/media/MediaFolderRail.tsx:92-112 clears create/rename drafts before the
  async result is known.

## Leaf

TASK-544-03-L01 is the sole writer of MediaLibraryPage.tsx, MediaFolderRail.tsx, and the
three directly affected UI suites. Those changed-behavior tests pass with the source.
TASK-544-04-L01 reruns them read-only and owns additive route registration, docs, smoke,
and closure.

## UI invariants

- Load failure keeps the rail usable with known state and offers Retry.
- Create/rename forms close and clear only after success.
- Reorder/delete failure retains or deterministically restores order and active selection.
- Error text is bounded, role=alert/live, operation-specific, and retryable.
- Pending state prevents duplicate mutation without erasing editable drafts.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/ui/media-folder-rail.test.tsx \
  tests/vitest/ui/media-library.test.tsx \
  tests/vitest/mediaUi/mediaLibrary.test.tsx
~~~
