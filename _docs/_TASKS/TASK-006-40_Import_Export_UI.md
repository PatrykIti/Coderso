# TASK-006-40: Import & Export UI (Visual)
# FileName: TASK-006-40_Import_Export_UI.md

**Priority:** Medium  
**Category:** Admin UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-002, TASK-003, TASK-024  
**Status:** To Do

---

## Overview

Create the import/export screen with export cards and import dropzone. Visual
layer only until import/export endpoints exist.

## Reference UI

- `_docs/UI/admin_panel/40-import-export/code.html`
- `_docs/UI/admin_panel/40-import-export/screen.png`

## UI Composition

**Wrapper:** `AdminShell`

**Sections:**
- Export cards (pages, entries, media).
- Import dropzone with status list.

## Shadcn Components

- `Card`, `Button`, `Input`, `Badge`, `Separator`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/import-export/ImportExportPage.tsx` | create | main layout |
| `core/admin/ui/import-export/ExportCards.tsx` | create | export section |
| `core/admin/ui/import-export/ImportDropzone.tsx` | create | dropzone |

## Data + State

- `GET /export/*`
- `POST /import`

## Unit Tests

- `tests/unit/ui/import-export.test.tsx` renders cards + dropzone.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-import-export-ui.md`
