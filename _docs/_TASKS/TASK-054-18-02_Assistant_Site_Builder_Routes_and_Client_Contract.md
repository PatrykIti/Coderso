# TASK-054-18-02: Assistant Site Builder Routes and Client Contract
# FileName: TASK-054-18-02_Assistant_Site_Builder_Routes_and_Client_Contract.md

**Priority:** High  
**Category:** API/Client  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-18-01  
**Status:** Done (2026-02-20)

---

## Overview
Wystawic internal endpointy assistant site builder i client SDK dla admin UI.

## Security Contract
- Visibility: `internal` (`/admin/api/assistant/site-builder/*`).
- RBAC:
  - `solution-kits:read`: `plan`, `validate`,
  - `solution-kits:write`: `execute`.
- CSRF: wymagane dla POST.
- Rate-limit:
  - `admin_read` (`plan`, `validate`),
  - `admin_write` (`execute`).

## Scope
1. Dodać nowe endpointy:
   - `POST /assistant/site-builder/plan`,
   - `POST /assistant/site-builder/execute`,
   - `POST /assistant/site-builder/validate`.
2. Rozszerzyć `assistantSchemas` o payload i response guards.
3. Rozszerzyć `assistantClient` o typed requests/responses.

## Files
- `core/server/routes/assistantRoutes.ts`
- `core/server/validation/assistantSchemas.ts`
- `core/admin/services/assistantClient.ts`
- `tests/integration/routes/assistant.test.ts`
- `tests/unit/admin/assistantClient.test.ts`

## Pseudocode
```ts
router.post("/assistant/site-builder/plan", requirePermission("solution-kits:read"), ...)
router.post("/assistant/site-builder/execute", requirePermission("solution-kits:write"), ...)
router.post("/assistant/site-builder/validate", requirePermission("solution-kits:read"), ...)
```

## Testing Requirements
- Route tests: endpoint wiring + permission mapping + validation calls.
- Client tests: correct endpoint paths/methods/CSRF behavior.

## Documentation Updates Required
- `_docs/CMS_API.md`

## Completion Notes (2026-02-20)
- Added internal assistant endpoints:
  - `POST /assistant/site-builder/plan`
  - `POST /assistant/site-builder/execute`
  - `POST /assistant/site-builder/validate`
- Added request schemas in `core/server/validation/assistantSchemas.ts`.
- Extended `core/admin/services/assistantClient.ts` with typed site-builder API client methods.
- Updated server rate-limit mapping so site-builder routes use `admin_read/admin_write` buckets.
- Added route/client tests:
  - `tests/integration/routes/assistant.test.ts`
  - `tests/unit/admin/assistantClient.test.ts`
