# TASK-038: Forms Core and UI
# FileName: TASK-038_Forms_Core_and_UI.md

**Priority:** Medium  
**Category:** CMS/Forms  
**Estimated Effort:** Large  
**Dependencies:** TASK-001, TASK-004, TASK-006-32, TASK-020  
**Status:** Done (2026-01-31)

---

## Overview

Implement the backend for forms (definitions, fields, submissions) and wire the existing Admin UI.

## Goals

- Persist forms and submissions in Postgres.
- Validate form definitions and submission payloads.
- Provide CRUD + submission endpoints.
- Wire the Form Builder UI to live data.

## Sub-Tasks (detailed task files)

- `TASK-038-01_Forms_DB_Schema.md`
- `TASK-038-02_Forms_Service_and_Validation.md`
- `TASK-038-03_Forms_API_Routes.md`
- `TASK-038-04_Forms_UI_Wiring.md`

## Documentation Updates Required

- `_docs/CMS_API.md` (forms endpoints and payloads)
- `_docs/ARCHITECTURE.md` (forms module overview)

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-forms-core.md`
