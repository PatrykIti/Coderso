# TASK-063-06: Writing Canvas Appender and Smart Paste Parity
# FileName: TASK-063-06_Writing_Canvas_Appender_and_Smart_Paste_Parity.md

**Priority:** High  
**Category:** Authoring UX  
**Estimated Effort:** Large  
**Dependencies:** TASK-061, TASK-063-04  
**Status:** To Do

---

## Overview
Doprowadzic writing flow do Gutenberg-like ergonomii:
- appender `+` w canvas,
- slash command jako szybki insert,
- poprawione paste z Word/Docs (headings, lists, links, images),
- brak niechcianych reloadow stanu przy edycji.

---

## Scope
1. Dodac inline appender points w canvas.
2. Ujednolicic pipeline inserter + slash + appender.
3. Domknac heurystyki paste:
   - heading level fidelity,
   - cleanup Word markup,
   - TOC replacement directives z `TASK-062`.
4. Zabezpieczyc przed hydrate resetami podczas normalnej edycji.

---

## Detailed Sub-Tasks
- `TASK-063-06-01_Inline_Appender_Insert_Points.md`
- `TASK-063-06-02_Unified_Inserter_Slash_Appender_Flow.md`
- `TASK-063-06-03_Smart_Paste_Hardening_and_TOC_Directives.md`

---

## Files to Create / Change
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx`
- `core/services/posts/editor/postPasteNormalizer.ts`
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
- `tests/unit/posts/post-paste-normalizer.test.ts`
- `tests/integration/ui/post-editor-writing-canvas-flow.test.tsx`
- `tests/integration/ui/post-editor-paste-from-word.test.tsx`

---

## Pseudocode
```ts
onAppenderInsert(type) {
  insertBlockAtCursor(type);
  focusInsertedBlock();
}

onPaste(payload) {
  const normalized = normalizePostPastePayload(payload);
  applyPasteNodes(normalized.nodes);
  if (normalized.directives.replaceWordTocWithDynamicToc) {
    ensureSingleTocBlock();
  }
}
```

---

## Acceptance Criteria
1. Autor moze wstawic blok przez appender/slash/inserter z tym samym efektem.
2. Paste z Word nie psuje struktury i nie wprowadza martwych TOC linkow.
3. Edycja nie triggeruje niepotrzebnych "loading editor" reloadi.

---

## Testing Requirements
- Unit:
  - paste directives,
  - normalization edge cases.
- Integration UI:
  - appender insertion,
  - slash insertion,
  - Word paste regressions.

---

## Documentation Updates Required
- `_docs/CMS_API.md` (paste directives + editor apply behavior)
- `_docs/ARCHITECTURE.md` (writing flow event model)

