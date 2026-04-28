# TASK-042-01: Integrations Service and Registry
# FileName: TASK-042-01_Integrations_Service_and_Registry.md

**Priority:** Medium  
**Category:** Settings/Integrations  
**Estimated Effort:** Medium  
**Dependencies:** TASK-007-01  
**Status:** Done

---

## Overview

Create integrations registry and persist configs.

## Service API

Create `core/services/integrations/integrationsService.ts`:
- `listIntegrations()`
- `getIntegration(id)`
- `updateIntegration(id, config)`
- `requestIntegration(name, notes)`

Create `core/services/integrations/registry.ts`:
- static list of supported integrations (id, name, scopes)

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/db/schema.ts` | `integrations` + `integration_requests` |
| `core/services/integrations/integrationsService.ts` | CRUD + request |
| `core/services/integrations/registry.ts` | catalog |
| `tests/unit/integrations/integrationsService.test.ts` | CRUD + request |

## Notes

- Config values with secrets should be encrypted using settings helper.

## Documentation Updates Required

- `_docs/CMS_API.md` integration schema.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-integrations-service.md`
