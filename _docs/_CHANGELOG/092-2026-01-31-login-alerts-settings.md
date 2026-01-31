# 092 - Login alerts settings

**Date:** 2026-01-31  
**Version:** 0.1.0  
**Tasks:** TASK-037, TASK-037-01

## Key Changes

### Core/Security
- Added `loginAlerts` to security settings with runtime defaults and validation.
- Added login alert detection on `auth.login` using last session fingerprint.
- Logged `auth.login.alert` audit events for new device/location.

### Tests
- Extended security settings tests and added login alert detection unit tests.

### Docs
- Documented login alert behavior in `_docs/SECURITY_SPEC.md` and `_docs/CMS_API.md`.
