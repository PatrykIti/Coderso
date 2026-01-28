# TASK-006-32: Form Builder UI (Visual)
# FileName: TASK-006-32_Form_Builder_UI.md

**Priority:** High  
**Category:** Admin UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-009, TASK-024  
**Status:** To Do

---

## Overview

Create the form builder screen (field library, canvas, settings sidebar).
Visual-only layer until form builder data is implemented.

## Reference UI

- `_docs/UI/admin_panel/32-form-builder/code.html`
- `_docs/UI/admin_panel/32-form-builder/screen.png`

## UI Composition

**Wrapper:** `AdminShell`

**Sections:**
- Left field library list with categories.
- Center builder canvas.
- Right field settings panel.
- Top actions: save, preview.

## Shadcn Components

- `Button`, `Input`, `Card`, `ScrollArea`, `Separator`, `Tabs`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/forms/FormBuilderPage.tsx` | create | main layout |
| `core/admin/ui/forms/FieldLibrary.tsx` | create | left list |
| `core/admin/ui/forms/FormCanvas.tsx` | create | canvas |
| `core/admin/ui/forms/FieldSettingsPanel.tsx` | create | right panel |
| `core/admin/app/AdminApp.tsx` | update | route `/admin/forms` |

## Data + State

- `GET /forms`
- `PATCH /forms/:id`

## Unit Tests

- `tests/unit/ui/form-builder.test.tsx` renders layout.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-form-builder-ui.md`
