# 081 - Session limits in security settings

**Date:** 2026-01-30  
**Version:** 0.1.0  
**Tasks:** TASK-020-10

## Key Changes

### Core/Auth
- Session policy now pulls TTL and concurrency limits from security settings.
- Enforced max sessions per user and optional single-session mode.
- Login cookies use the configured TTL value.

### Admin/UI
- Added Session Limits card in Security Settings (TTL, max per user, single session).

### Tests
- Added session limit coverage in auth session service tests.
- Extended security settings tests for session defaults and validation.

### Docs
- Updated `_docs/SECURITY_SPEC.md` and `_docs/CMS_API.md` with session settings.
