# TASK-454-03-L01: Recoverable Autosave Detection
# FileName: TASK-454-03-L01-Recoverable-Autosave-Detection.md

**Parent Subtask:** TASK-454-03
**Priority:** High
**Category:** Pages / Page Editor / Revisions
**Estimated Effort:** Medium
**Dependencies:** TASK-454-02-L02
**Status:** ⏳ To Do

---

## Overview

Add a pure selector and Page Editor effect that detects the latest recoverable
autosave revision after a fresh page detail has loaded. Detection is pages-only
and uses the existing revision list response.

## Sub-Tasks

- [ ] Add `findRecoverableAutosaveRevision(revisions, page)` near Page Editor
      helpers or in a Bun-free helper module.
- [ ] Load revisions after mount revalidation for Pages host only.
- [ ] Ignore same/older/unparsable autosave timestamps.
- [ ] Keep listing failure bounded and non-blocking.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/pages/PageEditor.tsx` | Selector/effect/state for recoverable autosave. |
| `tests/vitest/ui/page-editor-v2-flow.test.tsx` | Detection tests. |

## Implementation Pseudocode

```ts
export function findRecoverableAutosaveRevision(
  revisions: PageRevision[],
  page: Pick<PageDetail, "updatedAt">
): PageRevision | null {
  const candidates = revisions
    .filter((revision) => revision.kind === "autosave")
    .filter((revision) => isNewerPageDetailTimestamp(revision.createdAt, page.updatedAt))
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  return candidates[0] ?? null;
}

useEffect(() => {
  if (!page || editorHost.mode !== "page" || !editorHost.revisions) return;
  if (hasUnsavedChanges) return;
  let cancelled = false;
  setRecoveryCheckError(null);
  void editorHost.revisions.list(page.id)
    .then((items) => {
      if (!cancelled) setRecoverableAutosave(findRecoverableAutosaveRevision(items, page));
    })
    .catch((error) => {
      if (!cancelled) setRecoveryCheckError(resolveInlineError(error, "Could not check for draft recovery."));
    });
  return () => {
    cancelled = true;
  };
}, [editorHost, page?.id, page?.updatedAt, hasUnsavedChanges]);
```

Data flow: page detail `updatedAt` is the baseline; autosave `createdAt` is the
candidate timestamp.

Error handling: revision-list failure shows a warning but does not change the
document or block Save.

Regression-test shape:

```ts
test("newer autosave revision becomes recoverable", async () => {
  pageEditorState.currentPage = createPage({ updatedAt: "2026-03-08T09:00:00Z" });
  pageEditorState.revisions = [autosaveRevision({ createdAt: "2026-03-08T09:05:00Z" })];
  const view = mount(<PageEditor pageId="page-1" />);
  await flush();
  expect(view.container.textContent).toContain("Recover draft version");
});
```

## Security Contract

- **Endpoint visibility:** no new endpoints; existing internal revisions list.
- **Auth model:** existing admin session.
- **RBAC:** `content:read`.
- **CSRF expectations:** not applicable to list reads.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** unchanged.
- **Anti-abuse controls:** not applicable.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- None until prompt UX lands.

## Acceptance Criteria

1. Newer autosave revisions are detected deterministically.
2. Older/same/unparsable autosaves do not prompt.
3. Page Template/Menu hosts do not call revisions.
