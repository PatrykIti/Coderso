# TASK-006-07: Page Editor UI
# FileName: TASK-006-07_Page_Editor_UI.md

**Priority:** High
**Category:** Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-010, TASK-009, TASK-024
**Status:** To Do

---

## Overview

Create the page editor shell UI (block library, canvas, inspector). This task
covers layout and UI scaffolding; widget logic and builder behaviors live in
TASK-010.

## Reference UI

- `_docs/UI/admin_panel/7-page-editor/code.html`
- `_docs/UI/admin_panel/7-page-editor/screen.png`

## UI Composition

**Wrapper:** `EditorShell`

**Sections:**
- Top bar with breadcrumbs, device switcher, preview/publish actions.
- Left block library (accordion categories + draggable items).
- Center canvas with block frames and hover actions.
- Right inspector with tabs (content, styling, advanced).

## Shadcn Components

- `Button`, `Badge`, `Tabs`, `Accordion`, `Input`, `Textarea`, `Slider`,
  `Switch`, `Tooltip`, `Separator`, `ScrollArea`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/pages/PageEditorPage.tsx` | create | screen layout |
| `core/admin/ui/pages/DeviceSwitcher.tsx` | create | desktop/tablet/mobile |
| `core/admin/ui/pages/BlockLibrary.tsx` | create | left panel |
| `core/admin/ui/pages/CanvasFrame.tsx` | create | center canvas |
| `core/admin/ui/pages/BlockToolbar.tsx` | create | hover actions |
| `core/admin/ui/pages/InspectorPanel.tsx` | create | right panel |
| `core/admin/ui/layouts/EditorShell.tsx` | use | wrapper |

## Data + State

- `GET /pages/:id` for page data.
- `POST /pages/:id/preview` for preview token.
- Local editor state should remain isolated from server DTOs.

## Unit Tests

- `tests/unit/ui/page-editor.test.tsx` renders shell + key panels.
- `tests/unit/ui/device-switcher.test.tsx` toggles active device.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-page-editor-ui.md`

