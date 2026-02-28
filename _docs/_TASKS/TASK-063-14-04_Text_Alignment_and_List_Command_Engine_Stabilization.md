# TASK-063-14-04: Text Alignment and List Command Engine Stabilization
# FileName: TASK-063-14-04_Text_Alignment_and_List_Command_Engine_Stabilization.md

**Priority:** High  
**Category:** Admin/UI + Editor Core  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-14-02, TASK-063-14-03  
**Status:** In Progress (2026-02-28)

---

## Overview
Naprawic komendy alignment (`left/center/right`) i domknac semantyke list command w kontekscie dedykowanego `list` bloku.

---

## Scope
1. Wprowadzic dzialajace alignment commands na aktualnym bloku i multiline selection.
2. Dookreslic, kiedy toolbar list command jest dostepny i co robi.
3. Zapewnic brak konfliktu miedzy toolbar list a dedykowanym `list` block.
4. Utrzymac stabilnosc outputu po serialize/sanitize dla `data-align` i list markup.

---

## Alignment + List Semantics Contract (Locked)
1. Alignment (`left/center/right`):
   - ustawia `data-align` na wszystkich blokach objetych selekcja,
   - nie modyfikuje blokow spoza selekcji.
2. Toolbar list command:
   - dostepny tylko w profilach tekstowych z matrixa (`writing-canvas`, `paragraph`, `callout`),
   - niedostepny dla `heading` i `quote`.
3. Dedykowany `list` block:
   - ma osobny model (`items[]`, `ordered`, `compact`) i nie korzysta z richtext list command,
   - edycja typu listy/compact odbywa sie przez block attrs (canvas quick controls + inspector).
4. `Paragraph` po liście:
   - przywraca zwykly `p` i usuwa `ul/ol` wrapper dla zaznaczonego zakresu.

---

## Detailed File-Level Plan
1. `core/admin/ui/posts/editor/richtext/postRichTextCommandEngine.ts` (new/extended)
   - alignment updater dla selected blocks.
   - list transform/toggle z jawna semantyka unwrap.
2. `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx`
   - uzyc command engine do alignment/list command.
   - zachowac selection i stabilnosc po command execution.
3. `core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx`
   - pokazywac list controls tylko w profilach, gdzie dozwolone.
4. `core/services/posts/editor/postRichTextSerializer.ts`
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
4. Brak konfliktu ownership miedzy richtext list command a `list` block attrs.

---

## Testing Requirements (Target)
- Unit:
  - `tests/unit/posts/post-richtext-command-engine.test.ts`
    - alignment na single-block i multi-block selection.
    - alignment nie dotyka blokow poza selekcja.
    - list toggle `ul <-> p` i `ol <-> p`.
    - `paragraph` po liscie usuwa wrapper i zachowuje tresc.
  - `tests/unit/posts/post-richtext-serializer.test.ts`
    - preserve `data-align` na `p/h*/blockquote`.
    - preserve `ul/ol/li` po serializacji.
    - sanitize `align`/`data-align` do dozwolonych wartosci.
  - `tests/unit/ui/post-editor-richtext-toolbar-profiles.test.tsx`
    - list controls visibility zgodna z profile matrix.
  - `tests/unit/ui/post-editor-block-inspector-ownership.test.tsx`
    - dla `list` block zostaja dedykowane controlki (`ordered`, `compact`), bez konfliktu toolbar.
- Integration/contract:
  - `tests/integration/ui/post-editor-richtext-command-contract.test.tsx`
    - alignment across single + multiline selection.
    - bullet/ordered command behavior i revert do paragraph.
  - `tests/integration/ui/post-editor-toolbar-inspector-dedup.test.tsx`
    - brak dublowania alignment/text-scale w inspectorze dla blokow tekstowych.

---

## Documentation Updates Required
- `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md` (alignment/list decisions)
