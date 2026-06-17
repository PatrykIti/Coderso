# TASK-454-03-L02: Recovery Prompt Restore And Discard Flow
# FileName: TASK-454-03-L02-Recovery-Prompt-Restore-And-Discard-Flow.md

**Parent Subtask:** TASK-454-03
**Priority:** High
**Category:** Pages / Page Editor / UX
**Estimated Effort:** Medium
**Dependencies:** TASK-454-03-L01
**Status:** ⏳ To Do

---

## Overview

Expose the recoverable autosave state to authors with an immediate prompt near
the existing editor alerts. Restore and discard must use existing revision
actions; dismissing the prompt must leave the autosave revision untouched.

## Sub-Tasks

- [ ] Add inline recovery banner/dialog with user-facing "draft version" copy.
- [ ] Restore calls existing `revisions.restore`.
- [ ] Discard calls existing `revisions.discard`.
- [ ] Dismiss hides the prompt for the current session only.
- [ ] Decide whether to keep the local `HistorySheet`; do not wire the dead
      `PageRevisionDrawer` unless it replaces the local history surface.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/pages/PageEditor.tsx` | Recovery prompt UI and actions. |
| `tests/vitest/ui/page-editor-v2-flow.test.tsx` | Restore/discard/dismiss coverage. |
| `docs/guide/screens/page-editor-preview-settings-and-history.md` | User-facing recovery description if wording changes. |

## Implementation Pseudocode

```tsx
const restoreRecoverableAutosave = async () => {
  if (!page || !recoverableAutosave || !revisionsHost) return;
  setRestoringRevisionId(recoverableAutosave.id);
  try {
    const result = await revisionsHost.restore(page.id, recoverableAutosave.id);
    hydrateFromDetail(result.page);
    setRecoverableAutosave(null);
    setHasUnsavedChanges(false);
  } catch (error) {
    setRecoveryActionError(resolveInlineError(error, "Failed to restore draft version."));
  } finally {
    setRestoringRevisionId(null);
  }
};

const discardRecoverableAutosave = async () => {
  if (!page || !recoverableAutosave || !revisionsHost) return;
  setDiscardingRevisionId(recoverableAutosave.id);
  try {
    await revisionsHost.discard(page.id, recoverableAutosave.id);
    setRecoverableAutosave(null);
  } catch (error) {
    setRecoveryActionError(resolveInlineError(error, "Failed to discard draft version."));
  } finally {
    setDiscardingRevisionId(null);
  }
};
```

Data flow:

- Detection state feeds prompt.
- Restore result reuses the same hydrate helper as mount/cache refresh.
- Dismiss updates only local prompt state.

Error handling:

- Prompt remains visible after restore/discard failure.
- Restore cannot run while local unsaved changes exist unless the user confirms
  replacement through the same prompt.
- Successful restore clears local dirty state.

Regression-test shape:

- Click Restore -> `restorePageRevision(pageId, revisionId)` called -> restored
  canvas visible.
- Click Discard -> `discardPageRevision(pageId, revisionId)` called -> prompt
  gone.
- Click dismiss/Keep current -> no client call -> prompt gone for session.
- Restore failure shows bounded error and keeps prompt.

## Security Contract

- **Endpoint visibility:** no new endpoints; existing internal restore/discard.
- **Auth model:** existing admin session.
- **RBAC:** `content:write`.
- **CSRF expectations:** unchanged for restore/discard writes.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** restored document uses existing write path.
- **Anti-abuse controls:** not applicable.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `set -a && source .env && set +a && bun test tests/unit/pages/pageRevisionAutosave.test.ts tests/unit/pages/revisionService.test.ts tests/integration/routes/pages.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `docs/guide/screens/page-editor-preview-settings-and-history.md` if prompt UX
  changes user-facing behavior.

## Acceptance Criteria

1. Authors see recoverable autosaved work on reopen.
2. Restore/discard are explicit and auditable through existing routes.
3. Dismiss is non-destructive.
