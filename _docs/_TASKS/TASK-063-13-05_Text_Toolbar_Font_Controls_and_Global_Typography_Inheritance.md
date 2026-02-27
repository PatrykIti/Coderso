# TASK-063-13-05: Text Toolbar Font Controls and Global Typography Inheritance
# FileName: TASK-063-13-05_Text_Toolbar_Font_Controls_and_Global_Typography_Inheritance.md

**Priority:** High  
**Category:** Admin/UI + Authoring UX  
**Estimated Effort:** Large  
**Dependencies:** TASK-063-13-02  
**Status:** Done (2026-02-27)

---

## Overview
Wdrozyc kontrakt typografii dla blokow tekstowych:
1. Toolbar nad blokami tekstowymi ma kontrolki fontu i bazowej skali.
2. Zmiana fontu/typography na jednym bloku aktualizuje globalny baseline dla pozostalych tekstowych blokow.
3. Inline style (`bold`, `italic`, `underline`, `link`) pozostaje per fragment tekstu i nie jest dziedziczony globalnie.

---

## Scope
1. Dodac font controls do `PostRichTextToolbar`.
2. Dodac document-level typography contract w `PostBlockDocument.meta`.
3. Dodac resolver dziedziczenia:
   - priorytet: explicit block attrs -> document meta defaults.
4. Dodac migracje/normalizacje dla starszych dokumentow bez typography meta.

---

## Detailed File-Level Plan
1. `core/services/posts/editor/postBlockDocument.ts`
   - rozszerzyc `PostBlockDocumentMeta` o `typography` (np. `fontFamily`, `baseTextScale`).
2. `core/services/posts/editor/postBlockNormalizer.ts`
   - normalize `meta.typography`.
   - safe defaults i backward compatibility.
3. `core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx`
   - dodac controls (font family, base text scale) i callbacki.
4. `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx`
   - przyjmowac typography context do renderingu editable surface.
5. `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
   - przekazywac typography defaults do blokow tekstowych.
6. `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
   - akcje aktualizacji document typography meta.
7. `core/services/posts/runtime/postBlockRuntimeMapper.ts`
   - przeniesc typography defaults do runtime layout blocks.
8. `core/services/posts/runtime/postBlockRuntimeRenderer.tsx`
   - runtime class/style mapping dla typography defaults.

---

## Pseudocode
```ts
type DocumentTypography = {
  fontFamily: "default" | "serif" | "sans" | "mono";
  baseTextScale: "sm" | "md" | "lg";
};

function resolveTextBlockTypography(block, documentMetaTypography) {
  return {
    fontFamily: block.attrs.fontFamily ?? documentMetaTypography.fontFamily,
    baseTextScale: block.attrs.textScale ?? documentMetaTypography.baseTextScale,
  };
}

function onToolbarTypographyChange(nextTypography) {
  updateDocumentMeta({ typography: nextTypography });
}
```

---

## Acceptance Criteria
1. Wszystkie bloki tekstowe maja toolbar z kontrola fontu i bazowej skali.
2. Zmiana typografii w jednym bloku aktualizuje globalny baseline dla innych tekstowych blokow.
3. `bold/italic/link` pozostaja lokalne (inline), bez globalnego dziedziczenia.
4. Runtime preview i canvas sa zgodne dla typography defaults.

---

## Testing Requirements
- Unit (new):
  - `tests/unit/posts/post-block-normalizer-typography.test.ts`
    - normalize/meta defaults/migration.
  - `tests/unit/posts/post-runtime-typography-mapper.test.ts`
    - inheritance resolution block vs document.
  - `tests/unit/ui/post-editor-typography-inheritance.test.ts`
    - update policy and selector behavior.
- Integration (new):
  - `tests/integration/ui/post-editor-typography-toolbar.test.tsx`
    - toolbar font control visible for text blocks.
    - change propagates to other text blocks on canvas.
  - `tests/integration/ui/post-editor-smoke-regression.test.tsx`
    - no regression in save/preview flow.

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (document typography contract)
- `_docs/CMS_API.md` (post document meta extensions)
- `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md` (documented allowed enhancement)

