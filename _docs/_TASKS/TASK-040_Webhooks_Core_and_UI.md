# TASK-040: Webhooks Core and UI
# FileName: TASK-040_Webhooks_Core_and_UI.md

**Priority:** Medium  
**Category:** Settings/Integrations  
**Estimated Effort:** Large  
**Dependencies:** TASK-001, TASK-004, TASK-006-19, TASK-020  
**Status:** Done (2026-01-31)

---

## Overview

Implement webhook storage, delivery, and wiring for the Webhooks UI.

## Goals

- CRUD webhooks with event filters and secrets.
- Deliver events with retry/backoff.
- Display delivery status in UI.

## Sub-Tasks (detailed task files)

- `TASK-040-01_Webhooks_DB_and_Service.md`
- `TASK-040-02_Webhooks_Delivery_and_Retry.md`
- `TASK-040-03_Webhooks_API_Routes.md`
- `TASK-040-04_Webhooks_UI_Wiring.md`

## Documentation Updates Required

- `_docs/CMS_API.md` (webhooks endpoints)
- `_docs/SECURITY_SPEC.md` (signing)

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-webhooks-core.md`
