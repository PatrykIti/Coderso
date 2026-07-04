# TASK-454-03: Autosave Recovery Prompt
# FileName: TASK-454-03-Autosave-Recovery-Prompt.md

**Parent Task:** TASK-454
**Priority:** High
**Category:** Pages / Page Editor / Revisions
**Estimated Effort:** Medium
**Dependencies:** TASK-454-02
**Status:** ✅ Done
**Completed:** 2026-06-17

---

## Overview

Surface recoverable autosave revisions on Page Editor reopen. The editor should
detect a newer autosave revision after the fresh detail baseline is known and
offer a clear restore/discard prompt using the existing revision machinery.

This subtask is Pages-only. Page Templates and Menu Design must not gain fake
autosave semantics.

## Sub-Tasks

- [x] TASK-454-03-L01: Recoverable Autosave Detection
- [x] TASK-454-03-L02: Recovery Prompt Restore And Discard Flow

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/pages/PageEditor.tsx` | Recoverable autosave selector, prompt state, restore/discard actions. |
| `core/admin/services/pagesClient.ts` | No API expansion unless implementation proves it necessary. |
| `tests/vitest/ui/page-editor-v2-flow.test.tsx` | Recovery prompt and restore/discard tests. |
| `tests/integration/routes/pages.test.ts` | Keep existing restore/discard coverage green; update only if route contract changes. |

## Implementation Pseudocode

```tsx
function findRecoverableAutosave(
  revisions: PageEditorRevision[],
  page: PageEditorResourceDetail
) {
  return revisions
    .filter((revision) => revision.kind === "autosave")
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .find((revision) => isNewerPageDetailTimestamp(revision.createdAt, page.updatedAt)) ?? null;
}

useEffect(() => {
  if (!page || editorHost.mode !== "page" || !editorHost.revisions || hasUnsavedChanges) return;
  let cancelled = false;
  void editorHost.revisions.list(page.id).then((items) => {
    if (cancelled) return;
    setRecoverableAutosave(findRecoverableAutosave(items, page));
  });
  return () => {
    cancelled = true;
  };
}, [editorHost, page, hasUnsavedChanges]);
```

Data flow:

- Read current page detail first.
- Read revisions through the existing internal route.
- Client filters latest autosave newer than page `updatedAt`.
- Restore calls existing `restorePageRevision`, which updates `currentData`.
- Discard calls existing autosave revision delete.

Error handling:

- Revision-list failures show bounded copy and do not block manual Save.
- Restore/discard failures keep the prompt visible.
- Same/older/unparsable autosave timestamps are ignored.

Regression-test shape:

- Newer autosave shows recovery prompt.
- Same/older/unparsable autosaves do not prompt.
- Restore replaces editor document and clears dirty state.
- Dismiss leaves revision untouched.
- Discard removes prompt after successful delete.

## Security Contract

- **Endpoint visibility:** no new endpoints; existing internal revisions routes.
- **Auth model:** existing admin session.
- **RBAC:** `content:read` for listing; `content:write` for restore/discard.
- **CSRF expectations:** unchanged for restore/discard writes.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** restored data uses existing write normalizer.
- **Anti-abuse controls:** not applicable.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `set -a && source .env && set +a && bun test tests/unit/pages/pageRevisionAutosave.test.ts tests/unit/pages/revisionService.test.ts tests/integration/routes/pages.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `docs/guide/screens/page-editor-preview-settings-and-history.md` if prompt
  copy or History behavior changes.

## Acceptance Criteria

1. Autosaved work is visible on reopen before the author can accidentally keep
   editing stale `currentData`.
2. Recovery is explicit and non-destructive.
3. Existing revision restore/discard semantics remain authoritative.
