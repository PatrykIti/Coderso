# TASK-063-13-06: NonText Block Quick Toolbars and Block Inspector DeMock
# FileName: TASK-063-13-06_NonText_Block_Quick_Toolbars_and_Block_Inspector_DeMock.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-063-13-04, TASK-063-13-05  
**Status:** To Do

---

## Overview
Zamknac problem "mockowych opcji" przez:
1. dodanie quick controls nad blokami non-text (image/embed/button/callout/etc.),
2. dopiecie Block inspector controls do realnego efektu w canvas/runtime,
3. jawne oznaczenie opcji runtime-only, jesli nie moga miec instant canvas effect.

---

## Scope
1. Wydzielic kontrakt quick toolbar per block type.
2. Dodac action mappers `blockType -> quickControls`.
3. Podpiac `BlockInspector` controls do canonical state i canvas preview.
4. Oznaczyc i ograniczyc pola, ktore nie maja runtime parity.

---

## Detailed File-Level Plan
1. `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
   - render quick toolbar dla zaznaczonego bloku (text + non-text).
   - per block type: np. image (replace, alt shortcut), button (label/url/variant), embed (provider/aspect/url).
2. `core/admin/ui/posts/editor/inspector/BlockInspector.tsx`
   - uporzadkowac sekcje i usunac controls bez natychmiastowego sensu.
   - dodac helper labels dla runtime-only, gdzie wymagane.
3. `core/admin/ui/posts/editor/inspector/inspectorSchemas.ts`
   - doprecyzowac set opcji i ich semantyke.
4. `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
   - ewentualne helper actions do czestszych quick updates.
5. `core/services/posts/editor/postBlockNormalizer.ts`
   - walidacja nowych / zmienionych attrs.

---

## Pseudocode
```ts
const quickControls = getQuickControlsForBlock(selectedBlock.type);

renderQuickToolbar({
  controls: quickControls,
  value: selectedBlock.attrs,
  onChange: (patch) => updateBlockAttrs(selectedBlock.id, patch),
});
```

---

## Acceptance Criteria
1. Dla wiekszosci blokow sa podreczne quick controls nad blokiem.
2. Zmiana controlki w `Block` tab ma natychmiastowy efekt na canvas (albo jasny label runtime-only).
3. Uzytkownik nie ma wrazenia "mockow" w podstawowych polach.
4. Brak regresji modelu danych i save/autosave.

---

## Testing Requirements
- Unit (new):
  - `tests/unit/ui/post-editor-quick-controls-schema.test.ts`
    - coverage mappingu block type -> controls.
  - `tests/unit/posts/post-block-normalizer-attrs-parity.test.ts`
    - attrs used by quick controls are normalized and persisted.
- Integration (new):
  - `tests/integration/ui/post-editor-block-quick-controls.test.tsx`
    - quick toolbar renders per block type.
    - updates propagate to canvas and right inspector.
  - `tests/integration/ui/post-block-inspector.test.tsx`
    - expanded assertions for non-mock behavior.

---

## Documentation Updates Required
- `_docs/CODERSO_MODULES.md` (quick controls component ownership)
- `_docs/ARCHITECTURE.md` (block inspector responsibility split)

