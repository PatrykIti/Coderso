# TASK-004-04: Auth Middleware
# FileName: TASK-004-04_Auth_middleware.md

**Priority:** High
**Category:** Core/Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-004-03
**Status:** Done (2026-01-27)

---

## Overview

Middleware auth zakonczony. Odpowiada za podpiecie usera do kontekstu
requestu oraz enforce login.

---

## Implementation Summary

Zaimplementowane w:
- `core/server/middleware/auth.ts`
  - `attachUserFromSession(ctx)`
  - `requireAuth()`
- `core/services/auth/userService.ts`
  - `getUserById`

Zasady:
- Odczyt cookie `SESSION_COOKIE_NAME`.
- Sesja musi byc aktywna i nie wygasla.
- Uzytkownik musi miec status `active`.

---

## Tests

- `tests/unit/auth/sessionService.test.ts`
- `tests/unit/auth/rbac.test.ts` (posrednio przez attach)

---

## Documentation Updates

- `_docs/AUTH_SPEC.md`
- `_docs/SECURITY_SPEC.md`

---

## Changelog Entry

- `_docs/_CHANGELOG/004-2026-01-25-auth-rbac-admin-api.md`
