# TASK-472-03-L01: Editor Session Undo/Redo
# FileName: TASK-472-03-L01-Editor-Session-Undo-Redo.md

**Parent Subtask:** TASK-472-03
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Editing UX
**Estimated Effort:** Medium
**Dependencies:** TASK-454 (dirty/autosave — coordinate)
**Status:** ✅ Done
**Started:** 2026-06-23
**Completed:** 2026-06-23

---

## Overview

Add bounded in-session undo/redo: `Cmd+Z` reverts the last document mutation,
`Cmd+Shift+Z` re-applies it, without fighting autosave or the dirty-state guard.

## Current State (verified)

- Mutations funnel through the `setDocumentDraft` wrapper
  (`core/admin/ui/pages/PageEditor.tsx` ~line 1015, which calls `setPageDocument`
  defined ~line 648) + typed mutation action groups; no history stack.
- Keyboard effect ~line 1723; `isEditableShortcutTarget` (~line 455) guards
  shortcuts in text fields.
- Autosave + revision history (TASK-454) operate at persistence, not in-session.

## Sub-Tasks

- [x] Bounded history (document + selection snapshots, cap ~50) captured at the
      single mutation entry point.
- [x] Wire `Cmd+Z` / `Cmd+Shift+Z` (+ palette) guarded by
      `isEditableShortcutTarget`.
- [x] Reset on load/save/publish; keep dirty/autosave correct (undo-to-saved ⇒
      not dirty).
- [x] Respect React-Hooks rules (no sync `setState` in effects; reducer/event
      handlers/lazy init).
- [x] Coverage: mutate→undo restores doc+selection; redo re-applies; cap
      enforced; history clears on save; ignored while typing.

## Implementation Pseudocode

```ts
function historyReducer(state, action) {
  switch (action.type) {
    case "commit": return { past: cap([...state.past, action.prev], 50), future: [] };
    case "undo":   return shift(state, "past", "future");
    case "redo":   return shift(state, "future", "past");
    case "reset":  return { past: [], future: [] };
  }
}
// On every mutation: dispatch({ type:"commit", prev: previousSnapshot }).
// Cmd+Z → restore past.top into setPageDocument(+selection); Cmd+Shift+Z → redo.
// On save/publish/load → dispatch({ type:"reset" }); recompute dirty vs saved doc.
```

Regression-test shape:
- Delete a block → `Cmd+Z` restores it (+ selection); `Cmd+Shift+Z` re-deletes.
- History capped at 50; oldest dropped.
- Save clears history; undo-to-saved marks not-dirty.
- Shortcut ignored while typing (native undo preserved).

## Security Contract

- No new endpoints. History is in-memory only (no secrets persisted to storage);
  no new input surface. Admin session + existing perms/CSRF.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `bun --cwd core lint` / `bun --cwd core lint:types`

## Documentation Updates Required

- Editor docs (undo/redo + dirty semantics).
- `_docs/_TASKS/TASK-472-03*.md` status; changelog rolled up by TASK-472-06.
