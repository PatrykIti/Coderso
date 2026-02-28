# TASK-063-14-05: Contextual Toolbar Profiles and Block Inspector Dedup
# FileName: TASK-063-14-05_Contextual_Toolbar_Profiles_and_Block_Inspector_Dedup.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-14-01, TASK-063-14-04  
**Status:** In Progress (2026-02-28)

---

## Overview
Wprowadzic profile toolbara zalezne od typu bloku i usunac duplikacje opcji miedzy toolbar a prawym panelem `Block`.

---

## Scope
1. Profile toolbara dla `writing-canvas`, `paragraph`, `heading`, `quote`.
2. Ograniczyc opcje dla `heading` (mniej opcji niz `paragraph`).
3. Ustalic ownership: co jest `toolbar-only`, co `inspector-only`.
4. Dla `list` block doprecyzowac zestaw sensownych opcji w prawym panelu.

---

## Ownership Contract (Locked)
1. `toolbar-only` dla blokow tekstowych (`writing-canvas`, `paragraph`, `heading`, `quote`, `callout`):
   - inline marks (`bold/italic/underline/strike/inline-code/highlight/link`),
   - block-format commands (`paragraph/heading/quote/list` zgodnie z profile matrix),
   - `alignment`,
   - `textScale` i `fontFamily` (global typography controls z toolbara).
2. `inspector-only`:
   - `width`, `spacingTop`, `spacingBottom`,
   - `anchorId`, `className`, `hideOnMobile`,
   - block-specific attrs (np. `heading.level`, `list.ordered/compact`, image/button/embed attrs).
3. `list` block:
   - brak richtext toolbar profile,
   - prawa kolumna i quick controls na canvasie pozostaja canonical source of truth.

---

## Detailed File-Level Plan
1. `core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx`
   - dodac `profile` i render dynamicznych grup przyciskow.
2. `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
   - przekazywac profil toolbara z kontekstu bloku.
3. `core/admin/ui/posts/editor/inspector/BlockInspector.tsx`
   - usunac pola dublujace toolbar.
   - zostawic tylko opcje, ktorych nie ma na toolbarze (lub runtime-level).
4. `core/admin/ui/posts/editor/inspector/inspectorSchemas.ts`
   - zaktualizowac sekcje i opisy ownership.
5. `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md`
   - utrwalic finalny ownership split i profile matrix.

---

## Pseudocode
```ts
const TOOLBAR_PROFILE_BY_BLOCK: Record<BlockType, ToolbarProfile | null> = {
  "writing-canvas": "writing-canvas",
  paragraph: "paragraph",
  heading: "heading",
  quote: "quote",
  list: null,
};

const INSPECTOR_FIELDS = ALL_FIELDS.filter((field) => !toolbarOwns(field));
```

---

## Acceptance Criteria
1. `Heading` nie pokazuje niepotrzebnych opcji formatting.
2. `Paragraph` ma rozszerzony zestaw, zgodny z matrixem.
3. `Block` inspector nie duplikuje opcji z toolbar.
4. `List` block ma sensowny, niepusty zestaw opcji dedykowanych.
5. Ownership split jest jawnie opisany i testowalny (brak "implicit behavior").

---

## Testing Requirements (Target)
- Unit:
  - `tests/unit/ui/post-editor-richtext-toolbar-profiles.test.tsx`
    - matrix `writing-canvas`, `paragraph`, `heading`, `quote`, `callout`.
    - heading profile nie pokazuje `H1..H6`, `quote`, `bullet/ordered`.
  - `tests/unit/ui/post-editor-block-inspector-ownership.test.tsx`
    - tekstowe bloki: brak `Alignment` i `Text size` w inspectorze.
    - nietekstowe bloki: alignment/text controls pozostaja, gdy sa w scope.
    - `list` block: obecne `ordered` i `compact`.
  - `tests/unit/ui/post-editor-canvas-toolbar-profile-routing.test.tsx` (new)
    - mapowanie block type -> `toolbarProfile` w canvasie.
- Integration/contract:
  - `tests/integration/ui/post-editor-toolbar-inspector-dedup.test.tsx` (new)
    - brak duplikatow controli pomiedzy toolbar i `Block` inspector.
    - `list` block zachowuje dedykowany zestaw opcji przy braku richtext toolbar profile.

---

## Documentation Updates Required
- `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md`
- `_docs/ARCHITECTURE.md`
