# TASK-063-11-03: Unified Borderless Canvas and Media Placeholders
# FileName: TASK-063-11-03_Unified_Borderless_Canvas_and_Media_Placeholders.md

**Priority:** High  
**Category:** Authoring UX  
**Estimated Effort:** Large  
**Dependencies:** TASK-061-06, TASK-063-11-01  
**Status:** To Do

---

## Overview
Zmienic canvas na spojny "article flow":
- bez kart/ramek na kazdym bloku,
- czytelny, ciagly dokument jak w Word,
- media blocks maja klikalne placeholdery (image/video/embed), ktore kieruja do konfiguracji.

---

## Scope
1. Usunac visual card chrome z blokow w canvas.
2. Zachowac selection/focus bez narzucania ramek.
3. Dla media blocks dodac placeholder z CTA i klik flow do `Block` settings.
4. Zachowac smart paste i writing-canvas behavior.

---

## Physical Files (Planned)
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx`
- `core/admin/ui/posts/editor/inspector/BlockInspector.tsx`
- `tests/integration/ui/post-editor-canvas-shared.test.tsx`
- `tests/integration/ui/post-editor-writing-canvas-flow.test.tsx`

---

## Pseudocode
```ts
renderBlock(block) {
  if (isMediaBlock(block) && !hasConfiguredMedia(block)) {
    return <MediaPlaceholder onClick={() => openBlockSettings(block.id)} />;
  }
  return <BorderlessArticleBlock block={block} />;
}
```

---

## Acceptance Criteria
1. Canvas wyglada jak jedna ciagla tresc artykulu.
2. Brak ramek/cardow per block w default view.
3. Media placeholdery sa czytelne i klikalne.
4. Klik placeholdera otwiera kontekst `Block` po prawej.

---

## Testing Requirements
- Integration:
  - borderless canvas rendering,
  - media placeholder click -> block context.

---

## Documentation Updates Required
- `_docs/CODERSO_MODULES.md`
