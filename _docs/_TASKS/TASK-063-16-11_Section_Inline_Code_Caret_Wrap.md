# TASK-063-16-11: Section Inline Code Caret Wrap
# FileName: TASK-063-16-11_Section_Inline_Code_Caret_Wrap.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Small  
**Dependencies:** TASK-063-16  
**Status:** Done (2026-03-02)

---

## Overview
Allow `inline-code` (and highlight) to apply when the caret is placed inside a word by expanding collapsed selections to the nearest text token in the section canvas.

---

## Sub-Tasks
1. Expand inline wrapper commands to wrap the nearest word when selection is collapsed.
2. Add unit coverage for inline wrapper word-range resolution.
3. Update docs/changelog.

---

## Testing Requirements
- `bun test tests/unit/ui/post-richtext-inline-wrapper.test.ts`

---

## Documentation Updates Required
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`
