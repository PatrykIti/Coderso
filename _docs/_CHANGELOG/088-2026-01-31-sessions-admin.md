# 088 - Admin sessions API and UI wiring

**Date:** 2026-01-31  
**Version:** 0.1.0  
**Tasks:** TASK-033, TASK-033-01, TASK-033-02

## Key Changes

### Admin/Security
- Added session admin service to list active sessions and revoke current/other sessions.

### API
- Added `/sessions` endpoints with permission checks, validation, and audit logging.

### Admin/UI
- Wired Security Sessions screen to live API with revoke actions and error/loading states.

### Tests
- Added service, route wiring, and admin client tests; updated sessions UI snapshot test.

### Docs
- Documented sessions endpoints in `_docs/CMS_API.md`.
