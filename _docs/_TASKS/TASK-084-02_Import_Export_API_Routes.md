# TASK-084-02: Import / Export API Routes
# FileName: TASK-084-02_Import_Export_API_Routes.md

**Priority:** Medium  
**Category:** CMS/Tools  
**Estimated Effort:** Medium  
**Dependencies:** TASK-084-01, TASK-020  
**Status:** To Do

---

## Overview

Expose import/export endpoints for Admin UI.

## Routes

Add `core/server/routes/importExportRoutes.ts`:

- `GET /tools/export` → returns JSON bundle
- `POST /tools/import` → accepts bundle
- `POST /tools/import/preview` → dry-run validation

## Validation

`core/server/validation/importExportSchemas.ts`:
- `importBundleSchema`
- `importPreviewSchema`

## Testing Requirements

- `tests/integration/routes/importExport.test.ts` registers endpoints.

## Documentation Updates Required

- `_docs/CMS_API.md` add import/export endpoints + examples.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-import-export-api.md`
