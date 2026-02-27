# TASK-063-14-05: Contextual Toolbar Profiles and Block Inspector Dedup
# FileName: TASK-063-14-05_Contextual_Toolbar_Profiles_and_Block_Inspector_Dedup.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-14-01, TASK-063-14-04  
**Status:** To Do

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

---

## Testing Requirements
- Unit (new):
  - `tests/unit/ui/post-editor-richtext-toolbar-profiles.test.ts`
  - `tests/unit/ui/post-editor-block-inspector-ownership.test.ts`
- Integration (new):
  - `tests/integration/ui/post-editor-toolbar-inspector-dedup.test.tsx`

---

## Documentation Updates Required
- `_docs/CODERSO_MODULES.md` (toolbar vs inspector ownership)
