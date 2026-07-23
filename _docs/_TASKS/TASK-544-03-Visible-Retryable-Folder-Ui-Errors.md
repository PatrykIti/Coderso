# TASK-544-03: Visible Retryable Folder UI Errors

# FileName: TASK-544-03-Visible-Retryable-Folder-Ui-Errors.md

**Parent Task:** TASK-544
**Priority:** Medium
**Category:** Media Admin UI / Error Recovery / Accessibility
**Estimated Effort:** Medium
**Dependencies:** TASK-544-02
**Status:** ✅ Done
**Started:** 2026-07-12
**Completed:** 2026-07-12
**Changelog:** 1256

---

## Scope

Replace swallowed folder load/create/rename/reorder/delete failures with an accessible,
retryable operation model. Await create/rename before closing their forms and preserve
draft, selection, and order state across failure. Preserve the existing always-expanded
nested tree; no collapse/expansion feature is added.

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

| Leaf | Scope | Source ownership | Status |
|---|---|---|---|
| TASK-544-03-L01 | Recover load/create/rename/reorder/delete with exact retry identity | MediaLibraryPage, MediaFolderRail + direct Vitest suites | ✅ Done |

## UI invariants

- Load failure keeps the rail usable with known state and offers Retry.
- Create/rename forms close and clear only after success.
- Reorder/delete failure retains or deterministically restores order and active selection.
- Error text comes only from a fixed operation/code allowlist, is bounded,
  `role=alert`/live, operation-specific, and retryable; raw server/DB/error text is never
  rendered.
- Pending `{attempt,kind}` plus synchronous refs serialize user operations; error/retry
  `{token,kind,target,formGeneration}` identity is separate. Create/rename dismissal
  requires all four retry-result fields plus the current form/draft to match, so a stale
  success cannot close a changed or reopened form.
- Mount, cache-bus, and Retry loads use one monotonic loader plus a separate
  generation-scoped load-pending identity. A stale generation cannot clear a newer visible
  busy state, and cache revalidation never takes or replaces mutation pending. A failed load
  Retry publishes a new fixed load-error token instead of disappearing. The synchronous cache event emitted
  by a successful client mutation is associated with that pending attempt: a failed forced
  GET is deferred until the guarded local success update, then becomes a distinct load Retry
  and never replays or relabels the already-durable mutation.
- Successful delete updates both `activeFolderId` and `mediaFilterState.folderId` only when
  each still targets the deleted folder. Failed/stale delete attempts update neither.
- Row actions are keyboard/touch reachable through `focus-within`, narrow visibility, and
  explicit `(hover: none)`/`(pointer: coarse)` visibility even at a wide viewport. Pending
  controls expose disabled/`aria-busy` state during both user operations and background
  folder revalidation, and failed inputs retain focus.
- The initial delete keeps the existing confirmation. A later explicitly labelled
  `Retry deleting <bounded-folder-label>` button is the user's confirmation for the exact
  immutable full retry payload; the display label is normalized/capped separately and
  cannot overflow the rail. Cancel still performs no request.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/ui/media-folder-rail.test.tsx \
  tests/vitest/ui/media-library.test.tsx \
  tests/vitest/mediaUi/mediaLibrary.test.tsx
~~~

## Completion evidence

Load/create/rename/reorder/delete now retain visible state and expose immutable,
operation-specific Retry behavior until success. A live-smoke discovery that background
load revalidation did not expose busy state was fixed with a generation guard and covered
by old-first/newer-generation regressions. UI/client coverage passed within the final
78/78 targeted Vitest tests; fresh audits reported zero High/Medium/Low findings.
