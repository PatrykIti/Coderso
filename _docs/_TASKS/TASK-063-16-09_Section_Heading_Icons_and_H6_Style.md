# TASK-063-16-09: Section Heading Icons and H6 Style
# FileName: TASK-063-16-09_Section_Heading_Icons_and_H6_Style.md

**Priority:** Medium  
**Category:** Admin/UI + UX  
**Estimated Effort:** Small  
**Dependencies:** TASK-063-16  
**Status:** Done (2026-03-02)

---

## Overview
Add Heading5/Heading6 icons in the toolbar dropdown and remove unintended uppercase styling from H6 in editor/runtime.

---

## Sub-Tasks
1. Render Heading5/Heading6 icons in the headings dropdown list.
2. Remove uppercase/letter-spacing styling from H6 in admin and runtime CSS.
3. Add toolbar render coverage to prevent regressions.

---

## Testing Requirements
- `bun test tests/integration/ui/post-richtext-toolbar-grouped-controls.test.tsx`

---

## Documentation Updates Required
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`
