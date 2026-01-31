# 091 - IP allowlist core and UI wiring

**Date:** 2026-01-31  
**Version:** 0.1.0  
**Tasks:** TASK-036, TASK-036-01, TASK-036-02, TASK-036-03

## Key Changes

### Core/Security
- Added `ip_allowlist` table with CIDR storage and validation helpers.
- Added allowlist enforcement for `/admin/*` and `/admin/api/*`.

### API
- Added `/ip-allowlist` endpoints with validation and audit logging.

### Admin/UI
- Wired IP allowlist UI to live API with add/remove actions and loading/error states.

### Tests
- Added CIDR parsing/service tests, middleware tests, route wiring, and admin client tests.

### Docs
- Documented allowlist behavior in `_docs/SECURITY_SPEC.md` and `_docs/CMS_API.md`.
