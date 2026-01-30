# TASK-030-01: Import / Export Service
# FileName: TASK-030-01_Import_Export_Service.md

**Priority:** Medium  
**Category:** CMS/Tools  
**Estimated Effort:** Medium  
**Dependencies:** TASK-001  
**Status:** Done (2026-01-30)

---

## Overview

Create export/import services for config bundles.

## Export Scope (v1)

Export JSON bundle including:
- Settings (core settings map)
- Menus + menu items
- Theme profiles + routes
- Admin theme profiles/templates
- Redirects (if available)

## Import Rules (v1)

- Validate schema (strict).
- Optional `dryRun` flag.
- When importing:
  - upsert settings
  - replace menus + menu items
  - upsert theme profiles/templates
  - upsert redirects

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/services/tools/importExportService.ts` | export/import logic |
| `core/services/tools/importExportTypes.ts` | bundle type |
| `tests/unit/tools/importExport.test.ts` | export/import behavior |

## Documentation Updates Required

- `_docs/CMS_API.md` describe bundle format.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-import-export-service.md`
