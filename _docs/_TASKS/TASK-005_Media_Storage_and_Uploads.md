# TASK-005: Media Storage and Uploads (Index)
# FileName: TASK-005_Media_Storage_and_Uploads.md

**Priority:** Medium  
**Category:** CMS/Media  
**Estimated Effort:** Medium  
**Dependencies:** TASK-004, TASK-012  
**Status:** Done (2026-01-28)  

---

## Overview

Media storage pipeline with local storage by default and optional S3/Azure adapters. Includes upload validation, metadata persistence, API routes, and admin UI wiring.

## Implementation Order

1. TASK-005-01 – Media DB Schema
2. TASK-005-02 – Storage Adapter Interface
3. TASK-005-03 – Local Storage Adapter
4. TASK-005-04 – S3 Storage Adapter
5. TASK-005-05 – Azure Storage Adapter
6. TASK-005-06 – Media Service + Validation
7. TASK-005-07 – Media API Routes
8. TASK-005-08 – Media UI Wiring (Admin)

## Sub-Tasks

1. **TASK-005-01** – Media DB Schema  
   File: `_docs/_TASKS/TASK-005-01_Media_DB_Schema.md`

2. **TASK-005-02** – Storage Adapter Interface  
   File: `_docs/_TASKS/TASK-005-02_Storage_Adapter_Interface.md`

3. **TASK-005-03** – Local Storage Adapter  
   File: `_docs/_TASKS/TASK-005-03_Local_Storage_Adapter.md`

4. **TASK-005-04** – S3 Storage Adapter  
   File: `_docs/_TASKS/TASK-005-04_S3_Storage_Adapter.md`

5. **TASK-005-05** – Azure Storage Adapter  
   File: `_docs/_TASKS/TASK-005-05_Azure_Storage_Adapter.md`

6. **TASK-005-06** – Media Service + Validation  
   File: `_docs/_TASKS/TASK-005-06_Media_Service_and_Validation.md`

7. **TASK-005-07** – Media API Routes  
   File: `_docs/_TASKS/TASK-005-07_Media_API_Routes.md`

8. **TASK-005-08** – Media UI Wiring (Admin)  
   File: `_docs/_TASKS/TASK-005-08_Media_UI_Wiring.md`

## Testing Requirements

Run `bun test` after all subtasks; each subtask specifies unit/integration tests.

## Documentation Updates Required

- `_docs/MEDIA_SPEC.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/DATA_MODEL.md`

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-media-storage-and-uploads.md`
