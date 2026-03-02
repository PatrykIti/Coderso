# TASK-063-16-22: Section Empty Placeholder Preview
# FileName: TASK-063-16-22_Section_Empty_Placeholder_Preview.md

**Priority:** Medium  
**Category:** Admin/UI  
**Estimated Effort:** Small  
**Dependencies:** TASK-063-16-21  
**Status:** Done (2026-03-02)

---

## Overview
Show the section placeholder text on the canvas when a writing-canvas block is empty and not active, so empty sections remain discoverable.

---

## Scope
- Reuse the same placeholder copy as the active writing-canvas editor.
- Treat empty rich text (e.g., `<p></p>`) as empty for preview purposes.
- Add coverage for the empty placeholder behavior.

---

## Implementation Plan
1. Add a shared placeholder constant for writing-canvas in the canvas component.
2. Update preview rendering to detect empty rich text by plain-text extraction.
3. Add or update integration tests for empty section previews.
4. Update task/changelog docs.

---

## Files To Change
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
- `tests/integration/ui/post-editor-canvas-shared.test.tsx`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`

---

## Testing Requirements
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/integration/ui/post-editor-canvas-shared.test.tsx`

---

## Documentation Updates Required
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`
