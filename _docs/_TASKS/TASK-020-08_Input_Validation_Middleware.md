# TASK-020-08: Input Validation Middleware (AJV)
# FileName: TASK-020-08_Input_Validation_Middleware.md

**Priority:** Medium
**Category:** Core/Security
**Estimated Effort:** Medium
**Dependencies:** TASK-020-01
**Status:** Done (2026-01-30)

---

## Overview

Implement a shared AJV-based validator used by all routes, enforcing strict schema rules and consistent error responses.

## Goals

- Replace the no-op `validate()` stub in `httpServer.ts`.
- Enforce `additionalProperties: false` to reject unknown fields.
- Normalize errors to `validation_error`.

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/server/validation/schemaValidator.ts` | AJV instance + `validate` helper |
| `core/server/httpServer.ts` | Use real validator in `registerAllRoutes` |
| `core/server/errorHandler.ts` | Ensure `validation_error` maps to 400 |

### Validator behavior

- `allErrors: true`, `strict: true`.
- `coerceTypes: false` (explicit input only).
- Throw `ApiError("validation_error", 400)` with error details.

### Usage

```ts
import { validate } from "./validation/schemaValidator";

registerAllRoutes(router, {
  requireAuth: requireAuth(),
  requirePermission,
  validate,
});
```

## Testing Requirements

- [ ] `tests/unit/validation/schemaValidator.test.ts` rejects unknown fields.
- [ ] `tests/unit/validation/schemaValidator.test.ts` accepts valid payload.
- [ ] `tests/integration/routes/contentTypes.test.ts` returns 400 for invalid payload.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` add validation policy.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-input-validation.md`
