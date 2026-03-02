# TASK-063-16-06: Section Paragraph Quote Visual Styles
# FileName: TASK-063-16-06_Section_Paragraph_Quote_Visual_Styles.md

**Priority:** High  
**Category:** Admin/UI + UX  
**Estimated Effort:** Small  
**Dependencies:** TASK-063-16  
**Status:** Done (2026-03-02)

---

## Overview
Make `quote` formatting visually distinct in the post editor section canvas and preview surface so users can see paragraph vs quote changes immediately.

---

## Sub-Tasks
1. Add explicit blockquote styling for the admin richtext surface.
2. Ensure the preview renderer uses the richtext styling class so quotes are visible when the block is not selected.
3. Add unit coverage for the preview class wiring.

---

## Implementation Notes / Pseudocode
- Add `.post-editor-richtext blockquote` styles to `core/admin/styles/globals.css`.
- Update `renderHtmlPreview` to include `post-editor-richtext` class.
- Add a small render test to confirm preview markup includes the class.

---

## Testing Requirements
- `bun test tests/integration/ui/post-editor-canvas-shared.test.tsx`

---

## Documentation Updates Required
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`
