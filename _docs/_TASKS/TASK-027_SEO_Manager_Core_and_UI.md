# TASK-027: SEO Manager Core and UI
# FileName: TASK-027_SEO_Manager_Core_and_UI.md

**Priority:** High  
**Category:** CMS/SEO  
**Estimated Effort:** Large  
**Dependencies:** TASK-001, TASK-004, TASK-020, TASK-006-26  
**Status:** To Do

---

## Overview

Implement a minimal, real SEO manager backend and wire it to the existing UI.
No mocks after completion.

## Goals

- Persist SEO metadata per Page/Entry.
- Provide an audit endpoint to calculate a basic SEO score.
- Wire Admin UI drawer + audit dialog to API.

## Sub-Tasks (detailed task files)

- `TASK-027-01_SEO_DB_Schema.md`
- `TASK-027-02_SEO_Service_and_Audit.md`
- `TASK-027-03_SEO_API_Routes.md`
- `TASK-027-04_SEO_UI_Wiring.md`

## Testing Requirements

Covered in sub-tasks (DB, service, API, UI).

## Documentation Updates Required

- `_docs/CMS_API.md` (SEO endpoints).
- `_docs/ARCHITECTURE.md` (SEO manager overview).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-seo-manager-core.md`
