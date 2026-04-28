# 100 - Webhooks delivery

**Date:** 2026-01-31  
**Version:** 0.1.0  
**Tasks:** TASK-040-02

## Key Changes

### Core/Services
- Added webhook delivery pipeline with retries and backoff.
- Implemented HMAC signing helper for outbound webhook requests.
- Added lightweight delivery queue helper.

### Tests
- Added delivery success/failure unit coverage.

### Docs
- Documented webhook signing headers in security spec.
