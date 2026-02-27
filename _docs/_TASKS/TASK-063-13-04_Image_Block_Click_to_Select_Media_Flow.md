# TASK-063-13-04: Image Block Click to Select Media Flow
# FileName: TASK-063-13-04_Image_Block_Click_to_Select_Media_Flow.md

**Priority:** High  
**Category:** Admin/UI + Media Integration  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-13-01  
**Status:** To Do

---

## Overview
Zmienic flow `image` bloku:
- klik w placeholder na canvasie otwiera media picker,
- wybor assetu od razu aktualizuje blok,
- link/manual attrs zostaja jako advanced/custom opcja w `Block` tab.

---

## Scope
1. Dodac bezposredni media picker dialog w post editor canvas.
2. Podpiac aktualizacje attrs (`mediaId`, `alt`, `caption`) po wyborze assetu.
3. Zapewnic resolve `mediaId -> url` dla podgladu na canvas.
4. Zachowac reczna konfiguracje jako fallback w inspectorze.

---

## Security Contract
- **Visibility:** internal (`/admin/api/media*` via existing admin media client).  
- **Auth model:** authenticated admin session lub internal API key scope (`media.read`).  
- **Rate-limit bucket:** `admin_read` / `admin_write` (existing).  
- **Anti-abuse:** brak nowych endpointow; reuse existing admin middleware, CSRF, RBAC.

---

## Detailed File-Level Plan
1. `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
   - dodac stan `activeImagePickerBlockId`.
   - klik placeholdera image -> otworz dialog.
   - po wyborze media -> `onUpdateBlockAttrs(blockId, patch)`.
2. `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
   - przekazac `editor.updateBlockAttrs` do canvasu.
3. `core/admin/ui/media/MediaPicker.tsx`
   - reuse bez zmian API; ewentualnie dodac lekki wrapper dla image-only mode.
4. `core/admin/services/mediaClient.ts`
   - helper resolve media by id z cache/listy (bez nowego endpointu).
5. `core/admin/ui/posts/editor/inspector/BlockInspector.tsx`
   - zostawic manual `mediaId` i URL custom jako advanced fallback.

---

## Pseudocode
```ts
onImagePlaceholderClick(blockId) {
  setActiveImagePickerBlockId(blockId);
}

onMediaSelected(media) {
  updateBlockAttrs(blockId, {
    mediaId: media.id,
    alt: currentAlt || media.alt || media.title || "",
    caption: currentCaption || media.caption || "",
  });
  closePicker();
}
```

---

## Acceptance Criteria
1. Klik placeholdera image otwiera media picker.
2. Wybor assetu automatycznie renderuje obraz na canvas.
3. `Block` tab nadal pozwala na custom/manual override.
4. Brak zmian backend endpointow i brak regresji media permissions.

---

## Testing Requirements
- Unit (new):
  - `tests/unit/ui/post-editor-image-block-media-resolution.test.ts`
    - mediaId resolution z cache/listMedia.
  - `tests/unit/ui/post-editor-image-block-attrs-merge.test.ts`
    - merge selected media defaults z istniejacymi attrs.
- Integration (new):
  - `tests/integration/ui/post-editor-image-media-picker.test.tsx`
    - click placeholder -> open picker -> select -> image preview appears.
  - `tests/integration/ui/post-editor-canvas-shared.test.tsx`
    - update existing image placeholder expectations.

---

## Documentation Updates Required
- `_docs/CMS_API.md` (editor image block behavior notes)
- `_docs/ARCHITECTURE.md` (media picker flow for image block)

