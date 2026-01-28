# TASK-002: Pages, Revisions, and Preview (Index)
# FileName: TASK-002_Pages_Revisions_and_Preview.md

**Priority:** High  
**Category:** CMS/Pages  
**Estimated Effort:** Medium  
**Dependencies:** TASK-001  
**Status:** Done (2026-01-28)  

---

## Overview

This task is split into detailed subtasks to align data storage, services, and admin API with the existing admin UI. Use the subtasks below as the source of truth for implementation and testing.

---

## Sub-Tasks

1. **TASK-002-01** – Page DB Schema & Migrations  
   File: `_docs/_TASKS/TASK-002-01_Page_DB_Schema.md`

2. **TASK-002-02** – Page Services & Revisions  
   File: `_docs/_TASKS/TASK-002-02_Page_Services_and_Revisions.md`

3. **TASK-002-03** – Preview Tokens & TTL  
   File: `_docs/_TASKS/TASK-002-03_Preview_Tokens.md`

4. **TASK-002-04** – Pages Admin API & Validation  
   File: `_docs/_TASKS/TASK-002-04_Pages_Admin_API.md`

5. **TASK-002-05** – Pages UI Wiring (Admin)  
   File: `_docs/_TASKS/TASK-002-05_Pages_UI_Wiring.md`

---

## UI Alignment Notes

- Page List UI: `/admin/pages` → `GET /pages`
- Page Create Drawer: `POST /pages`
- Page Editor: `GET /pages/:id` + `PATCH /pages/:id`
- Preview action: `POST /pages/:id/preview`
- Publish/unpublish: `POST /pages/:id/publish` / `POST /pages/:id/unpublish`
- Revisions list/restore: `GET /pages/:id/revisions` / `POST /pages/:id/revisions/:revisionId/restore`

Details, mocks, and validation rules are defined in the subtasks.

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-pages-revisions-preview.md`
