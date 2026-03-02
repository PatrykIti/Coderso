# TASK-063-16-21: Post Editor Settings Dialog Scroll
# FileName: TASK-063-16-21_Post_Editor_Settings_Dialog_Scroll.md

**Priority:** Medium  
**Category:** Admin/UI  
**Estimated Effort:** Small  
**Dependencies:** TASK-063-16-20  
**Status:** Done (2026-03-02)

---

## Overview
Reduce the editor settings dialog height, prevent overflow outside the viewport, and make the content scrollable.

---

## Sub-Tasks
1. Clamp dialog height and allow vertical scrolling for settings content.
2. Keep header/footer visible while scrolling.
3. Update docs/changelog.

---

## Testing Requirements
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`
