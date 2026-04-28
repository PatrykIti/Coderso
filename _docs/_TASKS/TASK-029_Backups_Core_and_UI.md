# TASK-029: Backups Core and UI
# FileName: TASK-029_Backups_Core_and_UI.md

**Priority:** Medium  
**Category:** CMS/Backups  
**Estimated Effort:** Large  
**Dependencies:** TASK-001, TASK-004, TASK-020, TASK-006-21  
**Status:** Done (2026-01-30)

---

## Overview

Implement backup management endpoints and wire the Backups UI.

## Goals

- Track backups in DB (manual + scheduled).
- Provide create/restore/download endpoints (v1 = metadata + placeholder artifact path).
- Wire UI to real data.

## Sub-Tasks (detailed task files)

- `TASK-029-01_Backups_DB_and_Service.md`
- `TASK-029-02_Backups_API_Routes.md`
- `TASK-029-03_Backups_UI_Wiring.md`

## Documentation Updates Required

- `_docs/CMS_API.md` add backup endpoints.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-backups-core.md`
