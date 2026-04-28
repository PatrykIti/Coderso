# 090 - Access logs core and UI wiring

**Date:** 2026-01-31  
**Version:** 0.1.0  
**Tasks:** TASK-035, TASK-035-01, TASK-035-02, TASK-035-03

## Key Changes

### Core/Security
- Added `access_logs` table plus service helpers to record and list access log entries.
- Added request pipeline logging to capture method/path/status/user/ip/userAgent/duration.

### API
- Added `/access-logs` endpoint with basic filters and validation.

### Admin/UI
- Wired Access Logs UI to live API data with loading/error states and details drawer mapping.

### Tests
- Added access log service coverage, route wiring test, and admin client tests.

### Docs
- Documented access logs in `_docs/CMS_API.md` and `_docs/SECURITY_SPEC.md`.
