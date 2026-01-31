# TASK-043: Content Entry Metadata Integration (Index)
# FileName: TASK-043_Content_Entry_Metadata_Integration.md

**Priority:** High  
**Category:** Content / Admin UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-003-03, TASK-003-04, TASK-003-06, TASK-027-01, TASK-027-02, TASK-027-03, TASK-027-04  
**Status:** To Do

---

## Overview

Index task for full Entry metadata integration (status, scheduling, SEO, tags, author).
Implementation is split into subtasks:

- TASK-043-01: DB + Schema
- TASK-043-02: Services
- TASK-043-03: API + Validation
- TASK-043-04: Admin UI Wiring

---

## Notes

- SEO data must be stored in `seo_documents` (entries are `targetType="entry"`).
- Tags are stored on `content_entries` (not inside `data`).
- Scheduling is queued-only in v1 (no background publish).

---

## Documentation Updates Required

- `_docs/CMS_API.md` (new endpoint + entry metadata fields).
- `_docs/DATA_MODEL.md` (content_entries new columns).
- `_docs/ARCHITECTURE.md` (entry SEO -> `seo_documents`).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-entry-metadata-integration.md`

