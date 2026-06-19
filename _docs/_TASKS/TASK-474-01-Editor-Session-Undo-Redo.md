# TASK-474-01: Editor Session Undo/Redo
# FileName: TASK-474-01-Editor-Session-Undo-Redo.md

**Parent Task:** TASK-474
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Editing UX
**Estimated Effort:** Medium
**Dependencies:** TASK-454 (dirty/autosave — coordinate)
**Status:** ⏳ To Do

---

## Overview

Add bounded in-session undo/redo to the Page Editor: `Cmd+Z` reverts the last
document mutation, `Cmd+Shift+Z` re-applies it, without fighting autosave or the
dirty-state guard.

---

## Current State (verified)

- Document mutations funnel through `setPageDocument`
  (`core/admin/ui/pages/PageEditor.tsx`, ~line 1016) and the typed mutation
  action groups; no history stack exists.
- Keyboard handling lives in the editor keyboard effect (~line 1723);
  `isEditableShortcutTarget` (~line 455) already guards shortcuts when focus is
  in a text field.
- Autosave + revision history exist (TASK-454) but operate at the persistence
  layer, not as in-session undo.

---

## Sub-Tasks

- [ ] Add a bounded history (document + selection snapshots, cap ~50) captured at
      the single mutation entry point (not scattered `setState`).
- [ ] Wire `Cmd+Z` / `Cmd+Shift+Z` (and palette commands) guarded by
      `isEditableShortcutTarget` so native text undo still works in inputs.
- [ ] Reset/clear history on load, save, and publish; keep dirty-state and
      autosave semantics correct (an undo that returns to the saved state should
      reflect not-dirty).
- [ ] Respect ESLint React-Hooks rules: no sync `setState` in effect bodies; use
      a reducer / event handlers / lazy init for the history store.
- [ ] Add coverage: mutate → undo restores prior doc + selection; redo
      re-applies; cap is enforced; history clears on save.

---

## Implementation Pseudocode

```ts
// useEditorHistory — reducer-backed, bounded
function historyReducer(state, action) {
  switch (action.type) {
    case "commit": return { past: cap([...state.past, action.prev], 50), future: [] };
    case "undo":   return shift(state, "past", "future");
    case "redo":   return shift(state, "future", "past");
    case "reset":  return { past: [], future: [] };
  }
}
// On every document mutation: dispatch({ type:"commit", prev: previousSnapshot }).
// Cmd+Z → restore past.top into setPageDocument(+ selection); Cmd+Shift+Z → redo.
// On save/publish/load → dispatch({ type:"reset" }); recompute dirty vs saved doc.
```

Regression-test shape:
- Delete a block → `Cmd+Z` restores it (and selection); `Cmd+Shift+Z` re-deletes.
- History capped at 50; oldest dropped.
- Save clears history; undo-to-saved-state marks not-dirty.
- Shortcut ignored while typing in a text input (native undo preserved).

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `bun --cwd core lint` / `bun --cwd core lint:types`

## Documentation Updates Required

- Editor docs (undo/redo + dirty semantics).
- `_docs/_TASKS/TASK-474*.md` (status), `_docs/_CHANGELOG/` on task closure.
