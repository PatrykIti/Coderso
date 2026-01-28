# TASK-006-17: Content Entry Editor UI (Visual)
# FileName: TASK-006-17_Content_Entry_Editor_UI.md

**Priority:** High  
**Category:** Admin UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-011, TASK-024  
**Status:** To Do

---

## Overview

Update the non-page entry editor to match the new design (breadcrumbs,
status badge, right metadata panel). This is the visual layer for the entry
editor in TASK-011.

## Reference UI

- `_docs/UI/admin_panel/17-entry-editor/code.html`
- `_docs/UI/admin_panel/17-entry-editor/screen.png`

## UI Composition

**Wrapper:** `AdminShell`

**Sections:**
- Top bar: breadcrumbs, status badge, preview/publish actions.
- Main form area: title, slug, rich text, media picker, relations.
- Right sidebar: metadata (status, publish date, SEO snippet, tags).

## Shadcn Components

- `Button`, `Input`, `Textarea`, `Select`, `Badge`, `Card`,
  `Separator`, `Tabs`, `ScrollArea`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/entries/EntryEditor.tsx` | update | main layout |
| `core/admin/ui/entries/EntryEditorHeader.tsx` | create | top bar |
| `core/admin/ui/entries/EntryMetadataPanel.tsx` | create | right sidebar |
| `core/admin/ui/entries/FieldRenderer.tsx` | update | align with new layout |

## Data + State

- `GET /content-entries/:id` for data.
- `PATCH /content-entries/:id` for drafts.
- `POST /content-entries/:id/publish` for publish.
- `POST /content-entries/:id/preview` for preview.

## Unit Tests

- `tests/unit/ui/content-entry-editor.test.tsx` renders main panels.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-content-entry-editor-ui.md`
