# TASK-040-01: Webhooks DB and Service
# FileName: TASK-040-01_Webhooks_DB_and_Service.md

**Priority:** Medium  
**Category:** Settings/Integrations  
**Estimated Effort:** Medium  
**Dependencies:** TASK-001  
**Status:** To Do

---

## Overview

Add DB schema and services for managing webhooks.

## Schema Design

Tables:
- `webhooks` (id, name, url, events[], secret, enabled, created_at)
- `webhook_deliveries` (id, webhook_id, event, status, response_code, attempts, last_error, created_at)

## Service API

Create `core/services/webhooks/webhooksService.ts`:
- `listWebhooks()`
- `createWebhook(input)`
- `updateWebhook(id, input)`
- `deleteWebhook(id)`
- `listDeliveries(webhookId)`

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/db/schema.ts` | tables + indexes |
| `core/services/webhooks/webhooksService.ts` | CRUD + delivery log |
| `tests/unit/webhooks/webhooksService.test.ts` | basic CRUD |

## Notes

- Secret should be stored encrypted if we add encryption helper in settings.

## Documentation Updates Required

- `_docs/CMS_API.md` webhooks schema.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-webhooks-schema.md`
