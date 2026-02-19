# TASK-054-13-03: Solution Kits Internal API and RBAC
# FileName: TASK-054-13-03_Solution_Kits_Internal_API_and_RBAC.md

**Priority:** High  
**Category:** API/Security  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-13-01, TASK-054-13-02  
**Status:** To Do

---

## Overview
Dostarczyć internal API do listowania kitów, planowania, apply i rollback z pełnym RBAC i stabilnym mapowaniem błędów domenowych.

## Security Contract
- **Visibility:** `internal` (`/admin/api/solution-kits/*`)
- **Auth path:** admin session + RBAC
- **Permissions:** `solution-kits:read`, `solution-kits:write`
- **Rate-limit bucket:** `admin_read` / `admin_write`
- **Nonce/HMAC/reCAPTCHA:** N/A (internal only)
- **Internal mode via API key:** opcjonalnie przez scope `solution-kits.read` / `solution-kits.write` (jeśli aktywne API keys)

## Endpoints
- `GET /solution-kits`
- `GET /solution-kits/:id`
- `POST /solution-kits/plan`
- `POST /solution-kits/:id/apply`
- `POST /solution-kits/:id/rollback`
- `GET /solution-kits/runs`
- `GET /solution-kits/runs/:id`

## Files
- `core/server/routes/solutionKitsRoutes.ts` (new)
- `core/server/routes/index.ts` (register)
- `core/server/validation/solutionKitSchemas.ts` (extend)
- `core/services/admin/permissionsCatalog.ts` (extend)
- `tests/integration/routes/solutionKitsRoutes.test.ts` (new)

## Pseudocode
```ts
router.post("/solution-kits/:id/apply", requirePermission("solution-kits:write"), async (ctx) => {
  validate(solutionKitApplySchema, ctx.body ?? {});
  return applySolutionKit({ kitId: ctx.params.id, ...ctx.body });
});
```

## Testing Requirements
- Integracja rejestracji route + permissions map.
- Mapowanie błędów (`solution_kit_not_found`, `solution_kit_apply_conflict`, ...).
- Walidacja payloadów `plan`, `apply`, `rollback`.

## Documentation Updates Required
- `_docs/CMS_API.md` (pełny kontrakt endpointów)

