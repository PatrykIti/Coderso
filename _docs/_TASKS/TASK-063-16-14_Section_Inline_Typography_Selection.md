# TASK-063-16-14: Section Inline Typography Selection
# FileName: TASK-063-16-14_Section_Inline_Typography_Selection.md

**Priority:** High  
**Category:** Admin/UI + Runtime  
**Estimated Effort:** Small  
**Dependencies:** TASK-063-16  
**Status:** Done (2026-03-02)

---

## Overview
Allow font family and text size controls to apply to selected text within section richtext while keeping block-wide typography changes when no selection exists.

---

## Sub-Tasks
1. Apply inline typography spans for selections when changing font family or text size.
2. Extend richtext sanitizer to preserve inline typography attributes.
3. Add admin/runtime CSS for inline typography markers.
4. Add unit coverage for inline typography serialization.
5. Update docs/changelog.

---

## Testing Requirements
- `bun test tests/unit/posts/post-richtext-serializer.test.ts`

---

## Documentation Updates Required
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`
