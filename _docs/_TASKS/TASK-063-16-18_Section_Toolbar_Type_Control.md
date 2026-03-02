# TASK-063-16-18: Section Toolbar Type Control
# FileName: TASK-063-16-18_Section_Toolbar_Type_Control.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-16-17  
**Status:** Done (2026-03-02)

---

## Overview
Introduce a dedicated "Type" control in the rich text toolbar to switch block type, and narrow per-block toolbar options accordingly while keeping list controls as a separate group.

---

## Sub-Tasks
1. Add a "Type" dropdown to the rich text toolbar and remove redundant heading/paragraph/quote buttons.
2. Route block-format/list commands to block transforms for paragraph/heading/quote blocks.
3. Keep list controls as a dedicated dropdown for future list formatting expansion.
4. Add unit coverage for command-to-transform mapping and update integration toolbar tests.
5. Update docs/changelog.

---

## Testing Requirements
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/ui/post-richtext-block-transform.test.ts`
- `bun test tests/integration/ui/post-richtext-toolbar.test.tsx`
- `bun test tests/integration/ui/post-richtext-toolbar-grouped-controls.test.tsx`

---

## Documentation Updates Required
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`
