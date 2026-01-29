# TASK-007-02: Settings Admin API and Validation
# FileName: TASK-007-02_Settings_Admin_API_and_Validation.md

**Priority:** Medium  
**Category:** CMS/Settings  
**Estimated Effort:** Medium  
**Dependencies:** TASK-007-01, TASK-004-05  
**Status:** Done (2026-01-29)  

---

## Overview

Admin API dla ustawien (GET/PATCH) oraz walidacja payloadow. Endpointy
korzystaja z RBAC (`settings:read`, `settings:write`) i loguja audit.

---

## Architecture

```
core/server/routes/settingsRoutes.ts
core/server/validation/settingsSchemas.ts
core/services/settings/settingsService.ts
core/services/theme/tokenService.ts
core/services/audit/auditService.ts
tests/integration/routes/settings.test.ts
```

---

## Endpoints

- `GET /settings` → merged defaults + overrides
- `GET /settings/:key` → pojedyncze ustawienie
- `PATCH /settings/:key` → update pojedynczego klucza
- `PATCH /settings` → bulk update (mapa kluczy)

**Notes:**
- `GET /settings` dodatkowo zwraca `design.tokens` po mergu (tokenService).
- `GET /settings/:key` obsługuje `design.tokens` (resolved tokens).
- `PATCH` loguje audit (`settings.update`).

---

## Validation rules

Plik: `core/server/validation/settingsSchemas.ts`

```ts
export const settingsUpdateSchema = {
  type: "object",
  required: ["value"],
  properties: { value: {} },
  additionalProperties: false,
};

export const settingsBulkSchema = {
  type: "object",
  minProperties: 1,
  additionalProperties: true,
};
```

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/server/routes/settingsRoutes.ts` | add routes | RBAC + audit |
| `core/server/validation/settingsSchemas.ts` | add schemas | PATCH payloads |
| `tests/integration/routes/settings.test.ts` | wiring tests | verify endpoints |

---

## Testing Requirements

- `tests/integration/routes/settings.test.ts` (routes wired)
- `tests/unit/settings/settingsService.test.ts` (reject invalid key/value)

---

## Documentation Updates Required

- `_docs/CMS_API.md` (settings endpoints)
- `_docs/SECURITY_SPEC.md` (RBAC for settings)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-settings-and-design-tokens.md`
