# 099 - Webhooks schema and service

**Date:** 2026-01-31  
**Version:** 0.1.0  
**Tasks:** TASK-040, TASK-040-01

## Key Changes

### Core/DB
- Added `webhooks` and `webhook_deliveries` tables with indexes.

### Core/Services
- Implemented webhook CRUD and delivery log helpers.

### Tests
- Added webhook service CRUD tests.

### Docs
- Documented webhook payloads and schema in API reference.
