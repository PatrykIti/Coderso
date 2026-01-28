# TASK-006-28: Theme Editor UI (Visual)
# FileName: TASK-006-28_Theme_Editor_UI.md

**Priority:** Medium  
**Category:** Admin UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-008, TASK-024  
**Status:** Done (2026-01-28)

---

## Overview

Create the theme editor screen with live preview and token editor tabs.
Visual-only layer for TASK-008.

## Reference UI

- `_docs/UI/admin_panel/28-themes-editor/code.html`
- `_docs/UI/admin_panel/28-themes-editor/screen.png`

## UI Composition

**Wrapper:** `AdminShell`

**Sections:**
- Breadcrumbs + actions (save, reset, export).
- Split layout: preview panel + token editor.
- Tabs: colors, typography, spacing, radius.

## Shadcn Components

- `Tabs`, `Button`, `Textarea`, `Card`, `Separator`, `ScrollArea`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/themes/ThemeEditorPage.tsx` | create | main layout |
| `core/admin/ui/themes/ThemePreviewPanel.tsx` | create | preview |
| `core/admin/ui/themes/ThemeTokensEditor.tsx` | create | token tabs |

## Data + State

- `GET /themes/:id`
- `PATCH /themes/:id`
- `POST /themes/:id/export`

## Unit Tests

- `tests/unit/ui/theme-editor.test.tsx` renders preview + editor.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-theme-editor-ui.md`
