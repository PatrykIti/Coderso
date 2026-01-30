# 086 - Import / export core and UI wiring

**Date:** 2026-01-30  
**Version:** 0.1.0  
**Tasks:** TASK-030, TASK-030-01, TASK-030-02, TASK-030-03

## Key Changes

### CMS/Tools
- Added import/export bundle service for settings, menus, themes, and admin themes.
- Added bundle validation and preview summary generation.

### API
- Added `/tools/export`, `/tools/import`, and `/tools/import/preview` endpoints.

### Admin/UI
- Wired Import & Export UI to live endpoints with preview and apply actions.

### Tests
- Added import/export client tests, preview summary test, and routes wiring test.

### Docs
- Documented import/export endpoints and bundle format in `_docs/CMS_API.md`.
