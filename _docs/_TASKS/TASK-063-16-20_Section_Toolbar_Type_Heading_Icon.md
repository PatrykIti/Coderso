# TASK-063-16-20: Section Toolbar Type Heading Icon
# FileName: TASK-063-16-20_Section_Toolbar_Type_Heading_Icon.md

**Priority:** Medium  
**Category:** Admin/UI  
**Estimated Effort:** Small  
**Dependencies:** TASK-063-16-19  
**Status:** Done (2026-03-02)

---

## Overview
Switch the Type dropdown "Heading" entry to use the generic lucide Heading icon (no number).

---

## Sub-Tasks
1. Update the Type dropdown icon for Heading.
2. Add coverage for the Type dropdown icon.
3. Update docs/changelog.

---

## Testing Requirements
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/integration/ui/post-richtext-toolbar-grouped-controls.test.tsx`

---

## Documentation Updates Required
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`
