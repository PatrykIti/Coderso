# TASK-063-16-19: Section Toolbar Type Profiles
# FileName: TASK-063-16-19_Section_Toolbar_Type_Profiles.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-16-18  
**Status:** Done (2026-03-02)

---

## Overview
Make the Type control convert a section block into other text block types, and narrow toolbar options per block type (paragraph/heading) with inline alignment + clear formatting.

---

## Sub-Tasks
1. Add block-type commands and map them to block transforms.
2. Restrict toolbar profile options for paragraph/heading (remove list/code groups).
3. Add heading-level dropdown for heading blocks.
4. Ensure writing-canvas Type conversion preserves content when switching block type.
5. Update tests and docs/changelog.

---

## Testing Requirements
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/ui/post-richtext-block-transform.test.ts`
- `bun test tests/integration/ui/post-richtext-toolbar.test.tsx`
- `bun test tests/integration/ui/post-richtext-toolbar-grouped-controls.test.tsx`
- `bun test tests/unit/ui/post-editor-canvas-toolbar-profile-routing.test.tsx`

---

## Documentation Updates Required
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`
