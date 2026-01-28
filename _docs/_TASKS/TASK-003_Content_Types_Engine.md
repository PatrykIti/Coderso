# TASK-003: Content Types Engine (Index)
# FileName: TASK-003_Content_Types_Engine.md

**Priority:** High  
**Category:** CMS/Content  
**Estimated Effort:** Large  
**Dependencies:** TASK-001, TASK-002  
**Status:** To Do  

---

## Overview

Content Types enable dynamic collections (blog posts, FAQ, staff, announcements, etc.) without DB migrations for each new type. This task is split into subtasks covering schema, validation, services, API, preview, and UI wiring.

## Implementation Order

1. TASK-003-01 - Content DB Schema
2. TASK-003-02 - Content Schema Validation
3. TASK-003-03 - Content Services and Revisions
4. TASK-003-04 - Content Admin API
5. TASK-003-05 - Content Preview Tokens
6. TASK-003-06 - Content UI Wiring (Admin)

## Sub-Tasks

1. **TASK-003-01** - Content DB Schema  
   File: `_docs/_TASKS/TASK-003-01_Content_DB_Schema.md`

2. **TASK-003-02** - Content Schema Validation  
   File: `_docs/_TASKS/TASK-003-02_Content_Schema_Validation.md`

3. **TASK-003-03** - Content Services and Revisions  
   File: `_docs/_TASKS/TASK-003-03_Content_Services_and_Revisions.md`

4. **TASK-003-04** - Content Admin API  
   File: `_docs/_TASKS/TASK-003-04_Content_Admin_API.md`

5. **TASK-003-05** - Content Preview Tokens  
   File: `_docs/_TASKS/TASK-003-05_Content_Preview_Tokens.md`

6. **TASK-003-06** - Content UI Wiring (Admin)  
   File: `_docs/_TASKS/TASK-003-06_Content_UI_Wiring.md`

## Testing Requirements

- Each subtask contains concrete unit/integration tests. Execute full `bun test` after all subtasks.

## Documentation Updates Required

- `_docs/CMS_SPEC.md`
- `_docs/CONTENT_TYPES_SPEC.md`
- `_docs/CMS_API.md`
- `_docs/DATA_MODEL.md`
- `_docs/PREVIEW_SPEC.md` (if preview behavior changes)

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-content-types-engine.md`
