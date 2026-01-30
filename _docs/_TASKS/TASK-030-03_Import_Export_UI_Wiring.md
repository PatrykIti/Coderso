# TASK-030-03: Import / Export UI Wiring
# FileName: TASK-030-03_Import_Export_UI_Wiring.md

**Priority:** Medium  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-030-02, TASK-006-40  
**Status:** To Do

---

## Overview

Wire Import/Export UI to real API endpoints.

## UI Scope

Use:
- `core/admin/ui/import-export/ImportExportPage.tsx`
- `core/admin/ui/import-export/ExportCards.tsx`
- `core/admin/ui/import-export/ImportDropzone.tsx`

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/admin/services/importExportClient.ts` | `exportConfig`, `importConfig`, `previewImport` |
| `ImportExportPage.tsx` | load/export handlers |
| `ImportDropzone.tsx` | upload + preview results |
| `ExportCards.tsx` | trigger download |

## Testing Requirements

- `tests/unit/admin/importExportClient.test.ts` (new).
- Update `tests/unit/ui/import-export.test.tsx`.

## Documentation Updates Required

- `_docs/CMS_API.md` link to endpoints.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-import-export-ui-wiring.md`
