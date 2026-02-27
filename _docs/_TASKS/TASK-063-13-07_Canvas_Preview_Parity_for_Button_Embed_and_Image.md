# TASK-063-13-07: Canvas Preview Parity for Button Embed and Image
# FileName: TASK-063-13-07_Canvas_Preview_Parity_for_Button_Embed_and_Image.md

**Priority:** High  
**Category:** Admin/UI + Runtime Parity  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-13-04, TASK-063-13-06  
**Status:** To Do

---

## Overview
Zapewnic "what you see is close to what runtime renders" dla kluczowych blokow interactive/media:
- `button`
- `embed`
- `image`

Celem jest ograniczenie koniecznosci odpalania Preview przy kazdej drobnej zmianie.

---

## Scope
1. Ujednolicic preview style contracts z runtime mapper/renderer.
2. Stosowac wspolne helpery normalizacji attrs (variant/size/provider/aspect/url/media).
3. Dodac fallback placeholders tylko gdy brak minimalnych danych.
4. Zachowac bezpieczenstwo URL/embed sanitization.

---

## Detailed File-Level Plan
1. `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
   - button: render real CTA preview (variant/size/newTab).
   - embed: render safe preview frame shell (aspect + provider + lazy).
   - image: render from resolved media/url attrs + wrap/width/margin.
2. `core/services/posts/runtime/postBlockRuntimeMapper.ts`
   - wydzielic helpery normalizacji do reusable modułu.
3. `core/services/posts/runtime/postBlockRuntimeRenderer.tsx`
   - reuse class mapping in canvas where possible.
4. `core/services/posts/postImageWrapLayout.ts`
   - upewnic sie, ze canvas/runtime uzywaja tych samych klas layout.

---

## Pseudocode
```ts
const preview = mapBlockAttrsToPreviewModel(block.type, block.attrs);

switch (block.type) {
  case "button":
    return <ButtonPreview model={preview.button} />;
  case "embed":
    return <EmbedPreview model={preview.embed} />;
  case "image":
    return <ImagePreview model={preview.image} />;
}
```

---

## Acceptance Criteria
1. `button` na canvasie wyglada i zachowuje sie zblizone do runtime.
2. `embed` na canvasie pokazuje proporcje i source provider zgodnie z runtime mappingiem.
3. `image` na canvasie od razu odzwierciedla wrap/width/margin.
4. Preview fallback placeholder pojawia sie tylko przy brakujacych danych.

---

## Testing Requirements
- Unit (new):
  - `tests/unit/posts/post-runtime-preview-model-mapper.test.ts`
    - button/embed/image attrs -> preview model.
  - `tests/unit/posts/post-image-layout-classes.test.ts`
    - parity classes across canvas/runtime.
- Integration (new):
  - `tests/integration/ui/post-editor-block-preview-parity.test.tsx`
    - button variant/size updates are reflected immediately.
    - embed provider/aspect updates are reflected immediately.
    - image media selection + wrap controls reflect immediately.
- Existing regression:
  - `tests/unit/posts/post-block-runtime-renderer.test.tsx`

---

## Documentation Updates Required
- `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md` (preview parity section)
- `_docs/ARCHITECTURE.md` (runtime/canvas shared preview rules)

