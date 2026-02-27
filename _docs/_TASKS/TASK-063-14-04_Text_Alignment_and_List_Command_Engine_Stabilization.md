# TASK-063-14-04: Text Alignment and List Command Engine Stabilization
# FileName: TASK-063-14-04_Text_Alignment_and_List_Command_Engine_Stabilization.md

**Priority:** High  
**Category:** Admin/UI + Editor Core  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-14-02, TASK-063-14-03  
**Status:** To Do

---

## Overview
Naprawic komendy alignment (`left/center/right`) i domknac semantyke list command w kontekscie dedykowanego `list` bloku.

---

## Scope
1. Wprowadzic dzialajace alignment commands na aktualnym bloku i multiline selection.
2. Dookreslic, kiedy toolbar list command jest dostepny i co robi.
3. Zapewnic brak konfliktu miedzy toolbar list a dedykowanym `list` block.

---

## Detailed File-Level Plan
1. `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx`
   - alignment command powinien aktualizowac `data-align` na wszystkich wybranych block nodes.
   - list command: toggle `ul/ol` albo konwersja selected lines.
2. `core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx`
   - pokazywac list controls tylko w profilach, gdzie dozwolone.
3. `core/services/posts/editor/postRichTextSerializer.ts`
   - potwierdzic stabilne utrzymanie `data-align` i list markup po serializacji.

---

## Pseudocode
```ts
function applyAlign(alignment: "left" | "center" | "right", selection: SelectionCtx) {
  const blocks = getSelectedBlockNodes(selection);
  for (const block of blocks) {
    block.setAttribute("data-align", alignment);
  }
}
```

---

## Acceptance Criteria
1. `Align left/center/right` dziala i jest widoczne po zapisie.
2. `Bullet`/`Ordered` nie sa martwymi przyciskami.
3. Zachowanie list command jest spisane i spojne z dedykowanym `list` block.

---

## Testing Requirements
- Unit (new):
  - `tests/unit/posts/post-richtext-serializer.test.ts`
    - preserve `data-align` and list wrappers.
- Integration (new):
  - `tests/integration/ui/post-editor-richtext-commands.test.tsx`
    - alignment across single + multiline selection.
    - bullet/ordered list command behavior.

---

## Documentation Updates Required
- `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md` (alignment/list decisions)
