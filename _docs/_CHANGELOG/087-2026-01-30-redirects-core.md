# 087 - Redirects core and UI wiring

**Date:** 2026-01-30  
**Version:** 0.1.0  
**Tasks:** TASK-031, TASK-031-01, TASK-031-02, TASK-031-03

## Key Changes

### CMS/SEO
- Added redirects table and CRUD service with status code validation (301/302/307/308).

### API
- Added `/redirects` endpoints with schema validation and permissions.

### Admin/UI
- Wired Redirects UI to live API with create/edit/enable flows.

### Tests
- Added redirects service coverage, API wiring, and admin client/UI tests.

### Docs
- Documented redirect endpoints in `_docs/CMS_API.md` and referenced redirects support in `_docs/ARCHITECTURE.md`.
