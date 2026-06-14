# TASK-417-05-L01: Editor State Reducer And Canvas Selection
# FileName: TASK-417-05-L01-Editor-State-Reducer-And-Canvas-Selection.md

**Parent Subtask:** TASK-417-05
**Priority:** High
**Category:** Admin UI / Pages
**Estimated Effort:** Large
**Dependencies:** TASK-417-02-L02, TASK-417-03-L01
**Status:** ✅ Done

---

## Overview

Replace PageEditor widget `blocks` state with a v2 reducer that owns sections,
atomic blocks, selected section/block, dirty-state, remote update protection,
and canvas device context.

---

## Security Contract

- **Endpoint visibility:** existing internal Pages admin client calls.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages route permissions.
- **CSRF:** existing admin client write behavior.
- **Rate-limit bucket:** existing admin bucket.
- **Validation:** UI state normalizes through Pages v2 helpers before save,
  preview, publish, restore, or autosave.
- **Anti-abuse controls:** browser state must not store secrets or provider
  payloads; no public write endpoint is introduced.

---

## Sub-Tasks

- [x] Introduce `PageEditorV2State` and reducer actions.
- [x] Load/normalize `currentData` as v2.
- [x] Implement canvas section/block selection, move, duplicate, delete, and
  insert operations.
- [x] Preserve cache hydration and remote-update dirty-state behavior.

---

## Implementation Pseudocode

```ts
type PageEditorV2Action =
  | { type: "load"; document: PageDocumentV2 }
  | { type: "select"; target: PageSelection | null }
  | { type: "insertSection"; index: number; sectionType: PageSectionKind }
  | { type: "insertBlock"; sectionId: string; index: number; blockType: PageBlockType }
  | { type: "patchSelected"; patch: PageEditorPatch; breakpoint: PageBreakpoint };

function pageEditorV2Reducer(state: PageEditorV2State, action: PageEditorV2Action) {
  const next = applyPageEditorAction(state.document, action);
  return { ...state, document: next, dirty: true };
}
```

Expected data flow:

- `PageEditor` loads cached detail, normalizes v2 data, initializes reducer.
- UI actions mutate only reducer state.
- Save/preview/publish serialize reducer `document`.

Error handling:

- Invalid stored data shows a Pages error or resets legacy to empty v2.
- Remote refresh does not overwrite dirty local state.
- Selection clears when selected section/block is deleted.

Regression-test shape:

- Vitest reducer tests cover all operations and responsive write context.
- UI tests cover load, select, delete, duplicate, insert, dirty-state, and
  remote update warning.

---

## Testing Requirements

- Targeted Vitest reducer/admin UI tests.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md` if behavior
  diverges.
