# TASK-004-06: Auth Routes and Base API Layer
# FileName: TASK-004-06_Auth_routes_and_base_API_layer.md

**Priority:** High
**Category:** Core/Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-004-03, TASK-004-04, TASK-004-05
**Status:** In Progress (2026-01-27)

---

## Overview

Podstawowa warstwa admin API + login/logout/me endpoints. Czesc
zaimplementowana, pozostale elementy sa zalezne od TASK-004-01 i TASK-004-02.

---

## Current State (already implemented)

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

Zaimplementowane w:
- `core/server/routes/authRoutes.ts`
- `core/server/errorHandler.ts`
- `core/server/validation/authSchemas.ts`

**Behavior (obecnie):**
- `POST /auth/login` sprawdza haslo i status `active`.\n
- Ustawia cookie `SESSION_COOKIE_NAME`.\n
- Loguje audit `auth.login`.\n
- `GET /auth/me` zwraca `{ user }`.\n

---

## Remaining Work

- Rejestracja routow w `core/server/routes/index.ts` (z TASK-004-01).
- Podpiecie routera do HTTP servera (TASK-004-01).
- Dodanie `/auth/csrf` i reset/otp (TASK-004-02).
- Ujednolicenie error responses w HTTP handlerze.

---

## Implementation Checklist

| File | What to Add / Change |
| --- | --- |
| `core/server/routes/authRoutes.ts` | upewnic sie, ze login/logout/me zwracaja `ApiError` na bledy |
| `core/server/errorHandler.ts` | status mapping + error shape |
| `core/server/routes/index.ts` | rejestracja `registerAuthRoutes` |
| `core/server/validation/authSchemas.ts` | login schema + errors |

**Expected responses:**\n
- `POST /auth/login` success: `{ user, session: { expiresAt } }`\n
- error: `{ error: { code, message } }`\n

**Login validation:**\n
- email required, password min length 8.\n
- errors z `validate()` powinny mapowac na `validation_error`.\n

---

## Testing Requirements

- [ ] `tests/unit/auth/authRoutes.test.ts` (login/logout/me)
- [ ] `tests/integration/routes/auth.test.ts` (wymaga HTTP servera z TASK-004-01)

---

## Documentation Updates Required

- `_docs/CMS_API.md` (auth endpointy)
- `_docs/AUTH_SPEC.md`

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-auth-routes-base-api.md`
- Notes: login/logout/me + base API layer.
