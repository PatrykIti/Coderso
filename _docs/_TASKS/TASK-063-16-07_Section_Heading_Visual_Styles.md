# TASK-063-16-07: Section Heading Visual Styles
# FileName: TASK-063-16-07_Section_Heading_Visual_Styles.md

**Priority:** High  
**Category:** Admin/UI + UX  
**Estimated Effort:** Small  
**Dependencies:** TASK-063-16  
**Status:** Done (2026-03-02)

---

## Overview
Ensure `Heading` commands (H1-H6) are visually distinguishable inside the section writing-canvas and its preview surface.

---

## Sub-Tasks
1. Add explicit `h1..h6` styling for the admin richtext surface.
2. Reuse the same styling for the non-selected preview rendering.
3. Add a render test to guard preview markup for section headings.

---

## Testing Requirements
- `bun test tests/integration/ui/post-editor-canvas-shared.test.tsx`

---

## Documentation Updates Required
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`
