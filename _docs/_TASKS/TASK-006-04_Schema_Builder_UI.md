# TASK-006-04: Schema Builder UI
# FileName: TASK-006-04_Schema_Builder_UI.md

**Priority:** High
**Category:** Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-003, TASK-024
**Status:** Done (2026-01-26)

---

## Overview

Build the content type schema builder UI (left type list, center field builder,
right JSON preview). This is the visual layer for TASK-011.

## Reference UI

- `_docs/UI/admin_panel/4-schema-builder/code.html`
- `_docs/UI/admin_panel/4-schema-builder/screen.png`

## UI Composition

**Wrapper:** `SplitShell` (with optional right JSON panel)

**Sections:**
- Content type list with search and create button.
- Field cards (expand/collapse, drag handle, badges).
- Field settings panel (inputs, validation toggles).
- JSON preview panel on the right.

## Shadcn Components

- `Button`, `Input`, `Textarea`, `Checkbox`, `Badge`, `Card`, `Separator`,
  `Collapsible`, `ScrollArea`, `Tooltip`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/content-types/SchemaBuilderPage.tsx` | create | screen layout |
| `core/admin/ui/content-types/ContentTypeSidebar.tsx` | create | left list |
| `core/admin/ui/content-types/FieldCard.tsx` | create | expandable card |
| `core/admin/ui/content-types/FieldSettings.tsx` | create | settings pane |
| `core/admin/ui/content-types/SchemaPreviewPanel.tsx` | create | JSON view |
| `core/admin/ui/layouts/SplitShell.tsx` | use | wrapper |

## Data + State

- `GET /content-types` for list.
- `POST /content-types` / `PATCH /content-types/:id` for edits.
- `SchemaBuilderState` keeps normalized fields + order.

## Unit Tests

- `tests/unit/ui/schema-builder.test.tsx` renders sections.
- `tests/unit/ui/field-card.test.tsx` toggles expanded state.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-schema-builder-ui.md`
