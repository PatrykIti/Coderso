# 096 - API keys service

**Date:** 2026-01-31  
**Version:** 0.1.0  
**Tasks:** TASK-039, TASK-039-01

## Key Changes

### Core/DB
- Added `api_keys` table with prefix indexes for lookup.

### Core/Services
- Implemented API key creation, rotation, revocation, and usage tracking.
- Added bearer token parsing helper for API key auth.

### Tests
- Added API key service and auth unit tests.

### Docs
- Documented API key hashing model in security spec.
