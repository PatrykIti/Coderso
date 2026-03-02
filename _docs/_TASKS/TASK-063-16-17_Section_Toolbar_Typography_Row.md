# TASK-063-16-17: Section Toolbar Typography Row
# FileName: TASK-063-16-17_Section_Toolbar_Typography_Row.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Small  
**Dependencies:** TASK-063-16  
**Status:** Done (2026-03-02)

---

## Overview
Move font family/size controls into a dedicated toolbar row with contextual info, and align the `More formatting` toggle to the right in that row.

---

## Sub-Tasks
1. Re-layout `PostRichTextToolbar` to split action row and typography row.
2. Add contextual info label for typography controls.
3. Update toolbar test coverage.
4. Update docs/changelog.

---

## Testing Requirements
- `bun test tests/integration/ui/post-richtext-toolbar.test.tsx`

---

## Documentation Updates Required
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`
