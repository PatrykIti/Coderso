# TASK-063-13-03: List Block Multiline Editing and State Model
# FileName: TASK-063-13-03_List_Block_Multiline_Editing_and_State_Model.md

**Priority:** High  
**Category:** Admin/UI + State Management  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-13-02  
**Status:** Done (2026-02-27)

---

## Overview
Naprawic UX listy tak, aby faktycznie wspierala wieloliniowa edycje (w tym przejscia `Enter`), bez kasowania roboczych pustych linii podczas pisania.

---

## Scope
1. Dodac draft model dla textarea listy (edytowalny string).
2. Commit do `string[]` wykonywac na `blur` (oraz opcjonalnie explicit action).
3. Zachowac kompatybilnosc danych runtime (`content: string[]`).
4. Utrzymac `ordered/compact` attrs z Block inspector.

---

## Detailed File-Level Plan
1. `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
   - wydzielic `ListBlockEditor` z lokalnym draft state.
   - onFocus: inicjalizacja draft z aktualnych items.
   - onBlur: parse draft -> `string[]` i update block content.
2. `core/services/posts/editor/postBlockNormalizer.ts`
   - bez zmiany kontraktu output (`string[]`), ale explicit tests dla multiline parsera.
3. `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
   - potwierdzic, ze update flow listy jest kompatybilny z autosave/history.

---

## Pseudocode
```ts
const [listDraftByBlockId, setListDraftByBlockId] = useState<Record<string, string>>({});

function handleListChange(blockId: string, nextDraft: string) {
  setListDraftByBlockId((prev) => ({ ...prev, [blockId]: nextDraft }));
}

function handleListBlur(blockId: string) {
  const draft = listDraftByBlockId[blockId] ?? "";
  const items = parseListDraftToItems(draft); // preserve user intent while editing, compact on commit
  onUpdateBlockContent(blockId, items);
}
```

---

## Acceptance Criteria
1. `Enter` w bloku listy nie "cofa" od razu do jednej linii.
2. Uzytkownik moze wpisac wiele elementow po jednej linii.
3. Po blur dane listy sa poprawnie zapisane jako tablica stringow.
4. Brak regresji renderowania listy na canvas/runtime.

---

## Testing Requirements
- Unit (new):
  - `tests/unit/posts/post-list-draft-parser.test.ts`
    - multiline input -> expected `string[]`
    - trailing newline + empty rows -> deterministic commit behavior
    - whitespace normalization
- Integration (new):
  - `tests/integration/ui/post-editor-list-multiline.test.tsx`
    - typing + enter + blur flow
    - list preview reflects committed rows
- Regression:
  - `tests/unit/posts/post-block-runtime-renderer.test.tsx` (list rendering parity)
  - `tests/integration/ui/post-editor-canvas-shared.test.tsx`

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (list draft/edit model)

